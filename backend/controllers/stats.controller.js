import Report from '../models/Report.js';
import NGO from '../models/NGO.js';
import User from '../models/User.js';
import AdoptionListing from '../models/AdoptionListing.js';

export const getPublicStats = async (req, res) => {
  try {
    const [reportsTotal, rescuesCompleted, ngosCount, reportersCount, adoptionsListed] =
      await Promise.all([
        Report.countDocuments(),
        Report.countDocuments({ status: 'completed' }),
        NGO.countDocuments(),
        User.countDocuments({ role: 'reporter' }),
        AdoptionListing.countDocuments({ status: 'available' }),
      ]);

    res.status(200).json({
      success: true,
      data: {
        reportsTotal,
        rescuesCompleted,
        ngosCount,
        reportersCount,
        adoptionsListed,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
