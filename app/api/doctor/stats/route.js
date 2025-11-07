import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Booking from '@/models/bookingModel';
import Review from '@/models/Review';
import jwt from 'jsonwebtoken';

const verifyToken = (token) => {
  try { return jwt.verify(token, process.env.JWT_SECRET || 'doctar_jwt_secret_key_2025'); } catch { return null; }
};

export async function GET(request) {
  try {
    await connectDB();
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(authHeader.substring(7));
    if (!decoded || decoded.role !== 'doctor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const doctorId = decoded.userId;

    // Time ranges
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(now); endOfDay.setHours(23,59,59,999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Today appointments (booked only)
    const todayItems = await Booking.find({
      doctor: doctorId,
      status: 'booked',
      slotStart: { $gte: startOfDay, $lte: endOfDay }
    }).populate('patient', 'firstName lastName').sort({ slotStart: 1 }).limit(100);
    const appointmentsToday = todayItems.length;

    // Appointments this month (booked)
    const monthCount = await Booking.countDocuments({
      doctor: doctorId,
      status: 'booked',
      slotStart: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // Total patients (distinct patient count across all time where booked)
    const distinctPatientsAgg = await Booking.aggregate([
      { $match: { doctor: new (await import('mongoose')).default.Types.ObjectId(doctorId), status: 'booked' } },
      { $group: { _id: '$patient' } },
      { $count: 'count' }
    ]);
    const totalPatients = distinctPatientsAgg[0]?.count || 0;

    // Average rating
    const avgAgg = await Review.aggregate([
      { $match: { doctorId: new (await import('mongoose')).default.Types.ObjectId(doctorId) } },
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);
    const averageRating = avgAgg[0]?.avg ? Number(avgAgg[0].avg.toFixed(1)) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        appointmentsToday,
        monthAppointments: monthCount,
        totalPatients,
        averageRating
      },
      todayAppointments: todayItems.map(b => ({
        id: b._id,
        patientName: `${b.patient?.firstName || ''} ${b.patient?.lastName || ''}`.trim() || 'Patient',
        start: b.slotStart,
        end: b.slotEnd,
        type: b.bookingType,
        visitType: b.visitType
      }))
    });
  } catch (err) {
    console.error('Doctor stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
