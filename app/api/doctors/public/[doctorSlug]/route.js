import { NextResponse } from 'next/server';
import { connectDB } from '../../../../../lib/mongodb';
import Doctor from '../../../../../models/Doctor';

// Get public doctor profile by slug
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { doctorSlug } = await params;
    
    // Find doctor by slug
    let doctor = await Doctor.findOne({ slug: doctorSlug, isActive: true });
    
    // If not found by slug, try to find by generated slug from name and specialization
    if (!doctor) {
      // Try to find doctors and check if any match the slug pattern
      const allDoctors = await Doctor.find({ isActive: true });
      
      for (const doc of allDoctors) {
        const generatedSlug = doc.generateSlug ? doc.generateSlug() : 
          `${doc.firstName}-${doc.lastName}`.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-') + '-' +
          doc.specialization.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
        
        if (generatedSlug === doctorSlug) {
          doctor = doc;
          break;
        }
      }
    }
    
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }
    
    // Return public doctor data
    const doctorData = {
      id: doctor._id,
      name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      specialization: doctor.specialization,
      experience: doctor.experience,
      avatar: doctor.avatar || '/icons/user-placeholder.png',
      rating: doctor.rating?.average || 0,
      reviewCount: doctor.rating?.count || 0,
      location: doctor.location,
      consultationFee: doctor.consultationFee,
      clinicName: doctor.clinicName,
      clinicAddress: doctor.clinicAddress,
      bio: doctor.bio,
      qualification: doctor.qualification,
      services: doctor.services || [],
      awards: doctor.awards || [],
      gallery: doctor.gallery || [],
      weeklyAvailability: doctor.weeklyAvailability || {},
      isVerified: doctor.isProfileVerified && doctor.isDocumentsVerified,
      clinicCoordinates: doctor.clinicCoordinates || { latitude: null, longitude: null },
      language: doctor.language,
      slug: doctor.slug || doctorSlug,
      publicUrl: doctor.getPublicUrl ? doctor.getPublicUrl() : `/doctors/${doctor.location.toLowerCase().replace(/\s+/g, '-')}/${doctor.slug || doctorSlug}`,
      phone : doctor.phone,
      email : doctor.email
    };
    
    return NextResponse.json({
      success: true,
      doctor: doctorData
    });
    
  } catch (error) {
    console.error('Public doctor profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch doctor profile. Please try again.' },
      { status: 500 }
    );
  }
}
