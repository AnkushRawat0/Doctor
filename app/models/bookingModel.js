import mongoose from 'mongoose';

const { Schema } = mongoose;

const bookingSchema = new Schema(
	{
		doctor: {
			type: Schema.Types.ObjectId,
			ref: 'Doctor',
			required: true,
			index: true,
		},
		patient: {
			type: Schema.Types.ObjectId,
			ref: 'Patient',
			required: true,
			index: true,
		},
		// The calendar date (at 00:00:00) for quick filtering; redundant but useful
		date: {
			type: Date,
			required: true,
			index: true,
		},
		// Exact start and end of the booked slot
		slotStart: {
			type: Date,
			required: true,
			index: true,
		},
		slotEnd: {
			type: Date,
			required: true,
		},
		bookingType: {
			type: String,
			enum: ['walk-in', 'video', 'clinic', 'home-visit', 'other'],
			default: 'walk-in',
			index: true,
		},
		visitType: {
			type: String,
			enum: ['first-time', 'follow-up'],
			required: true,
		},
		status: {
			type: String,
			enum: ['pending', 'booked', 'cancelled', 'completed', 'rejected'],
			default: 'pending',
			index: true,
		},
		notes: {
			type: String,
			trim: true,
			maxlength: 1000,
		},
			// Booking target
			bookingFor: {
				type: String,
				enum: ['myself', 'someone-else'],
				default: 'myself',
			},
			// Guest patient details when booking for someone else
			guestPatient: {
				name: { type: String, trim: true },
				email: { type: String, trim: true },
				phone: { type: String, trim: true },
				gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
				dob: { type: Date },
				address: { type: String, trim: true },
				postalCode: { type: String, trim: true },
				city: { type: String, trim: true },
			},
			// Email used for confirmation (guest or patient)
			notifyEmail: { type: String, trim: true },
		// Home Visit details (required when bookingType = 'home-visit')
		homeVisitAddress: {
			line1: { type: String, trim: true },
			line2: { type: String, trim: true },
			city: { type: String, trim: true },
			postalCode: { type: String, trim: true },
			landmark: { type: String, trim: true },
			fullText: { type: String, trim: true },
		},
		// Audit fields
		createdBy: {
			type: String, // 'patient' | 'admin' | 'system'
			default: 'patient',
		},
	},
	{ timestamps: true }
);

// Prevent double booking: one booking per doctor per slot start (non-cancelled )
bookingSchema.index({ doctor: 1, slotStart: 1 }, { unique: true });

// Convenience virtuals
bookingSchema.virtual('durationMinutes').get(function () {
	return Math.round((this.slotEnd - this.slotStart) / 60000);
});

// In dev with HMR, ensure schema updates are applied by removing old model if present
if (mongoose.models.Booking) {
  try { mongoose.deleteModel('Booking'); } catch (_) {}
}
export default mongoose.model('Booking', bookingSchema);