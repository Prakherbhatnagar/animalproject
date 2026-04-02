import mongoose from 'mongoose';

const DonationSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  donorPhone: { type: String, required: true },
  donorName: { type: String, default: 'Anonymous' },
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  /** Client reference (shown in UPI note); unique enough for support lookup */
  transactionId: { type: String, required: true },
  paymentChannel: { type: String, enum: ['upi', 'stripe', 'mock'], default: 'upi' },
}, { timestamps: true });

DonationSchema.index({ donorPhone: 1 });
DonationSchema.index({ ngoId: 1 });

const Donation = mongoose.model('Donation', DonationSchema);
export default Donation;
