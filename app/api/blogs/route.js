import { NextResponse } from 'next/server';
import { connectDB } from '../../../lib/mongodb';
import Blog from '../../../models/blogsModel';
import Doctor from '../../../models/Doctor';

// GET /api/blogs - Get all blogs with pagination and search
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

    // Get blogs with author details
    const blogs = await Blog.find(query)
      .populate('author', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Blog.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        blogs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });

  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blogs' },
      { status: 500 }
    );
  }
}

// POST /api/blogs - Create new blog
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

    // Create new blog
    const blog = new Blog({
      heading,
      description,
      images,
      author
    });

    await blog.save();
    await blog.populate('author', 'firstName lastName email');

    return NextResponse.json({
      success: true,
      message: 'Blog created successfully',
      data: blog
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating blog:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create blog' },
      { status: 500 }
    );
  }
}
