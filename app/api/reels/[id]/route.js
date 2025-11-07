import { NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/mongodb';
import Reels from '../../../../models/Reels';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    
    const reel = await Reels.findById(id)
      .populate('author', 'firstName lastName email')
      .select('-__v');
    
    if (!reel) {
      return NextResponse.json(
        { error: 'Reel not found' },
        { status: 404 }
      );
    }
    
    // Increment view count
    await Reels.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    
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

export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    const body = await request.json();
    
    const reel = await Reels.findById(id);
    if (!reel) {
      return NextResponse.json(
        { error: 'Reel not found' },
        { status: 404 }
      );
    }
    
    // Validate iframe URL if provided
    if (body.iframeUrl && (!body.iframeUrl.includes('<iframe') || !body.iframeUrl.includes('</iframe>'))) {
      return NextResponse.json(
        { error: 'Invalid iframe URL format' },
        { status: 400 }
      );
    }
    
    const updatedReel = await Reels.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).populate('author', 'firstName lastName email');
    
    return NextResponse.json({
      success: true,
      message: 'Reel updated successfully',
      data: updatedReel
    });
    
  } catch (error) {
    console.error('Error updating reel:', error);
    return NextResponse.json(
      { error: 'Failed to update reel' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    
    const reel = await Reels.findById(id);
    if (!reel) {
      return NextResponse.json(
        { error: 'Reel not found' },
        { status: 404 }
      );
    }
    
    await Reels.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Reel deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting reel:', error);
    return NextResponse.json(
      { error: 'Failed to delete reel' },
      { status: 500 }
    );
  }
}
