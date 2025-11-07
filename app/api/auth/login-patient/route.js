import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/mongodb';
import Patient from '../../../../models/Patient';
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
    
    // Find patient by email
    const patient = await Patient.findOne({ email: email.toLowerCase() });
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Check if account is active
    if (!patient.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, patient.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Update last login
    patient.lastLogin = new Date();
    await patient.save();
    
    // Create JWT token
    const token = jwt.sign(
      { 
        userId: patient._id, 
        email: patient.email, 
        role: 'patient' 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Return success response (don't include password)
    const patientResponse = {
      id: patient._id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      location: patient.location,
      language: patient.language,
      isPhoneVerified: patient.isPhoneVerified,
      isEmailVerified: patient.isEmailVerified,
      isActive: patient.isActive,
      lastLogin: patient.lastLogin
    };
    
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: patient._id,
        email: patient.email,
        firstName: patient.firstName,
        lastName: patient.lastName,
        role: 'patient',
        avatar: patient.avatar || '/icons/user-placeholder.png'
      },
      profile: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        location: patient.location,
        language: patient.language,
        isPhoneVerified: patient.isPhoneVerified,
        isEmailVerified: patient.isEmailVerified,
        emergencyContact: patient.emergencyContact,
        medicalHistory: patient.medicalHistory,
        allergies: patient.allergies,
        bloodGroup: patient.bloodGroup,
        insurance: patient.insurance,
        avatar: patient.avatar || '/icons/user-placeholder.png',
        avatarPublicId: patient.avatarPublicId
      }
    });
    
  } catch (error) {
    console.error('Patient login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
