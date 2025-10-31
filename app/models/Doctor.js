import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({

  isAdminVerified: {
    type: Boolean,
    default: false
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  suspensionReason: {
    type: String,
    default: ''
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  // Basic Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Profile Image
  avatar: {
    type: String,
    default: '/icons/user-placeholder.png'
  },
  avatarPublicId: {
    type: String,
    default: null
  },
  
  // Verification Status
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  
  // Professional Information
  specialization: {
    type: String,
    required: true,
    trim: true
  },
  qualification: {
    type: String,
    required: true,
    trim: true
  },
  experience: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Awards (Multiple entries)
  awards: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: Number,
      required: true
    },
    organization: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  }],
  
  // Services (Multiple entries)
  services: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      min: 0
    },
    duration: {
      type: Number, // in minutes
      min: 0
    }
  }],
  
  // Past Experiences (Multiple entries)
  pastExperiences: [{
    position: {
      type: String,
      required: true,
      trim: true
    },
    organization: {
      type: String,
      required: true,
      trim: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date
    },
    current: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      trim: true
    }
  }],
  
  // Practice Information
  clinicName: {
    type: String,
    required: true,
    trim: true
  },
  clinicAddress: {
    type: String,
    required: true,
    trim: true
  },
  clinicCoordinates: {
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    }
  },
  consultationFee: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Weekly Availability
  weeklyAvailability: {
    monday: {
      available: { type: Boolean, default: true },
      timeSlots: [{
        startTime: String, // Format: "09:00 AM"
        endTime: String,   // Format: "05:00 PM"
      }]
    },
    tuesday: {
      available: { type: Boolean, default: true },
      timeSlots: [{
        startTime: String,
        endTime: String,
      }]
    },
    wednesday: {
      available: { type: Boolean, default: true },
      timeSlots: [{
        startTime: String,
        endTime: String,
      }]
    },
    thursday: {
      available: { type: Boolean, default: true },
      timeSlots: [{
        startTime: String,
        endTime: String,
      }]
    },
    friday: {
      available: { type: Boolean, default: true },
      timeSlots: [{
        startTime: String,
        endTime: String,
      }]
    },
    saturday: {
      available: { type: Boolean, default: true },
      timeSlots: [{
        startTime: String,
        endTime: String,
      }]
    },
    sunday: {
      available: { type: Boolean, default: false },
      timeSlots: [{
        startTime: String,
        endTime: String,
      }]
    }
  },
  
  // Professional Documents (as images)
  documents: [{
    type: {
      type: String,
      enum: ['license', 'degree', 'certificate', 'id_proof', 'other'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Gallery Images
  gallery: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      trim: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Verification Status
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isProfileVerified: {
    type: Boolean,
    default: false
  },
  isDocumentsVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Ratings and Reviews
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  
  // Location
  location: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  
  // Language
  language: {
    type: String,
    required: true,
    default: 'English',
    enum: ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Gujarati', 'Marathi']
  },
  
  // Bio
  bio: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  // Last login
  lastLogin: {
    type: Date
  },
  
  // SEO-friendly slug for public URLs
  slug: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
doctorSchema.index({ email: 1 });
doctorSchema.index({ phone: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ location: 1 });
doctorSchema.index({ isActive: 1, isProfileVerified: 1 });

// Virtual for full name
doctorSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to get doctor summary
doctorSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.fullName,
    specialization: this.specialization,
    experience: this.experience,
    rating: this.rating,
    location: this.location,
    consultationFee: this.consultationFee,
    avatar: this.avatar,
    isVerified: this.isProfileVerified && this.isDocumentsVerified
  };
};

// Method to add document
doctorSchema.methods.addDocument = function(type, name, url, publicId) {
  this.documents.push({
    type,
    name,
    url,
    publicId
  });
  return this.save();
};

// Method to add gallery image
doctorSchema.methods.addGalleryImage = function(url, publicId, caption = '') {
  this.gallery.push({
    url,
    publicId,
    caption
  });
  return this.save();
};

// Method to remove document
doctorSchema.methods.removeDocument = function(publicId) {
  this.documents = this.documents.filter(doc => doc.publicId !== publicId);
  return this.save();
};

// Method to remove gallery image
doctorSchema.methods.removeGalleryImage = function(publicId) {
  this.gallery = this.gallery.filter(img => img.publicId !== publicId);
  return this.save();
};

// Method to generate SEO-friendly slug
doctorSchema.methods.generateSlug = function() {
  const name = `${this.firstName}-${this.lastName}`.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim('-'); // Remove leading/trailing hyphens
  
  const specialization = this.specialization.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
  
  return `${name}-${specialization}`;
};


doctorSchema.methods.getPublicUrl = function() {
  const location = this.location.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
  
  return `/doctors/${location}/${this.slug}`;
};

// Static method to find doctor by slug
doctorSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, isActive: true });
};

// Pre-save middleware to generate slug
doctorSchema.pre('save', function(next) {
  if (!this.slug && this.firstName && this.lastName && this.specialization) {
    this.slug = this.generateSlug();
  }
  next();
});

export default mongoose.models.Doctor || mongoose.model('Doctor', doctorSchema);