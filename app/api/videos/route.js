import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Video from '../../../models/Video';
import Doctor from '../../../models/Doctor';

// GET - Public API to fetch videos filtered by location
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const category = searchParams.get('category') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const featured = searchParams.get('featured');
    const radius = parseFloat(searchParams.get('radius')) || 0; // For coordinate-based search
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    const language = searchParams.get('language') || '';

    // Build query for active videos only
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

    // Difficulty filter
    if (difficulty) {
      query.difficulty = difficulty;
    }

    // Language filter
    if (language) {
      query.language = { $regex: language, $options: 'i' };
    }

    // Featured filter
    if (featured !== null && featured !== undefined) {
      query.isFeatured = featured === 'true';
    }

    const skip = (page - 1) * limit;

    // Sort by featured first, then by publish date
    const sortCriteria = { isFeatured: -1, publishedAt: -1 };

    const videos = await Video.find(query)
      .populate('author', 'firstName lastName specialization avatar')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .select('-__v'); // Exclude version field

    const totalVideos = await Video.countDocuments(query);
    const totalPages = Math.ceil(totalVideos / limit);

    // Get featured videos separately if not filtering by featured
    let featuredVideos = [];
    if (featured !== 'true' && page === 1) {
      const featuredQuery = { ...query, isFeatured: true };
      featuredVideos = await Video.find(featuredQuery)
        .populate('author', 'firstName lastName specialization avatar')
        .sort({ publishedAt: -1 })
        .limit(5)
        .select('-__v');
    }

    // Get location stats
    const locationStats = await Video.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get category stats
    const categoryStats = await Video.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get difficulty stats
    const difficultyStats = await Video.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        videos,
        featuredVideos: featuredVideos.length > 0 ? featuredVideos : undefined,
        pagination: {
          currentPage: page,
          totalPages,
          totalVideos,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit
        },
        locationStats,
        categoryStats,
        difficultyStats,
        filters: {
          location,
          category,
          difficulty,
          language,
          featured: featured === 'true',
          coordinates: lat && lng ? { lat, lng, radius } : null
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

// POST - Track video interaction (view, like, share)
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { videoId, action } = body;

    if (!videoId || !action) {
      return NextResponse.json(
        { error: 'Video ID and action are required' },
        { status: 400 }
      );
    }

    if (!['view', 'like', 'share'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be view, like, or share' },
        { status: 400 }
      );
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Update interaction count
    const updateField = `${action}Count`;
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      { 
        $inc: { [updateField]: 1 } 
      },
      { new: true, select: 'viewCount likeCount shareCount commentCount' }
    );

    return NextResponse.json({
      success: true,
      message: `${action} recorded successfully`,
      data: {
        videoId,
        action,
        counts: {
          viewCount: updatedVideo.viewCount,
          likeCount: updatedVideo.likeCount,
          shareCount: updatedVideo.shareCount,
          commentCount: updatedVideo.commentCount
        }
      }
    });

  } catch (error) {
    console.error('Error tracking video interaction:', error);
    return NextResponse.json(
      { error: 'Failed to track interaction' },
      { status: 500 }
    );
  }
}