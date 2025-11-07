import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/mongodb';
import Doctor from '../../../../../models/Doctor';
import Booking from '../../../../../models/bookingModel';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date'); // Format: YYYY-MM-DD
  const blockPendingParam = searchParams.get('blockPending');
  const blockPending = blockPendingParam === null ? true : blockPendingParam !== 'false';
    
    if (!id) {
      return NextResponse.json(
        { error: 'Doctor ID is required' },
        { status: 400 }
      );
    }
    
    // Find doctor
    const doctor = await Doctor.findById(id).select('weeklyAvailability');
    
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }
    
    console.log('Doctor weeklyAvailability:', doctor.weeklyAvailability);
    
    // Get current date if no date specified
  const targetDate = date ? new Date(date) : new Date();
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    console.log('Target date:', targetDate);
    console.log('Day of week:', dayOfWeek);
    
    // Enforce booking window of next 15 days
    const today = new Date();
    today.setHours(0,0,0,0);
    const lastBookable = new Date(today);
    lastBookable.setDate(lastBookable.getDate() + 15);
    if (targetDate < today || targetDate > lastBookable) {
      return NextResponse.json({
        success: true,
        available: false,
        message: 'Bookings are available only for the next 15 days',
        timeSlots: [],
        weeklySchedule: getWeeklyScheduleFromDoctor(doctor.weeklyAvailability, 15)
      });
    }

    // Get doctor's availability for the specific day
    const dayAvailability = doctor.weeklyAvailability?.[dayOfWeek];
    
    console.log('Day availability:', dayAvailability);
    
    // If no weeklyAvailability is set, return default availability
    if (!doctor.weeklyAvailability) {
      console.log('No weeklyAvailability set for doctor, using defaults');
      return NextResponse.json({
        success: true,
        available: true,
        date: targetDate.toISOString().split('T')[0],
        dayOfWeek: dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1),
        timeSlots: getDefaultTimeSlots(),
        weeklySchedule: getDefaultWeeklySchedule()
      });
    }
    
    if (!dayAvailability || !dayAvailability.available) {
      return NextResponse.json({
        success: true,
        available: false,
        message: 'Doctor is not available on this day',
        timeSlots: [],
        weeklySchedule: getWeeklyScheduleFromDoctor(doctor.weeklyAvailability)
      });
    }
    
    // Preload booked slots for the target date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23,59,59,999);

    const statuses = blockPending ? ['booked', 'pending'] : ['booked'];
    const bookings = await Booking.find({
      doctor: doctor._id,
      status: { $in: statuses },
      slotStart: { $gte: startOfDay, $lte: endOfDay }
    }).select('slotStart slotEnd status');
    // Build a set of all 15-min increments that are blocked
    const bookedKeySet = new Set();
    for (const b of bookings) {
      const cur = new Date(b.slotStart);
      const end = new Date(b.slotEnd || b.slotStart);
      while (cur < end) {
        const key = `${cur.getHours().toString().padStart(2,'0')}:${cur.getMinutes().toString().padStart(2,'0')}`;
        bookedKeySet.add(key);
        cur.setMinutes(cur.getMinutes() + 15);
      }
    }

    // Generate time slots based on doctor's availability
    const generateTimeSlots = (timeSlots) => {
      const slots = [];
      
      timeSlots.forEach(slot => {
        const startTime = convertTo24Hour(slot.startTime);
        const endTime = convertTo24Hour(slot.endTime);
        
        let current = new Date(`2024-01-01 ${startTime}`);
        const end = new Date(`2024-01-01 ${endTime}`);
        
        while (current < end) {
          const timeString = current.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          
          // Check if slot is in the past (for today only)
          const isToday = targetDate.toDateString() === new Date().toDateString();
          const slotDateTime = new Date(targetDate);
          slotDateTime.setHours(current.getHours(), current.getMinutes());
          
          const isAvailable = (!isToday || slotDateTime > new Date());

          const key = `${current.getHours().toString().padStart(2,'0')}:${current.getMinutes().toString().padStart(2,'0')}`;
          const isBooked = bookedKeySet.has(key); // booked or pending blocks the slot
          
          slots.push({
            time: timeString,
            available: isAvailable && !isBooked,
            booked: isBooked
          });
          
          // Add 15 minutes to current time
          current.setMinutes(current.getMinutes() + 15);
        }
      });
      
      return slots;
    };
    
    const timeSlots = generateTimeSlots(dayAvailability.timeSlots || []);
    
    return NextResponse.json({
      success: true,
      available: true,
      date: targetDate.toISOString().split('T')[0],
      dayOfWeek: dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1),
      timeSlots,
      weeklySchedule: getWeeklyScheduleFromDoctor(doctor.weeklyAvailability, 15)
    });
    
  } catch (error) {
    console.error('Availability fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability. Please try again.' },
      { status: 500 }
    );
  }
}

// Helper function to convert 12-hour time to 24-hour time
function convertTo24Hour(input) {
  try {
    if (!input || typeof input !== 'string') {
      console.error('Invalid time format:', input);
      return '09:00';
    }
    const timeStr = input.trim();

    // If already in 24-hour HH:mm format
    const m24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (m24) {
      let [_, h, m] = m24;
      const hours = h.padStart(2, '0');
      const minutes = m.padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    // If 12-hour format with AM/PM
    const parts = timeStr.split(' ');
    if (parts.length === 2) {
      const [time, modifierRaw] = parts;
      let [hours, minutes] = time.split(':');
      if (!hours || !minutes) return '09:00';
      let mod = (modifierRaw || '').toUpperCase();
      if (hours === '12') hours = '00';
      if (mod === 'PM') hours = String(parseInt(hours, 10) + 12);
      hours = hours.toString().padStart(2, '0');
      minutes = minutes.toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    console.error('Unrecognized time format:', input);
    return '09:00';
  } catch (error) {
    console.error('Error converting time:', input, error);
    return '09:00';
  }
}

// Helper function to get default time slots
function getDefaultTimeSlots() {
  const defaultSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
    '5:00 PM', '5:30 PM'
  ];
  
  return defaultSlots.map(time => ({
    time,
    available: true,
    booked: false
  }));
}

// Helper function to get default weekly schedule
function getDefaultWeeklySchedule(days = 7) {
  const schedule = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    const isWeekend = date.getDay() === 0; // Sunday
    
    schedule.push({
      date: date.toISOString().split('T')[0],
      day: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      dayNumber: date.getDate(),
      available: !isWeekend,
      timeRange: !isWeekend ? '9:00 AM to 6:00 PM' : 'Not available'
    });
  }
  
  return schedule;
}

// Helper function to generate weekly schedule from doctor's availability
function getWeeklyScheduleFromDoctor(weeklyAvailability, days = 7) {
  const schedule = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    const day = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayAvail = weeklyAvailability?.[day];
    
    schedule.push({
      date: date.toISOString().split('T')[0],
      day: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      dayNumber: date.getDate(),
      available: dayAvail?.available || false,
      timeRange: dayAvail?.available && dayAvail.timeSlots?.length > 0 
        ? `${dayAvail.timeSlots[0].startTime} to ${dayAvail.timeSlots[dayAvail.timeSlots.length - 1].endTime}`
        : 'Not available'
    });
  }
  
  return schedule;
}
