import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';

/** Public rules so the app can explain coins without duplicating magic numbers */
export const getRewardsInfo = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        reportAcceptedCoins: 10,
        reportCompletedCoins: 50,
        /** 1 Paw coin converts to this many rupees when claimed to wallet */
        rupeesPerCoin: 0.1,
        /** ₹1 in wallet needs this many coins (10 coins = ₹1) */
        coinsPerRupee: 10,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

async function findUserForRewards({ phone, email, userId }) {
  if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
    const byId = await User.findById(userId);
    if (byId) return byId;
  }
  if (phone) return User.findOne({ phone });
  if (email) return User.findOne({ email });
  return null;
}

export const getUserRewards = async (req, res) => {
  try {
    const { phone, email, userId } = req.query;
    if (!phone && !email && !userId) {
      return res.status(400).json({ message: 'userId, phone, or email is required to fetch rewards.' });
    }

    const user = await findUserForRewards({ phone, email, userId });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        totalCoins: user.tokens,
        walletBalance: user.walletBalance || 0,
        transactions,
      },
    });
  } catch (error) {
    logger.error(`Get Rewards Error: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const claimTokens = async (req, res) => {
  try {
    const { phone, email, userId, amountToClaim } = req.body;
    if ((!phone && !email && !userId) || !amountToClaim || amountToClaim <= 0) {
      return res.status(400).json({ message: 'Valid userId, phone or email, and amountToClaim, are required.' });
    }

    const user = await findUserForRewards({ phone, email, userId });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.tokens < amountToClaim) {
      return res.status(400).json({ message: 'Insufficient tokens to claim.' });
    }

    const conversionRate = 0.1;
    const moneyAdded = amountToClaim * conversionRate;

    user.tokens -= amountToClaim;
    user.walletBalance = (user.walletBalance || 0) + moneyAdded;
    await user.save();

    const ledgerReportId = `ledger:claim:${user._id}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
    await Transaction.create({
      userId: user._id,
      reportId: ledgerReportId,
      amount: -amountToClaim,
      reason: 'claimed_to_wallet',
    });

    res.status(200).json({
      success: true,
      message: `Successfully claimed ${amountToClaim} tokens for ₹${moneyAdded} in your wallet.`,
      data: {
        tokens: user.tokens,
        walletBalance: user.walletBalance,
      },
    });
  } catch (error) {
    logger.error(`Claim Tokens Error: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/** Spend coins on catalog items (badges, perks, etc.) — ledger entry only until fulfillment APIs exist */
export const redeemCatalogItem = async (req, res) => {
  try {
    const { phone, email, userId, cost, sku } = req.body;
    if ((!phone && !email && !userId) || cost == null || Number(cost) < 1 || !sku || typeof sku !== 'string') {
      return res.status(400).json({
        message: 'userId, phone or email, numeric cost ≥ 1, and sku string are required.',
      });
    }

    const amount = Number(cost);
    const user = await findUserForRewards({ phone, email, userId });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.tokens < amount) {
      return res.status(400).json({ message: 'Insufficient tokens to redeem this reward.' });
    }

    user.tokens -= amount;
    await user.save();

    const ledgerReportId = `ledger:redeem:${user._id}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
    await Transaction.create({
      userId: user._id,
      reportId: ledgerReportId,
      amount: -amount,
      reason: `redeem:${sku.slice(0, 64)}`,
    });

    res.status(200).json({
      success: true,
      message: 'Reward redeemed. Coins deducted.',
      data: { tokens: user.tokens },
    });
  } catch (error) {
    logger.error(`Redeem Error: ${error.message}`);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
