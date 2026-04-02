import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema(
  {
    originalId: {
      type: String,
      unique: true, // E.g. RPT-XYZ
      required: true
    },
    animalType: {
      type: String,
      required: true
    },
    animalCondition: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true,
      minlength: 10
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    imageDataUrl: {
      type: String, // Could be base64 or cloudinary URL
      required: true
    },
    imageHash: {
      type: String,
      unique: true, // Prevents duplicates! Check DB logic on duplicate
      sparse: true,
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true
      },
      coordinates: {
        type: [Number],
        required: true // [longitude, latitude]
      },
      address: {
        type: String,
        required: true
      }
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'fake'],
      default: 'pending'
    },
    treatedImageUrl: {
      type: String,
      default: null,
    },
    reporterName: {
      type: String,
      required: true
    },
    reporterPhone: {
      type: String
    },
    reporterEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isFlagged: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Geo-Spatial Index configuration
ReportSchema.index({ location: '2dsphere' });
// Status and Phone indexing for faster queries
ReportSchema.index({ status: 1 });
ReportSchema.index({ reporterPhone: 1 });

const Report = mongoose.model('Report', ReportSchema);
export default Report;
