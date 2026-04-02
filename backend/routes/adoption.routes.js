import express from 'express';
import { listAvailable } from '../controllers/adoption.controller.js';

const router = express.Router();

router.get('/', listAvailable);

export default router;
