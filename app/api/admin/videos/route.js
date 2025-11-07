import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Video from '../../../../models/Video';
import Admin from '../../../../models/Admin';
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

// GET - Fetch all videos for admin (with filters)
export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const searchTerm = searchParams.get('search') || '';
    const locationFilter = searchParams.get('location') || '';
    const categoryFilter = searchParams.get('category') || '';
    const authorFilter = searchParams.get('author') || '';
    const difficultyFilter = searchParams.get('difficulty') || '';

    // Build query
    const query = {};
    
    if (searchTerm) {
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } }
      ];
    }
    
    if (locationFilter) {
      query.location = { $regex: locationFilter, $options: 'i' };
    }
    
    if (categoryFilter) {
      query.category = categoryFilter;
    }
    
    if (authorFilter) {
      query.author = authorFilter;
    }

    if (difficultyFilter) {
      query.difficulty = difficultyFilter;
    }

    const skip = (page - 1) * limit;
    
    const videos = await Video.find(query)
      .populate('author', 'firstName lastName email specialization')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalVideos = await Video.countDocuments(query);
    const totalPages = Math.ceil(totalVideos / limit);

    return NextResponse.json({
      success: true,
      data: {
        videos,
        pagination: {
          currentPage: page,
          totalPages,
          totalVideos,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

// POST - Create new video (Admin only)
export async function POST(request) {
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
      isFeatured
    } = body;

    // Validation
    if (!title || !description || !iframeUrl || !location || !address || !coordinates || !category || !duration || !author) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, iframeUrl, location, address, coordinates, category, duration, author' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (!coordinates.latitude || !coordinates.longitude) {
      return NextResponse.json(
        { error: 'Valid coordinates (latitude and longitude) are required' },
        { status: 400 }
      );
    }

    // Validate latitude and longitude ranges
    if (coordinates.latitude < -90 || coordinates.latitude > 90) {
      return NextResponse.json(
        { error: 'Latitude must be between -90 and 90 degrees' },
        { status: 400 }
      );
    }

    if (coordinates.longitude < -180 || coordinates.longitude > 180) {
      return NextResponse.json(
        { error: 'Longitude must be between -180 and 180 degrees' },
        { status: 400 }
      );
    }

    // Create new video
    const video = new Video({
      title,
      description,
      iframeUrl,
      thumbnail,
      location,
      address,
      coordinates: {
        latitude: parseFloat(coordinates.latitude),
        longitude: parseFloat(coordinates.longitude)
      },
      category,
      duration: parseInt(duration),
      tags: Array.isArray(tags) ? tags : [],
      author,
      difficulty: difficulty || 'beginner',
      language: language || 'English',
      isFeatured: Boolean(isFeatured)
    });

    const savedVideo = await video.save();
    
    // Populate author details for response
    await savedVideo.populate('author', 'firstName lastName email specialization');

    return NextResponse.json({
      success: true,
      message: 'Video created successfully',
      data: { video: savedVideo }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating video:', error);
    
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
      { error: 'Failed to create video' },
      { status: 500 }
    );
  }
}