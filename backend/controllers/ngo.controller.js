import NGO from '../models/NGO.js';
import logger from '../config/logger.js';

export const getNearbyNGOs = async (req, res) => {
  try {
    const { lat, lng, radiusInKm = 50 } = req.query;

    if (!lat || !lng) {
      // Return all if no coordinates
      let ngos = await NGO.find({});
      if (ngos.length === 0) {
        ngos = await seedInitialNGOs();
      }
      return res.status(200).json({ success: true, data: ngos });
    }

    const radiusInMeters = parseFloat(radiusInKm) * 1000;
    
    // Using MongoDB geospatial $near query
    let ngos = await NGO.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radiusInMeters
        }
      }
    });

    if (ngos.length === 0) {
      // Seeding in case DB is perfectly empty 
      const existing = await NGO.countDocuments();
      if (existing === 0) {
        await seedInitialNGOs();
        // Return seeded data immediately
        return getNearbyNGOs(req, res);
      }
    }

    res.status(200).json({ success: true, data: ngos });
  } catch (error) {
    logger.error(`Error fetching NGOs: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

async function seedInitialNGOs() {
  const platformUpi = (process.env.PLATFORM_UPI_ID || '').trim();
  const seeds = [
    { name: "Delhi Animal Rescue Trust", city: "New Delhi", rating: 4.8, rescues: 142, image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&q=80", verified: true, location: { type: 'Point', coordinates: [77.2090, 28.6139] }, upiId: platformUpi, payeeName: 'Delhi Animal Rescue Trust' },
    { name: "Paws & Claws Foundation", city: "New Delhi", rating: 4.6, rescues: 89, image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&q=80", verified: true, location: { type: 'Point', coordinates: [77.2150, 28.6250] }, upiId: platformUpi, payeeName: 'Paws & Claws Foundation' },
    { name: "Stray Help India", city: "New Delhi", rating: 4.9, rescues: 210, image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300&q=80", verified: true, location: { type: 'Point', coordinates: [77.2300, 28.6000] }, upiId: platformUpi, payeeName: 'Stray Help India' }
  ];
  return await NGO.insertMany(seeds);
}
