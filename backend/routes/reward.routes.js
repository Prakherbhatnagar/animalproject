import express from 'express';
import { getUserRewards, claimTokens, redeemCatalogItem, getRewardsInfo } from '../controllers/reward.controller.js';

const router = express.Router();

router.get('/info', getRewardsInfo);
router.get('/', getUserRewards);
router.post('/claim', claimTokens);
router.post('/redeem', redeemCatalogItem);

export default router;
