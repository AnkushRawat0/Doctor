import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/mongodb';
import Doctor from '../../../../models/Doctor';
import jwt from 'jsonwebtoken';

export async function PUT(request) {
  try {
    await connectDB();
    
    const { token, updateData } = await request.json();
    
    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token is required' },
        { status: 401 }
      );
    }
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'doctar_jwt_secret_key_2025');
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Find doctor by ID from token
    const doctor = await Doctor.findById(decoded.userId);
    
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }
    
    // Update doctor data
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'specialization', 'qualification', 
      'experience', 'awards', 'pastExperiences', 'clinicName', 'clinicAddress', 
      'clinicCoordinates', 'consultationFee', 'services', 'weeklyAvailability',
      'location', 'language', 'dateOfBirth', 'gender', 
      'bio', 'avatar', 'avatarPublicId', 'gallery'
    ];
    
    // Only update allowed fields
    const updateFields = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields[field] = updateData[field];
      }
    });
    
    // Update the doctor
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      decoded.userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    // Return updated doctor data (without password)
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedDoctor._id,
        email: updatedDoctor.email,
        firstName: updatedDoctor.firstName,
        lastName: updatedDoctor.lastName,
        role: 'doctor',
        avatar: updatedDoctor.avatar || '/icons/user-placeholder.png'
      },
      profile: {
        firstName: updatedDoctor.firstName,
        lastName: updatedDoctor.lastName,
        email: updatedDoctor.email,
        phone: updatedDoctor.phone,
        specialization: updatedDoctor.specialization,
        qualification: updatedDoctor.qualification,
        experience: updatedDoctor.experience,
        awards: updatedDoctor.awards || [],
        pastExperiences: updatedDoctor.pastExperiences || [],
        clinicName: updatedDoctor.clinicName,
        clinicAddress: updatedDoctor.clinicAddress,
        clinicCoordinates: updatedDoctor.clinicCoordinates || { latitude: null, longitude: null },
        consultationFee: updatedDoctor.consultationFee,
        services: updatedDoctor.services || [],
        weeklyAvailability: updatedDoctor.weeklyAvailability || {},
        location: updatedDoctor.location,
        language: updatedDoctor.language,
        dateOfBirth: updatedDoctor.dateOfBirth,
        gender: updatedDoctor.gender,
        bio: updatedDoctor.bio,
        isPhoneVerified: updatedDoctor.isPhoneVerified,
        isEmailVerified: updatedDoctor.isEmailVerified,
        avatar: updatedDoctor.avatar || '/icons/user-placeholder.png',
        avatarPublicId: updatedDoctor.avatarPublicId,
        gallery: updatedDoctor.gallery || []
      }
    });
    
  } catch (error) {
    console.error('Doctor update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile. Please try again.' },
      { status: 500 }
    );
  }
}
