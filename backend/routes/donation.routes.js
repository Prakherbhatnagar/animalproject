import express from 'express';
import {
  processDonation,
  getDonationMethods,
  createUpiDonation,
  confirmUpiDonation,
  createPlatformUpiLink,
} from '../controllers/donation.controller.js';
import { createCheckoutSession } from '../controllers/stripe.controller.js';

const router = express.Router();

router.get('/methods', getDonationMethods);
router.get('/platform-upi', createPlatformUpiLink);
router.post('/process', processDonation);
router.post('/upi', createUpiDonation);
router.post('/upi/confirm', confirmUpiDonation);
router.post('/checkout', createCheckoutSession);

export default router;
