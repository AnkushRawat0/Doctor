import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Reels from '../../../../models/Reels';
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

// GET - Fetch all reels for admin (with filters)
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

    const skip = (page - 1) * limit;
    
    const reels = await Reels.find(query)
      .populate('author', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReels = await Reels.countDocuments(query);
    const totalPages = Math.ceil(totalReels / limit);

    return NextResponse.json({
      success: true,
      data: {
        reels,
        pagination: {
          currentPage: page,
          totalPages,
          totalReels,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching reels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reels' },
      { status: 500 }
    );
  }
}

// POST - Create new reel (Admin only)
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
      isFeatured
    } = body;

    // Validate required fields
    if (!title || !description || !iframeUrl || !location || !address || !coordinates || !author) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, iframeUrl, location, address, coordinates, and author are required' },
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
        { error: 'Latitude must be between -90 and 90' },
        { status: 400 }
      );
    }

    if (coordinates.longitude < -180 || coordinates.longitude > 180) {
      return NextResponse.json(
        { error: 'Longitude must be between -180 and 180' },
        { status: 400 }
      );
    }

    // Create reel data
    const reelData = {
      title: title.trim(),
      description: description.trim(),
      iframeUrl: iframeUrl.trim(),
      thumbnail: thumbnail?.trim() || '',
      location: location.trim(),
      address: address.trim(),
      coordinates: {
        latitude: parseFloat(coordinates.latitude),
        longitude: parseFloat(coordinates.longitude)
      },
      category: category || 'reel',
      duration: duration || 60,
      tags: Array.isArray(tags) ? tags.map(tag => tag.trim()).filter(tag => tag) : [],
      author,
      isFeatured: Boolean(isFeatured),
      isActive: true,
      publishedAt: new Date()
    };

    const reel = new Reels(reelData);
    await reel.save();

    // Populate author info for response
    await reel.populate('author', 'firstName lastName email');

    return NextResponse.json({
      success: true,
      message: 'Reel created successfully',
      data: reel
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating reel:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ') },
        { status: 400 }
      );
    }
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A reel with this slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create reel' },
      { status: 500 }
    );
  }
}