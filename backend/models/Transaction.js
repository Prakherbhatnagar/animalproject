import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportId: {
    type: String, // Refers to AnimalReport 'originalId'
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Prevent duplicate rewards for the same report and reason
TransactionSchema.index({ reportId: 1, reason: 1 }, { unique: true });

const Transaction = mongoose.model('Transaction', TransactionSchema);
export default Transaction;
