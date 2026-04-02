import express from 'express';
import { createReport, getReports, updateReportStatus, findMatches, updateReport, deleteReport } from '../controllers/report.controller.js';
import upload from '../middlewares/upload.js';
import validateRequest from '../middlewares/validate.middleware.js';
import { updateReportStatusSchema } from '../validators/report.validator.js';

const router = express.Router();

// Allow form-data upload for binary images OR basic JSON parsing
// Create Report - skipping strict validation here as it handles FormData (Multer modifies the body)
router.post('/', upload.single('image'), createReport);

// Retrieve all reports or subset via GeoSpatial Proximity
router.get('/', getReports);

// AI Matching for a specific report
router.get('/match', findMatches);

// Update status of a report 
router.patch('/:id/status', validateRequest(updateReportStatusSchema), updateReportStatus);

// Update and Delete a report (For reporters)
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);

export default router;
