import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/mongodb';
import Doctor from '../../../../models/Doctor';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    await connectDB();
    
    const { email, password } = await request.json();
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find doctor by email
    const doctor = await Doctor.findOne({ email: email.toLowerCase() });
    
    if (!doctor) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Check if account is active
    if (!doctor.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, doctor.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Update last login
    doctor.lastLogin = new Date();
    await doctor.save();
    
    // Create JWT token
    const token = jwt.sign(
      { 
        userId: doctor._id, 
        email: doctor.email, 
        role: 'doctor' 
      },
      process.env.JWT_SECRET || 'doctar_jwt_secret_key_2025',
      { expiresIn: '7d' }
    );
    
    // Return success response (don't include password)
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: doctor._id,
        email: doctor.email,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        role: 'doctor',
        avatar: doctor.avatar || '/icons/user-placeholder.png'
      },
      profile: {
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        email: doctor.email,
        phone: doctor.phone,
        specialization: doctor.specialization,
        qualification: doctor.qualification,
        experience: doctor.experience,
        licenseNumber: doctor.licenseNumber,
        clinicName: doctor.clinicName,
        clinicAddress: doctor.clinicAddress,
        consultationFee: doctor.consultationFee,
        location: doctor.location,
        language: doctor.language,
        dateOfBirth: doctor.dateOfBirth,
        gender: doctor.gender,
        bio: doctor.bio,
        isPhoneVerified: doctor.isPhoneVerified,
        isEmailVerified: doctor.isEmailVerified,
        avatar: doctor.avatar || '/icons/user-placeholder.png',
        avatarPublicId: doctor.avatarPublicId
      }
    });
    
  } catch (error) {
    console.error('Doctor login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}

