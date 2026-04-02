import Donation from '../models/Donation.js';
import NGO from '../models/NGO.js';
import logger from '../config/logger.js';
import { buildUpiPayUri, qrDataUrlForUpi } from '../utils/upi.js';

export const getDonationMethods = async (req, res) => {
  try {
    const hasUpi = !!(process.env.PLATFORM_UPI_ID && String(process.env.PLATFORM_UPI_ID).includes('@'));
    const hasStripe = !!(process.env.STRIPE_SECRET_KEY && !String(process.env.STRIPE_SECRET_KEY).includes('mock'));
    res.status(200).json({
      success: true,
      data: { upi: hasUpi, stripe: hasStripe },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a pending UPI donation and return an intent URL + QR (opens GPay / PhonePe / Paytm).
 * Uses NGO.upiId when set, otherwise PLATFORM_UPI_ID.
 */
export const createUpiDonation = async (req, res) => {
  try {
    const { amount, donorPhone, donorName, ngoId } = req.body;

    if (!amount || amount < 1 || !donorPhone || !ngoId) {
      return res.status(400).json({
        success: false,
        message: 'Amount (≥ ₹1), donorPhone, and ngoId are required.',
      });
    }

    const ngo = await NGO.findById(ngoId).lean();
    if (!ngo) {
      return res.status(404).json({ success: false, message: 'NGO not found.' });
    }

    const platformPa = (process.env.PLATFORM_UPI_ID || '').trim();
    const pa = (ngo.upiId && String(ngo.upiId).trim()) || platformPa;
    if (!pa || !pa.includes('@')) {
      return res.status(400).json({
        success: false,
        message:
          'UPI is not configured. Set PLATFORM_UPI_ID in backend/.env (e.g. yourname@paytm) or add upiId on the NGO in the database.',
      });
    }

    const pn = (ngo.payeeName || ngo.name || process.env.PLATFORM_UPI_PAYEE_NAME || 'PawRescue').slice(0, 99);
    const referenceId = `PR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const tn = `Donate ${referenceId}`.slice(0, 99);

    const upiUri = buildUpiPayUri({
      pa,
      pn,
      am: Number(amount),
      tn,
    });

    await Donation.create({
      amount: Number(amount),
      donorPhone,
      donorName: donorName || 'Anonymous',
      ngoId,
      status: 'pending',
      transactionId: referenceId,
      paymentChannel: 'upi',
    });

    logger.info(`[UPI Donation] pending ref=${referenceId} amount=${amount} pa=${pa}`);

    res.status(200).json({
      success: true,
      message: 'Open your UPI app to complete payment. Then tap “I’ve paid”.',
      data: {
        referenceId,
        upiUri,
        qrDataUrl: qrDataUrlForUpi(upiUri),
        payeeName: pn,
        payeeVpa: pa,
        amount: Number(amount),
      },
    });
  } catch (error) {
    logger.error(`createUpiDonation: ${error.message}`);
    res.status(500).json({ success: false, message: 'Could not create UPI payment.' });
  }
};

/** Honor-system confirmation after user pays in UPI app (no bank webhook without Razorpay/etc.) */
export const confirmUpiDonation = async (req, res) => {
  try {
    const { referenceId } = req.body;
    if (!referenceId) {
      return res.status(400).json({ success: false, message: 'referenceId is required.' });
    }

    const donation = await Donation.findOne({ transactionId: referenceId, paymentChannel: 'upi' });
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation reference not found.' });
    }
    if (donation.status === 'completed') {
      return res.status(200).json({ success: true, message: 'Already recorded as paid.', data: donation });
    }

    donation.status = 'completed';
    await donation.save();
    logger.info(`[UPI Donation] confirmed ref=${referenceId}`);
    res.status(200).json({ success: true, message: 'Thank you — donation marked as received.', data: donation });
  } catch (error) {
    logger.error(`confirmUpiDonation: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Optional tip / support link (platform VPA) — e.g. after redeem */
export const createPlatformUpiLink = async (req, res) => {
  try {
    const pa = (process.env.PLATFORM_UPI_ID || '').trim();
    if (!pa || !pa.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'PLATFORM_UPI_ID is not set in backend/.env',
      });
    }
    const amount = Math.min(100000, Math.max(1, parseFloat(req.query.amount) || 1));
    const pn = (process.env.PLATFORM_UPI_PAYEE_NAME || 'PawRescue').slice(0, 99);
    const note = (req.query.note || `support-${Date.now()}`).slice(0, 99);
    const upiUri = buildUpiPayUri({ pa, pn, am: amount, tn: note });
    res.status(200).json({
      success: true,
      data: {
        upiUri,
        qrDataUrl: qrDataUrlForUpi(upiUri),
        amount,
        payeeName: pn,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const processDonation = async (req, res) => {
  try {
    const { amount, donorPhone, donorName, ngoId } = req.body;

    if (!amount || !donorPhone || !ngoId) {
      return res.status(400).json({ success: false, message: 'Missing required donation fields.' });
    }

    const mockTransactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await new Promise((resolve) => setTimeout(resolve, 800));

    const donation = await Donation.create({
      amount,
      donorPhone,
      donorName: donorName || 'Anonymous',
      ngoId,
      status: 'completed',
      transactionId: mockTransactionId,
      paymentChannel: 'mock',
    });

    logger.info(`Donation of ${amount} processed via mock gateway for NGO ${ngoId} by ${donorPhone}`);

    res.status(200).json({
      success: true,
      data: donation,
      message: 'Donation processed successfully',
    });
  } catch (error) {
    logger.error(`Donation processing error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Donation processing failed' });
  }
};
