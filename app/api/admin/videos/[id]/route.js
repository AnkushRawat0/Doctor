import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Video from '../../../../../models/Video';
import Admin from '../../../../../models/Admin';
import jwt from 'jsonwebtoken';

// Helper function to verify admin authentication
async function verifyAdmin(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : request.headers.get('token');
    
    if (!token) {
      return { error: 'Authentication token is required', status: 401 };
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'doctar_jwt_secret_key_2025');
    
    if (decoded.role !== 'admin') {
      return { error: 'Access denied. Admin privileges required.', status: 403 };
    }
    
    // Verify admin exists in database
    await connectDB();
    const admin = await Admin.findById(decoded.userId);
    if (!admin) {
      return { error: 'Admin not found', status: 404 };
    }
    
    return { admin, adminId: decoded.userId };
  } catch (error) {
    return { error: 'Invalid or expired token', status: 401 };
  }
}

// GET - Fetch single video by ID (Admin only)
export async function GET(request, { params }) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdmin(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDB();

    const { id } = params;
    
    const video = await Video.findById(id)
      .populate('author', 'firstName lastName email specialization');

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { video }
    });

  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    );
  }
}

// PUT - Update video (Admin only)
export async function PUT(request, { params }) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdmin(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDB();

    const { id } = params;
    const body = await request.json();
    
    const {
      title,
      description,
      iframeUrl,
      thumbnail,
      location,
      address,
      coordinates,
      category,
      duration,
      tags,
      author,
      difficulty,
      language,
      isFeatured,
      isActive
    } = body;

    // Find existing video
    const existingVideo = await Video.findById(id);
    if (!existingVideo) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Validate coordinates if provided
    if (coordinates) {
      if (coordinates.latitude && (coordinates.latitude < -90 || coordinates.latitude > 90)) {
        return NextResponse.json(
          { error: 'Latitude must be between -90 and 90 degrees' },
          { status: 400 }
        );
      }

      if (coordinates.longitude && (coordinates.longitude < -180 || coordinates.longitude > 180)) {
        return NextResponse.json(
          { error: 'Longitude must be between -180 and 180 degrees' },
          { status: 400 }
        );
      }
    }

    // Update video
    const updateData = {
      ...(title && { title }),
      ...(description && { description }),
      ...(iframeUrl && { iframeUrl }),
      ...(thumbnail !== undefined && { thumbnail }),
      ...(location && { location }),
      ...(address && { address }),
      ...(coordinates && {
        coordinates: {
          latitude: parseFloat(coordinates.latitude),
          longitude: parseFloat(coordinates.longitude)
        }
      }),
      ...(category && { category }),
      ...(duration && { duration: parseInt(duration) }),
      ...(tags && { tags: Array.isArray(tags) ? tags : [] }),
      ...(author && { author }),
      ...(difficulty && { difficulty }),
      ...(language && { language }),
      ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) })
    };

    const updatedVideo = await Video.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    ).populate('author', 'firstName lastName email specialization');

    return NextResponse.json({
      success: true,
      message: 'Video updated successfully',
      data: { video: updatedVideo }
    });

  } catch (error) {
    console.error('Error updating video:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A video with this title already exists' },
        { status: 409 }
      );
    }
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 }
    );
  }
}

// DELETE - Delete video (Admin only)
export async function DELETE(request, { params }) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdmin(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDB();

    const { id } = params;

    // Find and delete video
    const deletedVideo = await Video.findByIdAndDelete(id);

    if (!deletedVideo) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
      data: { 
        video: {
          id: deletedVideo._id,
          title: deletedVideo.title
        }
      }
    });

  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}