import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/mongodb';
import Patient from '../../../../../models/Patient';
import Admin from '../../../../../models/Admin';
import jwt from 'jsonwebtoken';

// PUT method to update patient suspension status
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    const { isSuspended, suspensionReason } = await request.json();
    
    // Get token from headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : request.headers.get('token');
    
    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token is required' },
        { status: 401 }
      );
    }
    
    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }
    
    if (typeof isSuspended !== 'boolean') {
      return NextResponse.json(
        { error: 'isSuspended must be a boolean value' },
        { status: 400 }
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
    
    // Check if user role is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }
    
    // Verify admin exists in database
    const admin = await Admin.findById(decoded.userId);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }
    
    // Check if admin account is active
    if (!admin.isActive) {
      return NextResponse.json(
        { error: 'Admin account is deactivated' },
        { status: 403 }
      );
    }
    
    // Find the patient
    const patient = await Patient.findById(id);
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }
    
    // Prepare update object
    const updateObject = {
      isSuspended: isSuspended
    };
    
    // Handle suspension logic
    if (isSuspended) {
      // If suspending, add reason and deactivate
      updateObject.suspensionReason = suspensionReason || 'No reason provided';
      updateObject.isActive = false;
    } else {
      // If unsuspending, clear reason and activate
      updateObject.suspensionReason = '';
      updateObject.isActive = true;
    }
    
    // Update the patient
    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      { $set: updateObject },
      { new: true, runValidators: true }
    ).select('-password -otpCode'); // Exclude sensitive fields
    
    const actionMessage = isSuspended ? 'suspended' : 'unsuspended';
    
    // Log the admin action
    console.log(`Admin ${admin.email} ${actionMessage} patient ${patient.email} (ID: ${id})`);
    
    return NextResponse.json({
      success: true,
      message: `Patient ${actionMessage} successfully`,
      data: {
        patient: {
          id: updatedPatient._id,
          firstName: updatedPatient.firstName,
          lastName: updatedPatient.lastName,
          email: updatedPatient.email,
          phone: updatedPatient.phone,
          isSuspended: updatedPatient.isSuspended,
          suspensionReason: updatedPatient.suspensionReason,
          isActive: updatedPatient.isActive,
          isEmailVerified: updatedPatient.isEmailVerified,
          isPhoneVerified: updatedPatient.isPhoneVerified
        },
        action: {
          type: 'suspension',
          value: isSuspended,
          reason: suspensionReason || null,
          performedBy: {
            adminId: admin._id,
            adminEmail: admin.email,
            adminName: `${admin.firstName} ${admin.lastName}`
          },
          timestamp: new Date()
        }
      }
    });
    
  } catch (error) {
    console.error('Patient suspension update error:', error);
    return NextResponse.json(
      { error: 'Failed to update patient suspension status. Please try again.' },
      { status: 500 }
    );
  }
}

// GET method to fetch patient details by ID
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    
    // Get token from headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : request.headers.get('token');
    
    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token is required' },
        { status: 401 }
      );
    }
    
    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
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
    
    // Check if user role is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }
    
    // Verify admin exists in database
    const admin = await Admin.findById(decoded.userId);
    
    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { error: 'Admin not found or deactivated' },
        { status: 404 }
      );
    }
    
    // Find the patient
    const patient = await Patient.findById(id).select('-password -otpCode');
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Patient details fetched successfully',
      data: {
        patient
      }
    });
    
  } catch (error) {
    console.error('Fetch patient error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient details. Please try again.' },
      { status: 500 }
    );
  }
}

// DELETE method to delete a patient
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    
    // Get token from headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : request.headers.get('token');
    
    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token is required' },
        { status: 401 }
      );
    }
    
    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
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
    
    // Check if user role is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }
    
    // Verify admin exists in database
    const admin = await Admin.findById(decoded.userId);
    
    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { error: 'Admin not found or deactivated' },
        { status: 404 }
      );
    }
    
    // Find the patient
    const patient = await Patient.findById(id);
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }
    
    // Delete the patient
    await Patient.findByIdAndDelete(id);
    
    // Log the admin action
    console.log(`Admin ${admin.email} deleted patient ${patient.email} (ID: ${id})`);
    
    return NextResponse.json({
      success: true,
      message: 'Patient deleted successfully',
      data: {
        deletedPatient: {
          id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email
        },
        action: {
          type: 'delete',
          performedBy: {
            adminId: admin._id,
            adminEmail: admin.email,
            adminName: `${admin.firstName} ${admin.lastName}`
          },
          timestamp: new Date()
        }
      }
    });
    
  } catch (error) {
    console.error('Delete patient error:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient. Please try again.' },
      { status: 500 }
    );
  }
}
