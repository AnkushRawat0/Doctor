import { NextResponse } from 'next/server';
import { connectDB } from '../../../lib/mongodb';
import News from '../../../models/newsModel';
import Doctor from '../../../models/Doctor';

// GET /api/news - Get all news with pagination and search
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const author = searchParams.get('author') || '';

    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { heading: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (author) {
      query.author = author;
    }

    // Get news with author details
    const news = await News.find(query)
      .populate('author', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await News.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        news,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });

  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

// POST /api/news - Create new news
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { heading, description, images, author } = body;

    // Validate required fields
    if (!heading || !description || !images || !author) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if author exists
    const authorExists = await Doctor.findById(author);
    if (!authorExists) {
      return NextResponse.json(
        { success: false, message: 'Author not found' },
        { status: 404 }
      );
    }

    // Create new news
    const news = new News({
      heading,
      description,
      images,
      author
    });

    await news.save();
    await news.populate('author', 'firstName lastName email');

    return NextResponse.json({
      success: true,
      message: 'News created successfully',
      data: news
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating news:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create news' },
      { status: 500 }
    );
  }
}
