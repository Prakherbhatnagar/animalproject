import AdoptionListing from '../models/AdoptionListing.js';
import logger from '../config/logger.js';

async function seedIfEmpty() {
  const count = await AdoptionListing.countDocuments({ status: 'available' });
  if (count > 0) return;

  const seeds = [
    {
      name: 'Bruno',
      animalType: 'Dog',
      breed: 'Labrador Mix',
      age: '2 years',
      location: 'Delhi',
      image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80',
      vaccinated: true,
      description: 'Friendly, good with kids.',
    },
    {
      name: 'Whiskers',
      animalType: 'Cat',
      breed: 'Persian Mix',
      age: '1 year',
      location: 'Mumbai',
      image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80',
      vaccinated: true,
    },
    {
      name: 'Max',
      animalType: 'Dog',
      breed: 'Indie',
      age: '3 years',
      location: 'Bangalore',
      image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=80',
      vaccinated: false,
    },
    {
      name: 'Luna',
      animalType: 'Cat',
      breed: 'Siamese Mix',
      age: '8 months',
      location: 'Chennai',
      image: 'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=400&q=80',
      vaccinated: true,
    },
  ];
  await AdoptionListing.insertMany(seeds);
  logger.info('[AdoptionListing] Seeded starter catalog');
}

export const listAvailable = async (req, res) => {
  try {
    await seedIfEmpty();
    const rows = await AdoptionListing.find({ status: 'available' })
      .sort({ createdAt: -1 })
      .lean();

    const data = rows.map((r) => ({
      id: String(r._id),
      name: r.name,
      type: r.animalType,
      breed: r.breed,
      age: r.age,
      location: r.location,
      image: r.image,
      vaccinated: r.vaccinated,
      description: r.description,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error(`Adoption list error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
