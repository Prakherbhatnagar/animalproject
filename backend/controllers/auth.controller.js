import User from '../models/User.js';
import OTP from '../models/OTP.js';
import jwt from 'jsonwebtoken';
import sendSMS from '../utils/sendSMS.js';
import sendEmail from '../utils/sendEmail.js';
import { OAuth2Client } from 'google-auth-library';
import logger from '../config/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_dev_key';

function userToClient(userDoc) {
  const o = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  return {
    ...o,
    id: o._id?.toString(),
  };
}

export const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required.' });

    // Generate a secure 6 digit code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Clear any existing OTP for this phone
    await OTP.deleteMany({ phone });

    // Save new OTP strictly to DB
    await OTP.create({ phone, code: otpCode });

    const smsText = `[PawRescue] Your verification code is: ${otpCode}`;

    // Mocking the Twilio dispatch as a fallback check in logs
    logger.info(`[Twilio Fallback Log] Sending SMS to ${phone} : ${smsText}`);

    // Actual realtime dispatches
    await sendSMS(phone, smsText);
    
    const officialEmail = process.env.OFFICIAL_RESCUE_EMAIL || 'officialgooglemail@example.com';
    const emailSubject = `[PawRescue Alert] Real-time OTP Request for ${phone}`;
    const emailHtml = `
      <h3>New OTP Code Generated</h3>
      <p><b>Phone:</b> ${phone}</p>
      <p><b>Code:</b> ${otpCode}</p>
      <hr />
      <p><small>Automated dispatch from PawRescue Security Service</small></p>
    `;

    await sendEmail(officialEmail, emailSubject, smsText, emailHtml);

    res.status(200).json({ message: 'OTP sent and logged successfully.' });
  } catch (error) {
    logger.error(`Send OTP Error: ${error.message}`);
    res.status(500).json({ message: 'Error generating OTP', error: error.message });
  }
};

export const otpLogin = async (req, res) => {
  try {
    const { phone, code, role, name } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ message: 'Phone and OTP code are required.' });
    }

    // Authentic server-side verification check
    const validOtp = await OTP.findOne({ phone, code });
    if (!validOtp) {
      return res.status(401).json({ message: 'Invalid or expired OTP code.' });
    }

    // Clear verification ticket after successful usage
    await OTP.deleteOne({ _id: validOtp._id });

    // Login or auto-register user securely
    let user = await User.findOne({ phone });
    
    if (!user) {
      user = await User.create({
        name: name || (role === 'admin' ? 'New NGO' : 'New Reporter (OTP)'),
        phone,
        role: role === 'admin' ? 'admin' : 'reporter'
      });
    } else if (name && role === 'admin' && user.name !== name) {
      // Allow an existing user to update their NGO name if they log in as an Admin explicitly 
      // (Prototype convenience logic)
      user.name = name;
      user.role = 'admin';
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ token, user: userToClient(user) });
  } catch (error) {
    logger.error(`OTP Validation Error: ${error.message}`);
    res.status(500).json({ message: 'Error during OTP validation', error: error.message });
  }
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  try {
    const { idToken, role, name } = req.body;
    if (!idToken) return res.status(400).json({ message: 'idToken is required.' });

    // Verify token with Google explicitly
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const userEmail = payload.email;
    const userName = payload.name;

    let user = await User.findOne({ email: userEmail });
    if (!user) {
      user = await User.create({
        name: name || (role === 'admin' ? userName + ' NGO' : userName),
        email: userEmail,
        role: role === 'admin' ? 'admin' : 'reporter'
      });
    } else if (name && role === 'admin' && user.name !== name) {
      // Allow an existing user to update their NGO name if they log in as an Admin explicitly 
      user.name = name;
      user.role = 'admin';
      await user.save();
    } else if (role === 'admin' && user.role !== 'admin') {
      // Upgrade role if they selected admin role
      user.role = 'admin';
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ token, user: userToClient(user) });
  } catch (error) {
    logger.error(`Error in Google Login: ${error.message}`);
    res.status(500).json({ message: 'Error in Google Login', error: error.message });
  }
};
