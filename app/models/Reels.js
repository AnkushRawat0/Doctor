import mongoose from 'mongoose';

const reelsSchema = new mongoose.Schema({
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
    maxlength: 1000
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
    enum: ['reel', 'short'],
    default: 'reel'
  },
  duration: {
    type: Number, // Duration in seconds
    required: true,
    min: 1,
    max: 300 // Max 5 minutes
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
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
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

// Create indexes
reelsSchema.index({ location: 1, category: 1, isActive: 1 });
reelsSchema.index({ isFeatured: 1, publishedAt: -1 });
reelsSchema.index({ slug: 1 });
reelsSchema.index({ tags: 1 });

// Generate slug before saving
reelsSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Virtual for formatted duration
reelsSchema.virtual('formattedDuration').get(function() {
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual for engagement rate
reelsSchema.virtual('engagementRate').get(function() {
  if (this.viewCount === 0) return 0;
  return ((this.likeCount + this.shareCount) / this.viewCount * 100).toFixed(2);
});

export default mongoose.models.Reels || mongoose.model('Reels', reelsSchema);