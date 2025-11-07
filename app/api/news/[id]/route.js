import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/mongodb';
import News from '../../../../models/newsModel';

// GET /api/news/[id] - Get single news
export async function GET(request, { params }) {
  try {
    await connectDB();

    const news = await News.findOne({ slug: params.id })
      .populate('author', 'firstName lastName email');

    if (!news) {
      return NextResponse.json(
        { success: false, message: 'News not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: news
    });

  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

// PUT /api/news/[id] - Update news
export async function PUT(request, { params }) {
  try {
    await connectDB();

    const body = await request.json();
    const { heading, description, images } = body;

    const news = await News.findById(params.id);
    if (!news) {
      return NextResponse.json(
        { success: false, message: 'News not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (heading) news.heading = heading;
    if (description) news.description = description;
    if (images) news.images = images;

    await news.save();
    await news.populate('author', 'firstName lastName email');

    return NextResponse.json({
      success: true,
      message: 'News updated successfully',
      data: news
    });

  } catch (error) {
    console.error('Error updating news:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update news' },
      { status: 500 }
    );
  }
}

// DELETE /api/news/[id] - Delete news
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const news = await News.findById(params.id);
    if (!news) {
      return NextResponse.json(
        { success: false, message: 'News not found' },
        { status: 404 }
      );
    }

    await News.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'News deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting news:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete news' },
      { status: 500 }
    );
  }
}
