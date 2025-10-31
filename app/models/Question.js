import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  specialist: { type: String, required: true, trim: true },
  question: { type: String, required: true, trim: true, maxlength: 2000 },
  status: { type: String, enum: ['open', 'answered', 'closed'], default: 'open', index: true },
  reply: { type: String, trim: true },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  repliedAt: { type: Date }
}, { timestamps: true });

questionSchema.index({ createdAt: -1 });

export default mongoose.models.Question || mongoose.model('Question', questionSchema);