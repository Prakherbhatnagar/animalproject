import mongoose from 'mongoose';

const OTPSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-deletes after 5 minutes
});

export default mongoose.model('OTP', OTPSchema);
