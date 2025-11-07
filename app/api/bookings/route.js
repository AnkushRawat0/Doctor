import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Booking from '@/models/bookingModel';
import Doctor from '@/models/Doctor';
import Patient from '@/models/Patient';
import jwt from 'jsonwebtoken';
import { sendBookingConfirmationToPatient, sendNewBookingNotificationToDoctor, sendBookingRequestEmailToDoctor, sendBookingRequestEmailToPatient, sendBookingConfirmationToDoctor } from '@/app/services/emailService';

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'doctar_jwt_secret_key_2025');
  } catch {
    return null;
  }
};

export async function POST(request) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'patient') {
      return NextResponse.json({ error: 'Only patients can book' }, { status: 403 });
    }

    const { doctorId, date, time, bookingType = 'walk-in', visitType, notes, bookingFor = 'myself', patientDetails, homeVisitAddress } = await request.json();
    if (!doctorId || !date || !time || !visitType) {
      return NextResponse.json({ error: 'doctorId, date, time and visitType are required' }, { status: 400 });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

    const patient = await Patient.findById(decoded.userId);
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

    // Construct slotStart/slotEnd in local timezone (as per instruction: timezone remains the same)
    // date is YYYY-MM-DD, time is like '9:15 AM'
    const to24h = (t) => {
      const [tt, md] = t.split(' ');
      let [h, m] = tt.split(':');
      if (h === '12') h = '00';
      if ((md || '').toUpperCase() === 'PM') h = String(parseInt(h, 10) + 12);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    const [yyyy, mm, dd] = date.split('-').map(Number);
    const [HH, MM] = to24h(time).split(':').map(Number);
    const slotStart = new Date(yyyy, (mm - 1), dd, HH, MM, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 15);

    // Validate date within next 15 days and not in past
    const today = new Date();
    today.setHours(0,0,0,0);
    const lastBookable = new Date(today);
    lastBookable.setDate(lastBookable.getDate() + 15);
    const dayDate = new Date(slotStart);
    dayDate.setHours(0,0,0,0);
    if (dayDate < today || dayDate > lastBookable) {
      return NextResponse.json({ error: 'Bookings allowed only within next 15 days' }, { status: 400 });
    }
    if (slotStart < new Date()) {
      return NextResponse.json({ error: 'Cannot book past time' }, { status: 400 });
    }

  // Check against doctor's weekly availability for that weekday and interval
    const weekday = slotStart.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayAvail = doctor.weeklyAvailability?.[weekday];
    if (!dayAvail || !dayAvail.available || !Array.isArray(dayAvail.timeSlots) || dayAvail.timeSlots.length === 0) {
      return NextResponse.json({ error: 'Doctor not available on selected day' }, { status: 400 });
    }

    const fitsAnywhere = dayAvail.timeSlots.some(ts => {
      const s = convertTo24(ts.startTime);
      const e = convertTo24(ts.endTime);
      const slotBlockStart = new Date(slotStart); slotBlockStart.setHours(+s.split(':')[0], +s.split(':')[1], 0, 0);
      const slotBlockEnd = new Date(slotStart); slotBlockEnd.setHours(+e.split(':')[0], +e.split(':')[1], 0, 0);
      return slotStart >= slotBlockStart && slotEnd <= slotBlockEnd;
    });
    if (!fitsAnywhere) {
      return NextResponse.json({ error: 'Selected time is outside doctor schedule' }, { status: 400 });
    }

    // Home Visit validations
    if (bookingType === 'home-visit') {
      const addr = sanitizeAddress(homeVisitAddress);
      if (!addr || !addr.fullText || !addr.city) {
        return NextResponse.json({ error: 'Home visit address (at least full address and city) is required' }, { status: 400 });
      }
      // Enforce minimum requested duration marker: patient requests are always stored as 15m; the doctor will extend on accept.
    }

    // Try creating booking request (unique idx prevents race double booking)
    const docDate = new Date(slotStart); docDate.setHours(0,0,0,0);
    try {
      const booking = await Booking.create({
        doctor: doctor._id,
        patient: patient._id,
        date: docDate,
        slotStart,
        slotEnd,
        bookingType,
        visitType,
        notes: notes || '',
        bookingFor,
        guestPatient: bookingFor === 'someone-else' ? formatGuest(patientDetails) : undefined,
        notifyEmail: bookingFor === 'someone-else' ? safeGuestEmail(patientDetails) : (patient.email || ''),
        status: 'pending',
        createdBy: 'patient',
        homeVisitAddress: bookingType === 'home-visit' ? sanitizeAddress(homeVisitAddress) : undefined
      });

      // Send request emails (best-effort)
      try {
        const toEmail = booking.notifyEmail || patient.email;
        const displayName = booking.bookingFor === 'someone-else'
          ? (booking.guestPatient?.name || 'Guest')
          : `${patient.firstName} ${patient.lastName}`.trim();
        await sendBookingRequestEmailToPatient({
          to: toEmail,
          patientName: displayName,
          doctorName: `${doctor.firstName} ${doctor.lastName}`.trim(),
          clinicName: doctor.clinicName,
          clinicAddress: doctor.clinicAddress,
          date,
          time,
          bookingType,
          visitType,
          homeVisitAddress: bookingType === 'home-visit' ? (booking.homeVisitAddress?.fullText || '') : undefined
        });
      } catch (e) { console.error('Patient request email failed:', e); }

      try {
        await sendBookingRequestEmailToDoctor({
          to: doctor.email,
          patientName: booking.bookingFor === 'someone-else' ? (booking.guestPatient?.name || 'Guest') : `${patient.firstName} ${patient.lastName}`.trim(),
          patientAccountEmail: patient.email,
          guestEmail: booking.guestPatient?.email || '',
          guestPhone: booking.guestPatient?.phone || '',
          guestGender: booking.guestPatient?.gender || '',
          guestDob: booking.guestPatient?.dob ? new Date(booking.guestPatient.dob) : null,
          guestAddress: booking.guestPatient?.address || '',
          guestPostalCode: booking.guestPatient?.postalCode || '',
          guestCity: booking.guestPatient?.city || '',
          doctorName: `${doctor.firstName} ${doctor.lastName}`.trim(),
          clinicName: doctor.clinicName,
          clinicAddress: doctor.clinicAddress,
          date,
          time,
          bookingType,
          visitType,
          homeVisitAddress: bookingType === 'home-visit' ? (booking.homeVisitAddress?.fullText || '') : undefined
        });
      } catch (e) { console.error('Doctor request email failed:', e); }

      return NextResponse.json({ success: true, bookingId: booking._id }, { status: 201 });
    } catch (err) {
      if (err?.code === 11000) {
        return NextResponse.json({ error: 'This slot is already booked' }, { status: 409 });
      }
      console.error('Booking create error:', err);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }
  } catch (err) {
    console.error('Booking POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const patientId = searchParams.get('patientId');
    const date = searchParams.get('date'); // optional YYYY-MM-DD
    const status = searchParams.get('status'); // optional: pending, booked, etc.

    const filter = {};
    if (doctorId) filter.doctor = doctorId;
    if (patientId) filter.patient = patientId;
    if (status) filter.status = status;

    // If doctorId/status not provided, infer doctor from token if role=doctor (for convenience)
    if (!doctorId) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const decoded = verifyToken(authHeader.substring(7));
        if (decoded?.role === 'doctor') {
          filter.doctor = decoded.userId;
        }
      }
    }
    if (date) {
      const d = new Date(date);
      const start = new Date(d); start.setHours(0,0,0,0);
      const end = new Date(d); end.setHours(23,59,59,999);
      filter.slotStart = { $gte: start, $lte: end };
    }

    const items = await Booking.find(filter)
      .populate('doctor', 'firstName lastName clinicName clinicAddress email')
      .populate('patient', 'firstName lastName email')
      .sort({ slotStart: 1 })
      .limit(200);

    return NextResponse.json({ success: true, bookings: items }, { status: 200 });
  } catch (err) {
    console.error('Booking GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await connectDB();

    // Auth: doctor only for accepting their own bookings
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'doctor') {
      return NextResponse.json({ error: 'Only doctors can accept bookings' }, { status: 403 });
    }

  const { bookingId, action, acceptStart, acceptBlocks } = await request.json();
    if (!bookingId || !['accept', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'bookingId and valid action are required' }, { status: 400 });
    }

    const booking = await Booking.findById(bookingId).populate('doctor').populate('patient');
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (String(booking.doctor._id) !== decoded.userId) {
      return NextResponse.json({ error: 'Not authorized for this booking' }, { status: 403 });
    }

    if (action === 'accept') {
      if (booking.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending bookings can be accepted' }, { status: 400 });
      }
      // Determine accepted start/time range
      const start = acceptStart ? new Date(acceptStart) : booking.slotStart;
      let blocks = Number.isInteger(acceptBlocks) ? acceptBlocks : 1;
      if (booking.bookingType === 'home-visit') {
        // Enforce minimum 30 minutes (>= 2 blocks)
        if (!Number.isInteger(blocks) || blocks < 2) {
          return NextResponse.json({ error: 'Home visit requires at least 30 minutes (2 blocks)' }, { status: 400 });
        }
      }
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + 15 * blocks);

      // Conflict check across full accepted range
      const overlap = await Booking.findOne({
        _id: { $ne: booking._id },
        doctor: booking.doctor._id,
        status: 'booked',
        $or: [
          { slotStart: { $lt: end }, slotEnd: { $gt: start } },
        ]
      });
      if (overlap) {
        return NextResponse.json({ error: 'Selected range overlaps an existing booking' }, { status: 409 });
      }

      booking.slotStart = start;
      booking.slotEnd = end;
      booking.status = 'booked';
      await booking.save();

      // Send confirmation emails
      try {
        const toEmail = booking.notifyEmail || booking.patient.email;
        const patientName = booking.bookingFor === 'someone-else'
          ? (booking.guestPatient?.name || 'Guest')
          : `${booking.patient.firstName} ${booking.patient.lastName}`.trim();
        const dateStr = booking.slotStart.toISOString().slice(0,10);
        const timeStr = `${booking.slotStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${booking.slotEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        await sendBookingConfirmationToPatient({
          to: toEmail,
          patientName,
          doctorName: `${booking.doctor.firstName} ${booking.doctor.lastName}`.trim(),
          clinicName: booking.doctor.clinicName,
          clinicAddress: booking.doctor.clinicAddress,
          date: dateStr,
          time: timeStr,
          bookingType: booking.bookingType,
          visitType: booking.visitType,
          homeVisitAddress: booking.bookingType === 'home-visit' ? (booking.homeVisitAddress?.fullText || '') : undefined
        });
      } catch (e) {
        console.error('Patient confirmation email failed:', e);
      }

      try {
        const patientName = booking.bookingFor === 'someone-else'
          ? (booking.guestPatient?.name || 'Guest')
          : `${booking.patient.firstName} ${booking.patient.lastName}`.trim();
        const dateStr = booking.slotStart.toISOString().slice(0,10);
        const timeStr = `${booking.slotStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${booking.slotEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        await sendBookingConfirmationToDoctor({
          to: booking.doctor.email,
          patientName,
          doctorName: `${booking.doctor.firstName} ${booking.doctor.lastName}`.trim(),
          date: dateStr,
          time: timeStr,
          bookingType: booking.bookingType,
          visitType: booking.visitType,
          homeVisitAddress: booking.bookingType === 'home-visit' ? (booking.homeVisitAddress?.fullText || '') : undefined
        });
      } catch (e) {
        console.error('Doctor confirmation email failed:', e);
      }

      return NextResponse.json({ success: true, status: booking.status });
    }

    if (action === 'reject') {
      if (booking.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending bookings can be rejected' }, { status: 400 });
      }
      booking.status = 'rejected';
      await booking.save();
      return NextResponse.json({ success: true, status: booking.status });
    }

    if (action === 'cancel') {
      if (!['pending', 'booked'].includes(booking.status)) {
        return NextResponse.json({ error: 'Only pending or booked bookings can be cancelled' }, { status: 400 });
      }
      booking.status = 'cancelled';
      await booking.save();
      return NextResponse.json({ success: true, status: booking.status });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    console.error('Booking PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function convertTo24(time12h) {
  if (!time12h) return '09:00';
  const [time, mod] = time12h.split(' ');
  let [h, m] = time.split(':');
  if (h === '12') h = '00';
  if ((mod || '').toUpperCase() === 'PM') h = String(parseInt(h,10) + 12);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatGuest(details) {
  if (!details || typeof details !== 'object') return undefined;
  const { name, email, phone, gender, dob, address, postalCode, city } = details;
  const parsedDob = parseDob(dob);
  return {
    name: (name || '').trim(),
    email: (email || '').trim().toLowerCase(),
    phone: (phone || '').trim(),
    gender: (gender || '').toLowerCase(),
    dob: parsedDob || undefined,
    address: (address || '').trim(),
    postalCode: (postalCode || '').trim(),
    city: (city || '').trim(),
  };
}

function safeGuestEmail(details) {
  const e = details?.email;
  if (!e || typeof e !== 'string') return '';
  return e.trim().toLowerCase();
}

// Accepts DD/MM/YYYY or YYYY-MM-DD
function parseDob(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();
  // DD/MM/YYYY
  const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m1) {
    const [_, dd, mm, yyyy] = m1;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }
  // YYYY-MM-DD
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) {
    const [_, yyyy, mm, dd] = m2;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function sanitizeAddress(input) {
  if (!input || typeof input !== 'object') return null;
  const line1 = (input.line1 || '').trim();
  const line2 = (input.line2 || '').trim();
  const city = (input.city || '').trim();
  const postalCode = (input.postalCode || '').trim();
  const landmark = (input.landmark || '').trim();
  const fullText = (input.fullText || [line1, line2, city, postalCode].filter(Boolean).join(', ')).trim();
  return { line1, line2, city, postalCode, landmark, fullText };
}
