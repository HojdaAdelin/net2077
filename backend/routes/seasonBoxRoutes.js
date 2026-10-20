import express from 'express';
import { isRoot } from '../middleware/checkRole.js';
import { getSeasonBoxPrizes, openSeasonBox, setActiveFrame, setActiveNameEffect, setActiveProfileEffect, getRecentRareDrops, getSeasonBoxConfig, saveSeasonBoxConfig } from '../controllers/seasonBoxController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/config', authMiddleware, isRoot, getSeasonBoxConfig);
router.put('/config', authMiddleware, isRoot, saveSeasonBoxConfig);

router.get('/prizes', getSeasonBoxPrizes);
router.get('/recent-rare', getRecentRareDrops);
router.post('/open', authMiddleware, openSeasonBox);
router.put('/frame', authMiddleware, setActiveFrame);
router.put('/name-effect', authMiddleware, setActiveNameEffect);
router.put('/profile-effect', authMiddleware, setActiveProfileEffect);

export default router;
