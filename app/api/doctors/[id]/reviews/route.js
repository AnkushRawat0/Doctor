import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/mongodb';
import Review from '../../../../../models/Review';
import Doctor from '../../../../../models/Doctor';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10;
    const page = parseInt(searchParams.get('page')) || 1;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Doctor ID is required' },
        { status: 400 }
      );
    }
    
    // Verify doctor exists
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }
    
    // Build query for all reviews
    const query = {
      doctorId: id
    };
    
    // Get total count for pagination
    const totalReviews = await Review.countDocuments(query);
    
    // Get paginated reviews
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    // Calculate statistics manually
    const allReviews = await Review.find({ doctorId: id });
    const averageRating = allReviews.length > 0 
      ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length 
      : 0;
    
    return NextResponse.json({
      success: true,
      reviews: reviews.map(review => ({
        id: review._id,
        rating: review.rating,
        comment: review.comment,
        patientName: review.patientName,
        email: review.email,
        createdAt: review.createdAt,
        doctorResponse: review.doctorResponse,
        responseDate: review.responseDate
      })),
      statistics: {
        totalReviews: allReviews.length,
        averageRating: averageRating
      },
      pagination: {
        page,
        limit,
        total: totalReviews,
        pages: Math.ceil(totalReviews / limit),
        hasNext: page * limit < totalReviews,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('Reviews fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews. Please try again.' },
      { status: 500 }
    );
  }
}

// POST endpoint for adding new reviews
export async function POST(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const { patientName, rating, comment, patientId } = await request.json();
    
    if (!id || !patientName || !rating || !comment) {
      return NextResponse.json(
        { error: 'Missing required fields: doctorId, patientName, rating, and comment are required' },
        { status: 400 }
      );
    }
    
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }
    
    if (comment.length > 1000) {
      return NextResponse.json(
        { error: 'Comment must be less than 1000 characters' },
        { status: 400 }
      );
    }
    
    // Verify doctor exists
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }
    
    // Check if patient can review this doctor (prevent duplicates)
    if (patientId) {
      const canReviewResult = await Review.canPatientReview(id, patientId);
      if (!canReviewResult.canReview) {
        return NextResponse.json(
          { error: canReviewResult.reason },
          { status: 409 }
        );
      }
    }
    
    // Create the review
    const newReview = new Review({
      doctorId: id,
      patientId: patientId || null,
      patientName: patientName.trim(),
      rating: parseInt(rating),
      comment: comment.trim(),
      email: '' // Optional field, can be empty for anonymous reviews
    });
    
    await newReview.save();
    
    // Update doctor's rating
    const allReviews = await Review.find({ doctorId: id });
    const averageRating = allReviews.length > 0 
      ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length 
      : 0;
    
    await Doctor.findByIdAndUpdate(id, {
      rating: {
        average: averageRating,
        count: allReviews.length
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      review: {
        id: newReview._id,
        rating: newReview.rating,
        comment: newReview.comment,
        patientName: newReview.patientName,
        email: newReview.email,
        createdAt: newReview.createdAt
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Review creation error:', error);
    return NextResponse.json(
      { error: 'Failed to submit review. Please try again.' },
      { status: 500 }
    );
  }
}
