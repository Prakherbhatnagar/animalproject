import Report from '../models/Report.js';
import { hashImageBuffer } from '../utils/hash.js';
import cloudinary from '../config/cloudinary.js';
import logger from '../config/logger.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { serializeReport, serializeReports } from '../utils/serializeReport.js';
import { resolveReporterUser } from '../utils/resolveReporterUser.js';
import mongoose from 'mongoose';

export const createReport = async (req, res) => {
  try {
    let payloadStr = req.body.payload;
    let payload = {};

    // For clients sending JSON payload + Multer field, usually they send FormData
    if (payloadStr) {
      payload = JSON.parse(payloadStr);
    } else {
      payload = req.body;
    }

    // Hash Logic
    let imageHashComputed = payload.imageHash; // Client fallback

    // Overwrite if server receives file via Multer
    if (req.file) {
      imageHashComputed = hashImageBuffer(req.file.buffer);
    } else if (payload.imageDataUrl) {
      // If client sent base64 directly instead of multer
      const base64Data = payload.imageDataUrl;
      const base64Image = base64Data.split(';base64,').pop();
      const buffer = Buffer.from(base64Image, 'base64');
      imageHashComputed = hashImageBuffer(buffer);
    }

    if (!imageHashComputed) {
      return res.status(400).json({ message: 'Image is required to create a report.' });
    }

    // Duplicate Check
    const existing = await Report.findOne({ imageHash: imageHashComputed });
    if (existing) {
      return res.status(409).json({ message: 'Duplicate Image Detected. This animal report already exists.' });
    }

    // Upload to cloudinary logic
    let storedImageUrl = payload.imageDataUrl || "https://placeholder.cloud/image.jpg";
    try {
      if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        const uploadRes = await cloudinary.uploader.upload(dataURI, { folder: 'animal_rescues' });
        storedImageUrl = uploadRes.secure_url;
      } else if (payload.imageDataUrl && payload.imageDataUrl.startsWith('data:image')) {
        const uploadRes = await cloudinary.uploader.upload(payload.imageDataUrl, { folder: 'animal_rescues' });
        storedImageUrl = uploadRes.secure_url;
      }
    } catch (uploadErr) {
      logger.error(`[Cloudinary Upload Error] ${uploadErr.message}`);
      // In production, you might want to return an explicit 500 error here.
      // But for testing if you haven't put your keys yet, it gracefully falls back to the previous logic.
    }

    const newReportData = {
      originalId: payload.id || `RPT-${Date.now().toString(36).toUpperCase()}`,
      animalType: payload.animalType,
      animalCondition: payload.animalCondition,
      description: payload.description,
      priority: payload.priority || 'medium',
      imageDataUrl: storedImageUrl,
      imageHash: imageHashComputed,
      location: {
        type: 'Point',
        coordinates: [payload.location.lng, payload.location.lat],
        address: payload.location.address || 'Unknown address'
      },
      reporterName: payload.reporterName || 'Anonymous',
      reporterPhone: payload.reporterPhone,
    };

    if (payload.reporterId && mongoose.Types.ObjectId.isValid(payload.reporterId)) {
      newReportData.reporterId = payload.reporterId;
    }
    if (payload.reporterEmail && String(payload.reporterEmail).trim()) {
      newReportData.reporterEmail = String(payload.reporterEmail).trim().toLowerCase();
    }

    const newReport = await Report.create(newReportData);

    // Dispatch WebSocket Event
    const io = req.app.get('socketio');
    if (io) {
      io.emit('new_report', serializeReport(newReport));
    }

    res.status(201).json(serializeReport(newReport));
  } catch (error) {
    if (error.code === 11000) {
       return res.status(409).json({ message: 'Duplicate report detected constraint', error });
    }
    logger.error(`[Create Report Error] ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getReports = async (req, res) => {
  try {
    const { lat, lng, radiusInKm } = req.query;

    if (lat && lng && radiusInKm) {
      // GeoSpatial query using 2dsphere
      const radiusInMeters = parseFloat(radiusInKm) * 1000;
      const reports = await Report.find({
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
      return res.status(200).json(serializeReports(reports));
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    // Default fetch all with pagination
    const reports = await Report.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.status(200).json(serializeReports(reports));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateReportStatus = async (req, res) => {
   try {
     const { id } = req.params;
     const { status, treatedImageDataUrl } = req.body;

     let existing = await Report.findById(id);
     if (!existing) {
       existing = await Report.findOne({ originalId: id });
     }
     if (!existing) return res.status(404).json({ message: 'Report not found' });

     const updatePayload = { status };
     if (status === 'fake') updatePayload.isFlagged = true;
     else updatePayload.isFlagged = false;

     if (status === 'completed' && treatedImageDataUrl) {
       try {
         const uploadRes = await cloudinary.uploader.upload(treatedImageDataUrl, { folder: 'animal_rescues_treated' });
         updatePayload.treatedImageUrl = uploadRes.secure_url;
       } catch (err) {
         logger.error(`Cloudinary treatment image upload error: ${err.message}`);
       }
     }

     const report = await Report.findByIdAndUpdate(existing._id, updatePayload, { new: true });
     if (!report) return res.status(404).json({ message: 'Report not found' });
     
     // ── Reward Logic (coins for reporter when NGO accepts / completes) ──
     if (status === 'accepted' || status === 'completed') {
       try {
         const reporter = await resolveReporterUser(report);
         if (!reporter) {
           logger.warn(
             `[Rewards] No user linked for report ${id} (reporterId/reporterPhone/reporterEmail missing or no match). Skipping coins.`
           );
         } else {
           const reason = status === 'accepted' ? 'report_accepted' : 'report_completed';
           const amount = status === 'accepted' ? 10 : 50;
           const reportKey = report.originalId || report._id.toString();

           await Transaction.create({
             userId: reporter._id,
             reportId: reportKey,
             amount,
             reason,
           });
           await User.findByIdAndUpdate(reporter._id, { $inc: { tokens: amount } });
           logger.info(`Rewarded ${amount} coins to user ${reporter._id} for report ${reportKey} (${reason})`);
         }
       } catch (rewardErr) {
         if (rewardErr.code === 11000) {
           logger.info(`Duplicate reward prevented for report ${id} - ${status}`);
         } else {
           logger.error(`Failed to process reward: ${rewardErr.message}`);
         }
       }
     }

     // Realtime broadcast of the status modification
     const io = req.app.get('socketio');
     if (io) {
       const s = serializeReport(report);
       io.emit('status_update', {
         id: s.id,
         status,
         treatedImageUrl: s.treatedImageUrl,
       });
     }

     res.status(200).json(serializeReport(report));
   } catch (error) {
     res.status(500).json({ message: 'Server error', error: error.message });
   }
};

export const findMatches = async (req, res) => {
  try {
    const { reportId } = req.query;
    if (!reportId) {
      return res.status(400).json({ message: 'reportId is required to find matches.' });
    }

    const sourceReport = await Report.findOne({ originalId: reportId }) || await Report.findById(reportId).catch(() => null);
    
    if (!sourceReport) {
      return res.status(404).json({ message: 'Source report not found.' });
    }

    // Attempting to match 'lost' with 'found' or vice-versa
    // Using simple vector-like heuristic parameters since true LLM vectorization is bypassed
    const inverseStatus = sourceReport.status === 'lost' ? 'found' : 'lost'; 
    // Wait, the schema uses statuses: ['pending', 'in_progress', 'completed', 'fake', 'accepted'].
    // 'lost' and 'found' might not be in "status" - they are probably distinct fields or in the description.
    // Let's match by animalType, and proximity.

    const matches = await Report.find({
      _id: { $ne: sourceReport._id },
      animalType: sourceReport.animalType, // Exact match on species
      location: {
        $near: {
          $geometry: sourceReport.location,
          $maxDistance: 20000 // 20 km radius
        }
      }
    }).limit(10);

    // If matches have the EXACT SAME imageHash, we can flag them as identical!
    const scoredMatches = matches
      .map((match) => {
        let confidence = 0;
        if (match.imageHash === sourceReport.imageHash) confidence += 85;
        if (match.reporterPhone === sourceReport.reporterPhone) confidence -= 50;

        const base = serializeReport(match);
        return {
          ...base,
          aiConfidence: Math.max(0, Math.min(100, 60 + confidence)),
        };
      })
      .sort((a, b) => b.aiConfidence - a.aiConfidence);

    res.status(200).json({ success: true, aiMatches: scoredMatches });
  } catch (error) {
    logger.error(`AI Matching Error: ${error.message}`);
    res.status(500).json({ message: 'Error running AI Match logic' });
  }
};

export const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if image update
    if (updateData.imageDataUrl && updateData.imageDataUrl.startsWith('data:image')) {
      const uploadRes = await cloudinary.uploader.upload(updateData.imageDataUrl, { folder: 'animal_rescues' });
      updateData.imageDataUrl = uploadRes.secure_url;
      updateData.imageHash = hashImageBuffer(Buffer.from(updateData.imageDataUrl.split(';base64,').pop(), 'base64'));
    }

    const report = await Report.findByIdAndUpdate(id, updateData, { new: true });
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const io = req.app.get('socketio');
    if (io) {
      const s = serializeReport(report);
      io.emit('status_update', { id: s.id, status: report.status, treatedImageUrl: s.treatedImageUrl });
    }

    res.status(200).json(serializeReport(report));
  } catch (error) {
    logger.error(`Update Report Error: ${error.message}`);
    res.status(500).json({ message: 'Failed to update report' });
  }
};

export const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findByIdAndDelete(id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    
    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    logger.error(`Delete Report Error: ${error.message}`);
    res.status(500).json({ message: 'Failed to delete report' });
  }
};
