import { NextResponse } from 'next/server';
import  connectDB  from '../../../../lib/mongodb';
import Patient from '../../../../models/Patient';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail } from '../../../services/emailService';

export async function POST(request) {
  try {
    // Try to connect to database
    try {
      await connectDB();
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      // For development, continue without database
      if (process.env.NODE_ENV === 'development') {
        console.log('Continuing in development mode without database...');
      } else {
        throw dbError;
      }
    }
    
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      dateOfBirth,
      gender,
      location,
      language,
      isPhoneVerified,
      isEmailVerified
    } = await request.json();
    
    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password || !dateOfBirth || !gender || !location) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    let existingPatient = null;
    try {
      existingPatient = await Patient.findOne({
        $or: [{ email }, { phone }]
      });
    } catch (dbError) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Skipping database check in development mode');
      } else {
        throw dbError;
      }
    }
    
    if (existingPatient) {
      return NextResponse.json(
        { error: 'Patient with this email or phone already exists' },
        { status: 409 }
      );
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    let savedPatient;
    
    try {
      // Create new patient
      const patient = new Patient({
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        dateOfBirth: new Date(dateOfBirth),
        gender: gender.toLowerCase(),
        location,
        language,
        isPhoneVerified: isPhoneVerified || false,
        isEmailVerified: isEmailVerified || false,
        isActive: true,
        preferences: {
          notifications: true,
          emailUpdates: true,
          smsUpdates: false,
          pushNotifications: true,
          marketingEmails: false
        }
      });
      
      // Save to database
      savedPatient = await patient.save();
    } catch (dbError) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Database save failed, creating mock patient for development');
        // Create mock patient for development
        savedPatient = {
          _id: 'mock-patient-id',
          firstName,
          lastName,
          email,
          phone,
          dateOfBirth: new Date(dateOfBirth),
          gender: gender.toLowerCase(),
          location,
          language,
          isPhoneVerified: isPhoneVerified || false,
          isEmailVerified: isEmailVerified || false,
          isActive: true,
          createdAt: new Date()
        };
      } else {
        throw dbError;
      }
    }
    
    // Send welcome email
    try {
      await sendWelcomeEmail(email, firstName, 'patient');
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
      // Don't fail registration if email fails
    }
    
    // Return success response (don't include password)
    const patientResponse = {
      id: savedPatient._id,
      firstName: savedPatient.firstName,
      lastName: savedPatient.lastName,
      email: savedPatient.email,
      phone: savedPatient.phone,
      dateOfBirth: savedPatient.dateOfBirth,
      gender: savedPatient.gender,
      location: savedPatient.location,
      language: savedPatient.language,
      isPhoneVerified: savedPatient.isPhoneVerified,
      isEmailVerified: savedPatient.isEmailVerified,
      isActive: savedPatient.isActive,
      createdAt: savedPatient.createdAt
    };
    
    // Create JWT token
    const token = jwt.sign(
      { 
        userId: savedPatient._id, 
        email: savedPatient.email, 
        role: 'patient' 
      },
      process.env.JWT_SECRET || 'doctar_jwt_secret_key_2025',
      { expiresIn: '7d' }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Patient registered successfully',
      token,
      patient: patientResponse
    }, { status: 201 });
    
  } catch (error) {
    console.error('Patient registration error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Patient with this email or phone already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to register patient' },
      { status: 500 }
    );
  }
}
