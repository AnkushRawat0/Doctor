import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Reels from '../../../models/Reels';

// GET - Public API to fetch reels filtered by location
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const category = searchParams.get('category') || '';
    const featured = searchParams.get('featured');
    const radius = parseFloat(searchParams.get('radius')) || 0; // For coordinate-based search
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));

    // Build query for active reels only
    const query = { 
      isActive: true 
    };

    // Location-based filtering
    if (location) {
      // Text-based location search
      query.location = { $regex: location, $options: 'i' };
    } else if (lat && lng && radius > 0) {
      // Coordinate-based search within radius (in kilometers)
      // Using MongoDB's $geoNear would be ideal, but for simplicity using basic distance calculation
      // This is a simplified approach - for production, consider using MongoDB's geospatial queries
      const radiusInDegrees = radius / 111; // Rough conversion from km to degrees
      
      query['coordinates.latitude'] = {
        $gte: lat - radiusInDegrees,
        $lte: lat + radiusInDegrees
      };
      query['coordinates.longitude'] = {
        $gte: lng - radiusInDegrees,
        $lte: lng + radiusInDegrees
      };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Featured filter
    if (featured !== null && featured !== undefined) {
      query.isFeatured = featured === 'true';
    }

    const skip = (page - 1) * limit;

    // Sort by featured first, then by publish date
    const sortCriteria = { isFeatured: -1, publishedAt: -1 };

    const reels = await Reels.find(query)
      .populate('author', 'firstName lastName specialization avatar')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .select('-__v'); // Exclude version field

    const totalReels = await Reels.countDocuments(query);
    const totalPages = Math.ceil(totalReels / limit);

    // Get featured reels separately if not filtering by featured
    let featuredReels = [];
    if (featured !== 'true' && page === 1) {
      const featuredQuery = { ...query, isFeatured: true };
      featuredReels = await Reels.find(featuredQuery)
        .populate('author', 'firstName lastName specialization avatar')
        .sort({ publishedAt: -1 })
        .limit(5)
        .select('-__v');
    }

    // Get location stats
    const locationStats = await Reels.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reels,
        featuredReels: featuredReels.length > 0 ? featuredReels : undefined,
        pagination: {
          currentPage: page,
          totalPages,
          totalReels,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit
        },
        locationStats,
        filters: {
          location,
          category,
          featured: featured === 'true',
          coordinates: lat && lng ? { lat, lng, radius } : null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching public reels:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch reels',
        data: null
      },
      { status: 500 }
    );
  }
}

// POST - Public API to increment view count
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { reelId, action } = body;

    if (!reelId || !action) {
      return NextResponse.json(
        { error: 'Missing reelId or action' },
        { status: 400 }
      );
    }

    const updateField = {};
    switch (action) {
      case 'view':
        updateField.viewCount = 1;
        break;
      case 'like':
        updateField.likeCount = 1;
        break;
      case 'share':
        updateField.shareCount = 1;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: view, like, or share' },
          { status: 400 }
        );
    }

    const reel = await Reels.findByIdAndUpdate(
      reelId,
      { $inc: updateField },
      { new: true }
    );

    if (!reel) {
      return NextResponse.json(
        { error: 'Reel not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${action} count updated successfully`,
      data: {
        reelId,
        viewCount: reel.viewCount,
        likeCount: reel.likeCount,
        shareCount: reel.shareCount
      }
    });

  } catch (error) {
    console.error('Error updating reel stats:', error);
    return NextResponse.json(
      { error: 'Failed to update reel stats' },
      { status: 500 }
    );
  }
}
