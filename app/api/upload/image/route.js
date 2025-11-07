import { NextResponse } from 'next/server';
import { uploadImage } from '../../../services/cloudinaryService';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');
    const folder = formData.get('folder') || 'doctar/general';
    const transformation = formData.get('transformation') || 'profile'; // profile, gallery, thumbnail
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit for all images)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary with appropriate transformation
    const result = await uploadImage(buffer, folder, transformation);

    return NextResponse.json({
      success: true,
      imageUrl: result.url,
      publicId: result.public_id,
      width: result.width,
      height: result.height
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
