import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: false
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  patientName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  doctorResponse: {
    type: String,
    trim: true,
    maxlength: 500
  },
  responseDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
reviewSchema.index({ doctorId: 1 });
reviewSchema.index({ createdAt: -1 });
// Note: Removed unique constraint on doctorId + patientId since patientId can be null for anonymous reviews

// Static method to check if patient can review
reviewSchema.statics.canPatientReview = async function(doctorId, patientId) {
  if (!patientId) {
    return { canReview: true, reason: 'Anonymous reviews allowed' };
  }
  
  const existingReview = await this.findOne({ doctorId, patientId });
  if (existingReview) {
    return { canReview: false, reason: 'You have already reviewed this doctor' };
  }
  
  return { canReview: true, reason: 'Can review' };
};

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;