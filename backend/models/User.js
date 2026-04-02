import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Google login provides email
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // OTP login provides phone
      trim: true
    },
    role: {
      type: String,
      enum: ['reporter', 'admin', 'ngo_admin'],
      default: 'reporter'
    },
    tokens: {
      type: Number,
      default: 0
    },
    walletBalance: {
      type: Number,
      default: 0
    },
    walletAddress: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

UserSchema.index({ role: 1 });

const User = mongoose.model('User', UserSchema);
export default User;
