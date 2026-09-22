import express from 'express';
import { getSeasonBoxPrizes, openSeasonBox, setActiveFrame, setActiveNameEffect, setActiveProfileEffect } from '../controllers/seasonBoxController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/prizes', getSeasonBoxPrizes);
router.post('/open', authMiddleware, openSeasonBox);
router.put('/frame', authMiddleware, setActiveFrame);
router.put('/name-effect', authMiddleware, setActiveNameEffect);
router.put('/profile-effect', authMiddleware, setActiveProfileEffect);

export default router;
