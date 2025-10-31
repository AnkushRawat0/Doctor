import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  iframeUrl: {
    type: String,
    required: true,
    trim: true
  },
  thumbnail: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  address: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  coordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  category: {
    type: String,
    required: true,
    enum: ['educational', 'medical-procedure', 'health-tips', 'wellness', 'patient-story', 'doctor-interview', 'hospital-tour', 'other'],
    default: 'educational'
  },
  duration: {
    type: Number, // Duration in seconds
    required: true,
    min: 1,
    max: 3600 // Max 1 hour
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  language: {
    type: String,
    default: 'English',
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  publishedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
videoSchema.index({ location: 1, category: 1, isActive: 1 });
videoSchema.index({ isFeatured: 1, publishedAt: -1 });
videoSchema.index({ slug: 1 });
videoSchema.index({ tags: 1 });
videoSchema.index({ coordinates: '2dsphere' }); // For geospatial queries
videoSchema.index({ difficulty: 1, category: 1 });
videoSchema.index({ author: 1, publishedAt: -1 });

// Generate slug before saving
videoSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Virtual for formatted duration
videoSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual for engagement rate
videoSchema.virtual('engagementRate').get(function() {
  if (this.viewCount === 0) return 0;
  return ((this.likeCount + this.shareCount + this.commentCount) / this.viewCount * 100).toFixed(2);
});

// Virtual for total interactions
videoSchema.virtual('totalInteractions').get(function() {
  return this.likeCount + this.shareCount + this.commentCount;
});

// Virtual for watch time estimation (assuming average completion rate)
videoSchema.virtual('estimatedWatchTime').get(function() {
  const avgCompletionRate = 0.7; // 70% average completion
  return Math.round(this.duration * avgCompletionRate);
});

export default mongoose.models.Video || mongoose.model('Video', videoSchema);