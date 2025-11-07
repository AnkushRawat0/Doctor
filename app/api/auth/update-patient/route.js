import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/mongodb';
import Patient from '../../../../models/Patient';
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
    
    // Find patient by ID from token
    const patient = await Patient.findById(decoded.userId);
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }
    
    // Migration: Ensure avatar fields exist for older records
    if (patient.avatar === undefined || patient.avatarPublicId === undefined) {
      await Patient.findByIdAndUpdate(
        decoded.userId,
        { 
          $set: { 
            avatar: patient.avatar || '/icons/user-placeholder.png',
            avatarPublicId: patient.avatarPublicId || null
          }
        }
      );
      console.log('Patient update - migrated avatar fields for patient:', decoded.userId);
    }
    
    // Update patient data
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 
      'location', 'language', 'emergencyContact', 'address', 
      'bloodGroup', 'allergies', 'medicalHistory', 'avatar', 'avatarPublicId'
    ];
    
    // Only update allowed fields
    const updateFields = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields[field] = updateData[field];
      }
    });
    
    // Ensure avatar field exists with default value if not provided
    if (!updateFields.avatar && !patient.avatar) {
      updateFields.avatar = '/icons/user-placeholder.png';
    }
    
    // Ensure avatarPublicId field exists (can be null)
    if (updateFields.avatarPublicId === undefined && !patient.avatarPublicId) {
      updateFields.avatarPublicId = null;
    }
    
    console.log('Patient update - avatar fields:', {
      avatarInUpdate: updateData.avatar,
      avatarPublicIdInUpdate: updateData.avatarPublicId
    });
    
    // Update the patient with explicit field handling
    const updateOperation = { $set: updateFields };
    
    // For avatar fields, ensure they're properly set in the document
    if (updateFields.avatar !== undefined) {
      updateOperation.$set.avatar = updateFields.avatar;
    }
    if (updateFields.avatarPublicId !== undefined) {
      updateOperation.$set.avatarPublicId = updateFields.avatarPublicId;
    }
    
    console.log('Patient update - updating avatar fields:', {
      avatar: updateOperation.$set.avatar,
      avatarPublicId: updateOperation.$set.avatarPublicId
    });
    
    const updatedPatient = await Patient.findByIdAndUpdate(
      decoded.userId,
      updateOperation,
      { new: true, runValidators: true, upsert: false }
    );
    
    console.log('Patient update - updatedPatient result:', {
      id: updatedPatient._id,
      avatar: updatedPatient.avatar,
      avatarPublicId: updatedPatient.avatarPublicId
    });
    
    // Double-check by querying the document again
    const verifyPatient = await Patient.findById(decoded.userId);
    console.log('Patient update - verification query result:', {
      id: verifyPatient._id,
      avatar: verifyPatient.avatar,
      avatarPublicId: verifyPatient.avatarPublicId,
      hasAvatarField: verifyPatient.hasOwnProperty('avatar'),
      hasAvatarPublicIdField: verifyPatient.hasOwnProperty('avatarPublicId')
    });
    
    // Return updated patient data (without password)
    const patientResponse = {
      id: updatedPatient._id,
      firstName: updatedPatient.firstName,
      lastName: updatedPatient.lastName,
      email: updatedPatient.email,
      phone: updatedPatient.phone,
      dateOfBirth: updatedPatient.dateOfBirth,
      gender: updatedPatient.gender,
      location: updatedPatient.location,
      language: updatedPatient.language,
      isPhoneVerified: updatedPatient.isPhoneVerified,
      isEmailVerified: updatedPatient.isEmailVerified,
      isActive: updatedPatient.isActive,
      emergencyContact: updatedPatient.emergencyContact,
      address: updatedPatient.address,
      bloodGroup: updatedPatient.bloodGroup,
      allergies: updatedPatient.allergies,
      medicalHistory: updatedPatient.medicalHistory,
      lastUpdated: updatedPatient.updatedAt
    };
    
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedPatient._id,
        email: updatedPatient.email,
        firstName: updatedPatient.firstName,
        lastName: updatedPatient.lastName,
        role: 'patient',
        avatar: updatedPatient.avatar || '/icons/user-placeholder.png'
      },
      profile: {
        firstName: updatedPatient.firstName,
        lastName: updatedPatient.lastName,
        email: updatedPatient.email,
        phone: updatedPatient.phone,
        dateOfBirth: updatedPatient.dateOfBirth,
        gender: updatedPatient.gender,
        location: updatedPatient.location,
        language: updatedPatient.language,
        isPhoneVerified: updatedPatient.isPhoneVerified,
        isEmailVerified: updatedPatient.isEmailVerified,
        emergencyContact: updatedPatient.emergencyContact,
        address: updatedPatient.address,
        bloodGroup: updatedPatient.bloodGroup,
        allergies: updatedPatient.allergies,
        medicalHistory: updatedPatient.medicalHistory,
        avatar: updatedPatient.avatar || verifyPatient.avatar || '/icons/user-placeholder.png',
        avatarPublicId: updatedPatient.avatarPublicId || verifyPatient.avatarPublicId || null
      }
    });
    
  } catch (error) {
    console.error('Patient update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile. Please try again.' },
      { status: 500 }
    );
  }
}
