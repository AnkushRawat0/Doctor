import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  // Blog heading/title
  heading: {
    type: String,
    required: [true, 'Blog heading is required'],
    trim: true,
    index: true
  },
  
  // Auto-generated slug from heading
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  // Blog description
  description: {
    type: String,
    required: [true, 'Blog description is required'],
    trim: true
  },
  
  // Images array
  images: [{
    type: String,
    required: true
  }],
  
  // Author information
  author: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Author is required'],
    ref: 'Doctor', // You can change this to 'User' if you have a general User model
    index: true
  }
  
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for search functionality
blogSchema.index({ heading: 'text', description: 'text' });

// Middleware to generate slug from heading
blogSchema.pre('save', function(next) {
  if (this.isModified('heading') || this.isNew) {
    this.slug = this.heading
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

export default mongoose.models.Blog || mongoose.model('Blog', blogSchema);