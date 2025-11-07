import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Reels from '../../../../../models/Reels';
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

// PUT - Update reel (Admin only)
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
      isFeatured,
      isActive
    } = body;

    // Find existing reel
    const existingReel = await Reels.findById(id);
    if (!existingReel) {
      return NextResponse.json(
        { error: 'Reel not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!title || !description || !iframeUrl || !location || !address || !coordinates || !author) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, iframeUrl, location, address, coordinates, and author are required' },
        { status: 400 }
      );
    }

    // Validate coordinates if provided
    if (coordinates) {
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
    }

    // Update reel data
    const updateData = {
      title: title.trim(),
      description: description.trim(),
      iframeUrl: iframeUrl.trim(),
      thumbnail: thumbnail?.trim() || existingReel.thumbnail,
      location: location.trim(),
      address: address.trim(),
      coordinates: {
        latitude: parseFloat(coordinates.latitude),
        longitude: parseFloat(coordinates.longitude)
      },
      category: category || existingReel.category,
      duration: duration || existingReel.duration,
      tags: Array.isArray(tags) ? tags.map(tag => tag.trim()).filter(tag => tag) : existingReel.tags,
      author,
      isFeatured: Boolean(isFeatured),
      isActive: isActive !== undefined ? Boolean(isActive) : existingReel.isActive,
      updatedAt: new Date()
    };

    const updatedReel = await Reels.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'firstName lastName email');

    return NextResponse.json({
      success: true,
      message: 'Reel updated successfully',
      data: updatedReel
    });

  } catch (error) {
    console.error('Error updating reel:', error);
    
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
      { error: 'Failed to update reel' },
      { status: 500 }
    );
  }
}

// DELETE - Delete reel (Admin only)
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

    // Find and delete reel
    const deletedReel = await Reels.findByIdAndDelete(id);
    
    if (!deletedReel) {
      return NextResponse.json(
        { error: 'Reel not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reel deleted successfully',
      data: { id }
    });

  } catch (error) {
    console.error('Error deleting reel:', error);
    return NextResponse.json(
      { error: 'Failed to delete reel' },
      { status: 500 }
    );
  }
}

// GET - Get single reel (Admin only)
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

    const reel = await Reels.findById(id)
      .populate('author', 'firstName lastName email specialization');

    if (!reel) {
      return NextResponse.json(
        { error: 'Reel not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: reel
    });

  } catch (error) {
    console.error('Error fetching reel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reel' },
      { status: 500 }
    );
  }
}