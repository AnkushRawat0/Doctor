import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Doctor from '../../../../models/Doctor';
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
      specialization,
      qualification,
      experience,
      awards,
      pastExperiences,
      clinicName,
      clinicAddress,
      clinicCoordinates,
      consultationFee,
      services,
      weeklyAvailability,
      location,
      language,
      dateOfBirth,
      gender,
      bio,
      isPhoneVerified,
      isEmailVerified,
      licenseNumber
    } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    if (!specialization || !qualification || !experience ) {
      return NextResponse.json(
        { error: 'Professional information is required' },
        { status: 400 }
      );
    }

    if (!clinicName || !clinicAddress || !consultationFee || !location) {
      return NextResponse.json(
        { error: 'Practice information is required' },
        { status: 400 }
      );
    }

    // Check if doctor already exists
    let existingDoctor;
    try {
      existingDoctor = await Doctor.findOne({
        $or: [
          { email: email.toLowerCase() },
          { phone: phone },
          { licenseNumber: licenseNumber }
        ]
      });
    } catch (dbError) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Database query failed, continuing in development mode...');
        existingDoctor = null;
      } else {
        throw dbError;
      }
    }

    if (existingDoctor) {
      return NextResponse.json(
        { error: 'Doctor with this email, phone, or license number already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create doctor data
    const doctorData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword,
      specialization: specialization.trim(),
      qualification: qualification.trim(),
      experience: parseInt(experience),
      awards: awards || [],
      pastExperiences: pastExperiences || [],
      clinicName: clinicName.trim(),
      clinicAddress: clinicAddress.trim(),
      clinicCoordinates: clinicCoordinates || { latitude: null, longitude: null },
      consultationFee: parseFloat(consultationFee),
      services: services || [],
      weeklyAvailability: weeklyAvailability || {},
      location: location.trim(),
      language: language || 'English',
      dateOfBirth: new Date(dateOfBirth),
      gender: gender,
      bio: bio ? bio.trim() : '',
      isPhoneVerified: isPhoneVerified || false,
      isEmailVerified: isEmailVerified || false,
      isActive: true
    };

    let savedDoctor;
    try {
      // Create new doctor
      const doctor = new Doctor(doctorData);
      
      // Save to database
      savedDoctor = await doctor.save();
      console.log('Doctor saved successfully:', savedDoctor._id);
    } catch (dbError) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Database save failed, creating mock doctor for development');
        // Create mock doctor for development
        savedDoctor = {
          _id: 'mock_doctor_id_' + Date.now(),
          ...doctorData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } else {
        throw dbError;
      }
    }

    // Send welcome email
    try {
      await sendWelcomeEmail(email, firstName, 'doctor');
      console.log('Welcome email sent to doctor:', email);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: savedDoctor._id, 
        email: savedDoctor.email, 
        role: 'doctor' 
      },
      process.env.JWT_SECRET || 'doctar_jwt_secret_key_2025',
      { expiresIn: '7d' }
    );

    // Return doctor data (without password)
    const doctorResponse = {
      id: savedDoctor._id,
      firstName: savedDoctor.firstName,
      lastName: savedDoctor.lastName,
      email: savedDoctor.email,
      phone: savedDoctor.phone,
      specialization: savedDoctor.specialization,
      qualification: savedDoctor.qualification,
      experience: savedDoctor.experience,
      awards: savedDoctor.awards,
      pastExperiences: savedDoctor.pastExperiences,
      clinicName: savedDoctor.clinicName,
      clinicAddress: savedDoctor.clinicAddress,
      clinicCoordinates: savedDoctor.clinicCoordinates,
      consultationFee: savedDoctor.consultationFee,
      services: savedDoctor.services,
      weeklyAvailability: savedDoctor.weeklyAvailability,
      location: savedDoctor.location,
      language: savedDoctor.language,
      dateOfBirth: savedDoctor.dateOfBirth,
      gender: savedDoctor.gender,
      bio: savedDoctor.bio,
      isPhoneVerified: savedDoctor.isPhoneVerified,
      isEmailVerified: savedDoctor.isEmailVerified,
      isActive: savedDoctor.isActive,
      createdAt: savedDoctor.createdAt
    };
    
    return NextResponse.json({
      success: true,
      message: 'Doctor registered successfully',
      token,
      doctor: doctorResponse
    }, { status: 201 });
    
  } catch (error) {
    console.error('Doctor registration error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Doctor with this email, phone, or license number already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to register doctor' },
      { status: 500 }
    );
  }
}
