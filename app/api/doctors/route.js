import { NextResponse } from 'next/server';
import { connectDB } from '../../../lib/mongodb';
import Doctor from '../../../models/Doctor';

// Get all doctors (for search/listing)
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const specialization = searchParams.get('specialization');
    const location = searchParams.get('location');
    const search = searchParams.get('search');
    const minFee = searchParams.get('minFee');
    const maxFee = searchParams.get('maxFee');
    const sortBy = searchParams.get('sortBy') || 'experience';
    const limit = parseInt(searchParams.get('limit')) || 12;
    const page = parseInt(searchParams.get('page')) || 1;
    const skip = (page - 1) * limit;
  const genderParam = searchParams.get('gender');
    
    // Build query
    const query = { 
      isActive: true
      // isProfileVerified: true // Uncomment when you have verified doctors
    };
    
    // Specialization filter
    if (specialization) {
      query.specialization = { $regex: specialization, $options: 'i' };
    }
    if (genderParam) {
      // Support comma-separated genders and case-insensitive values
      const rawGenders = genderParam
        .split(',')
        .map(g => g.trim().toLowerCase())
        .map(g => (g === 'others' ? 'other' : g));

      const allowedGenders = ['male', 'female', 'other'];
      const genders = rawGenders.filter(g => allowedGenders.includes(g));

      if (genders.length === 1) {
        query.gender = genders[0];
      } else if (genders.length > 1) {
        query.gender = { $in: genders };
      }
      // If no valid genders remain after filtering, we don't add a gender filter
    }
    
    // Location filter - enhanced to handle city-state combinations and state searches
    if (location) {
      // Extract potential city names and state names
      const parts = location.split(/[-\s]+/);
      
      // Indian states for recognition
      const indianStates = [
        'jharkhand', 'maharashtra', 'karnataka', 'gujarat', 
        'rajasthan', 'bihar', 'odisha', 'punjab', 'haryana', 
        'kerala', 'telangana', 'assam', 'uttarakhand', 'goa',
        'delhi', 'chandigarh', 'tamil nadu', 'uttar pradesh', 
        'madhya pradesh', 'west bengal', 'andhra pradesh', 
        'himachal pradesh', 'jammu kashmir', 'arunachal pradesh'
      ];
      
      const locationPatterns = [];
      
      // Add the full location
      locationPatterns.push(location);
      
      // If it's a recognized state, search for doctors in that state
      if (indianStates.includes(location.toLowerCase().replace(/-/g, ' '))) {
        // State search - find all doctors in this state
        locationPatterns.push(location.replace(/-/g, ' '));
      } else {
        // City search patterns
        if (parts.length >= 2) {
          // Try different combinations for city-state patterns
          for (let i = 1; i <= parts.length; i++) {
            const cityCandidate = parts.slice(0, i).join(' ');
            const stateCandidate = parts.slice(i).join(' ');
            
            // If remaining parts form a state, use the city part
            if (stateCandidate && indianStates.includes(stateCandidate.toLowerCase())) {
              locationPatterns.push(cityCandidate);
              break;
            }
          }
        }
        
        // Add individual parts as potential matches
        parts.forEach(part => {
          if (part.length > 2) { // Only meaningful parts
            locationPatterns.push(part);
          }
        });
      }
      
      // Remove duplicates and empty values
      const uniquePatterns = [...new Set(locationPatterns)].filter(Boolean);
      
      // Create regex pattern
      query.location = { 
        $regex: uniquePatterns.map(pattern => 
          pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
        ).join('|'), 
        $options: 'i' 
      };
    }
    
    // Search filter (searches across name, specialization, and location)
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { clinicName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Price range filter
    if (minFee || maxFee) {
      query.consultationFee = {};
      if (minFee) query.consultationFee.$gte = parseInt(minFee);
      if (maxFee) query.consultationFee.$lte = parseInt(maxFee);
    }
    
    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'rating':
        sort = { 'rating.average': -1, experience: -1 };
        break;
      case 'fee':
        sort = { consultationFee: 1, experience: -1 };
        break;
      case 'name':
        sort = { firstName: 1, lastName: 1 };
        break;
      case 'experience':
      default:
        sort = { experience: -1, 'rating.average': -1 };
        break;
    }
    
    // Find doctors with public data only
    const doctors = await Doctor.find(query)
      .select('firstName lastName specialization experience avatar rating location consultationFee clinicName bio isProfileVerified isDocumentsVerified gender')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const total = await Doctor.countDocuments(query);
    
    const doctorList = doctors.map(doctor => {
      // Ensure all required fields exist
      const firstName = doctor.firstName || 'Unknown';
      const lastName = doctor.lastName || 'Doctor';
      const specialization = doctor.specialization || 'General';
      const location = doctor.location || 'Unknown';

      // Generate slug if it doesn't exist
      let slug = doctor.slug;
      if (!slug) {
        const name = `${firstName}-${lastName}`.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim('-');
        
        const spec = specialization.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim('-');
        
        slug = `${name}-${spec}`;
      }

      const locationSlug = location.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');

      return {
        id: doctor._id,
        name: `Dr. ${firstName} ${lastName}`,
        gender: doctor.gender || 'other',
        specialization: specialization,
        experience: doctor.experience || 0,
        avatar: doctor.avatar || '/icons/user-placeholder.png',
        rating: doctor.rating?.average || 0,
        reviewCount: doctor.rating?.count || 0,
        location: location,
        consultationFee: doctor.consultationFee || 0,
        clinicName: doctor.clinicName || '',
        bio: doctor.bio || '',
        isVerified: doctor.isProfileVerified && doctor.isDocumentsVerified,
        slug: slug,
        publicUrl: `/doctors/${locationSlug}/${slug}`
      };
    });
    
    return NextResponse.json({
      success: true,
      doctors: doctorList,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Doctors list fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch doctors. Please try again.' },
      { status: 500 }
    );
  }
}

