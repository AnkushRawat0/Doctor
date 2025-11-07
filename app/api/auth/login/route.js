import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/mongodb';
import Patient from '../../../../models/Patient';
import Doctor from '../../../../models/Doctor';
import Admin from '../../../../models/Admin';
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
    
    // Try to find user in both Patient and Doctor collections
    let user = null;
    let userType = null;
    
    // Check Patient collection first
    const patient = await Patient.findOne({ email: email.toLowerCase() });
    if (patient) {
      user = patient;
      userType = 'patient';
    } else {
      // Check Doctor collection
      const doctor = await Doctor.findOne({ email: email.toLowerCase() });
      if (doctor) {
        user = doctor;
        userType = 'doctor';
      }
      else {
        // Check Admin collection
        const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
        if (admin) {
          user = admin;
          userType = 'admin';
        }
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: userType 
      },
      process.env.JWT_SECRET || 'doctar_jwt_secret_key_2025',
      { expiresIn: '7d' }
    );
    
    // Prepare response based on user type
    let userResponse, profileResponse;
    
    if (userType === 'patient') {
      userResponse = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'patient',
        avatar: user.avatar || '/icons/user-placeholder.png'
      };
      
      profileResponse = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        location: user.location,
        language: user.language,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified,
        emergencyContact: user.emergencyContact,
        address: user.address,
        bloodGroup: user.bloodGroup,
        allergies: user.allergies,
        medicalHistory: user.medicalHistory,
        avatar: user.avatar || '/icons/user-placeholder.png',
        avatarPublicId: user.avatarPublicId
      };
    } else if (userType === 'doctor') {
      userResponse = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'doctor',
        avatar: user.avatar || '/icons/user-placeholder.png'
      };
      
      profileResponse = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        specialization: user.specialization,
        qualification: user.qualification,
        experience: user.experience,
        awards: user.awards || [],
        pastExperiences: user.pastExperiences || [],
        clinicName: user.clinicName,
        clinicAddress: user.clinicAddress,
        clinicCoordinates: user.clinicCoordinates || { latitude: null, longitude: null },
        consultationFee: user.consultationFee,
        services: user.services || [],
        weeklyAvailability: user.weeklyAvailability || {},
        location: user.location,
        language: user.language,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        bio: user.bio,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar || '/icons/user-placeholder.png',
        avatarPublicId: user.avatarPublicId,
        gallery: user.gallery || []
      };
    }
    else if (userType === 'admin') {
      userResponse = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'admin'
      };
      
      profileResponse = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone
      };
    }
    
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse,
      profile: profileResponse
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
