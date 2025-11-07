import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Doctor from '../../../../models/Doctor';
import jwt from 'jsonwebtoken';

// GET - Fetch single doctor by ID
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const doctor = await Doctor.findById(id);
    
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }
    
    return NextResponse.json({ doctor });
  } catch (error) {
    console.error('Error fetching doctor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update doctor profile
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const body = await request.json();
    
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    let decoded;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Check if user is updating their own profile
    console.log('Auth check - decoded.userId:', decoded.userId, 'requested id:', id);
    if (decoded.userId !== id) {
      console.log('403 Error - User ID mismatch:', { decodedUserId: decoded.userId, requestedId: id });
      return NextResponse.json({ 
        error: 'Unauthorized to update this profile',
        details: { decodedUserId: decoded.userId, requestedId: id }
      }, { status: 403 });
    }
    
    // Find the doctor
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }
    
    // Process gallery images - remove temporary IDs and let MongoDB generate new ones
    let processedGallery = doctor.gallery || [];
    if (body.gallery !== undefined) {
      processedGallery = body.gallery.map(image => ({
        url: image.url,
        publicId: image.publicId,
        caption: image.caption,
        // Remove the temporary _id, let MongoDB generate a new one
        ...(image._id && !image._id.startsWith('temp_') ? { _id: image._id } : {})
      }));
    }

    // Update doctor fields
    const updateData = {
      firstName: body.firstName !== undefined ? body.firstName : doctor.firstName,
      lastName: body.lastName !== undefined ? body.lastName : doctor.lastName,
      specialization: body.specialization !== undefined ? body.specialization : doctor.specialization,
      experience: body.experience !== undefined ? body.experience : doctor.experience,
      qualification: body.qualification !== undefined ? body.qualification : doctor.qualification,
      bio: body.bio !== undefined ? body.bio : doctor.bio,
      clinicName: body.clinicName !== undefined ? body.clinicName : doctor.clinicName,
      clinicAddress: body.clinicAddress !== undefined ? body.clinicAddress : doctor.clinicAddress,
      consultationFee: body.consultationFee !== undefined ? body.consultationFee : doctor.consultationFee,
      phone: body.phone !== undefined ? body.phone : doctor.phone,
      email: body.email !== undefined ? body.email : doctor.email,
      location: body.location !== undefined ? body.location : doctor.location,
      language: body.language !== undefined ? body.language : doctor.language,
      coordinates: body.coordinates !== undefined ? body.coordinates : doctor.coordinates,
      awards: body.awards !== undefined ? body.awards : doctor.awards,
      services: body.services !== undefined ? body.services : doctor.services,
      pastExperiences: body.pastExperiences !== undefined ? body.pastExperiences : doctor.pastExperiences,
      weeklyAvailability: body.weeklyAvailability !== undefined ? body.weeklyAvailability : doctor.weeklyAvailability,
      gallery: processedGallery,
      updatedAt: new Date(),
      avatar: body.avatar !== undefined ? body.avatar : doctor.avatar,
      avatarPublicId: body.avatarPublicId !== undefined ? body.avatarPublicId : doctor.avatarPublicId
      
    };
    
    // Update the doctor
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({ 
      message: 'Profile updated successfully',
      doctor: updatedDoctor 
    });
    
  } catch (error) {
    console.error('Error updating doctor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}