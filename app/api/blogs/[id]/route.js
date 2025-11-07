import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '../../../../lib/mongodb';
import Blog from '../../../../models/blogsModel';

// Helper: find a blog by Mongo ObjectId or slug
async function findBlogByIdOrSlug(idOrSlug) {
  let blog = null;
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    blog = await Blog.findById(idOrSlug);
  }
  if (!blog) {
    blog = await Blog.findOne({ slug: idOrSlug });
  }
  return blog;
}

// GET /api/blogs/[id] - Get single blog by id or slug
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    console.log('Fetching blog with id/slug:', id);
    const blog = await findBlogByIdOrSlug(id)?.populate('author', 'firstName lastName email');

    

    if (!blog) {
      return NextResponse.json(
        { success: false, message: 'Blog not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: blog
    });

  } catch (error) {
    console.error('Error fetching blog:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blog' },
      { status: 500 }
    );
  }
}

// PUT /api/blogs/[id] - Update blog by id or slug
export async function PUT(request, { params }) {
  try {
    await connectDB();

    const body = await request.json();
    const { heading, description, images } = body;

    const { id } = params;
    let blog = await findBlogByIdOrSlug(id);
    if (!blog) {
      return NextResponse.json(
        { success: false, message: 'Blog not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (heading) blog.heading = heading;
    if (description) blog.description = description;
    if (images) blog.images = images;

    await blog.save();
    await blog.populate('author', 'firstName lastName email');

    return NextResponse.json({
      success: true,
      message: 'Blog updated successfully',
      data: blog
    });

  } catch (error) {
    console.error('Error updating blog:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update blog' },
      { status: 500 }
    );
  }
}

// DELETE /api/blogs/[id] - Delete blog by id or slug
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { id } = params;
    const blog = await findBlogByIdOrSlug(id);
    if (!blog) {
      return NextResponse.json(
        { success: false, message: 'Blog not found' },
        { status: 404 }
      );
    }

    await Blog.findByIdAndDelete(blog._id);

    return NextResponse.json({
      success: true,
      message: 'Blog deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting blog:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete blog' },
      { status: 500 }
    );
  }
}
