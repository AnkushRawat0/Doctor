import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Review from '../../../models/Review';
import Doctor from '../../../models/Doctor';
import Patient from '../../../models/Patient';
import jwt from 'jsonwebtoken';

// Helper function to verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'doctar_jwt_secret_key_2025');
  } catch (error) {
    return null;
  }
};

export async function POST(request) {
  try {
    await connectDB();
    
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user is a patient
    if (decoded.role !== 'patient') {
      return NextResponse.json(
        { error: 'Only patients can submit reviews' },
        { status: 403 }
      );
    }

    // Verify patient exists and is active
    const patient = await Patient.findById(decoded.userId);
    if (!patient || !patient.isActive) {
      return NextResponse.json(
        { error: 'Patient not found or inactive' },
        { status: 404 }
      );
    }
    
    const { doctorId, rating, comment } = await request.json();

    // Validate required fields
    if (!doctorId || !rating || !comment) {
      return NextResponse.json(
        { error: 'Doctor ID, rating, and comment are required' },
        { status: 400 }
      );
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    // Check if patient has already reviewed this doctor
    const existingReview = await Review.findOne({ 
      doctorId, 
      patientId: decoded.userId 
    });
    
    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this doctor' },
        { status: 400 }
      );
    }

    // Create new review
    const review = new Review({
      doctorId,
      patientId: decoded.userId,
      rating,
      comment,
      patientName: `${patient.firstName} ${patient.lastName}`,
      email: patient.email,
      createdAt: new Date()
    });

    await review.save();

    // Update doctor's average rating and review count (all reviews)
    const allReviews = await Review.find({ doctorId });
    const totalReviews = allReviews.length;
    
    // Calculate new average rating (from all reviews)
    const averageRating = totalReviews > 0 
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
      : 0;

    await Doctor.findByIdAndUpdate(doctorId, {
      rating: averageRating,
      reviewCount: totalReviews
    });

    return NextResponse.json(
      { 
        message: 'Review submitted successfully',
        review: {
          id: review._id,
          rating: review.rating,
          comment: review.comment,
          patientName: review.patientName,
          createdAt: review.createdAt
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');

    if (!doctorId) {
      return NextResponse.json(
        { error: 'Doctor ID is required' },
        { status: 400 }
      );
    }

    // Get all reviews for the doctor
    const reviews = await Review.find({ 
      doctorId
    }).sort({ createdAt: -1 });

    return NextResponse.json({ reviews });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
