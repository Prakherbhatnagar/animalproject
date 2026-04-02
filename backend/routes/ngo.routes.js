import express from 'express';
import { getNearbyNGOs } from '../controllers/ngo.controller.js';

const router = express.Router();

router.get('/nearby', getNearbyNGOs);

export default router;
