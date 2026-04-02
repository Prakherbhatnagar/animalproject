import mongoose from 'mongoose';

const NGOSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  /** UPI VPA for donations (e.g. trust@ybl). Falls back to PLATFORM_UPI_ID in env. */
  upiId: { type: String, trim: true, default: '' },
  /** Display name shown in UPI apps */
  payeeName: { type: String, trim: true, default: '' },
  rating: { type: Number, default: 0 },
  rescues: { type: Number, default: 0 },
  image: { type: String },
  verified: { type: Boolean, default: false },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  }
}, { timestamps: true });

NGOSchema.index({ location: '2dsphere' });

const NGO = mongoose.model('NGO', NGOSchema);
export default NGO;
