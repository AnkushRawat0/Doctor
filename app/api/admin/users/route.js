import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/mongodb';
import Patient from '../../../../models/Patient';
import Admin from '../../../../models/Admin';
import jwt from 'jsonwebtoken';

export async function GET(request) {
  try {
    await connectDB();
    
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
    
    // Get pagination parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Fetch patients with pagination
    const patients = await Patient.find({})
      .select('-password -otpCode') // Exclude sensitive fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalPatients = await Patient.countDocuments({});
    const totalPages = Math.ceil(totalPatients / limit);
    
    // Return patients data
    return NextResponse.json({
      success: true,
      message: 'Patients fetched successfully',
      data: {
        patients,
        pagination: {
          currentPage: page,
          totalPages,
          totalPatients,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Fetch patients error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patients. Please try again.' },
      { status: 500 }
    );
  }
}
