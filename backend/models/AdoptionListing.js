import mongoose from 'mongoose';

const AdoptionListingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    animalType: { type: String, required: true, trim: true },
    breed: { type: String, default: '', trim: true },
    age: { type: String, default: '', trim: true },
    location: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    vaccinated: { type: Boolean, default: false },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['available', 'adopted'],
      default: 'available',
    },
  },
  { timestamps: true }
);

AdoptionListingSchema.index({ status: 1 });

const AdoptionListing = mongoose.model('AdoptionListing', AdoptionListingSchema);
export default AdoptionListing;
