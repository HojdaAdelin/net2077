import express from 'express';
import {
  createSeasonPass,
  updateSeasonPass,
  listSeasonPasses,
  deleteSeasonPass,
  getActivePass,
  collectReward,
  buyPremium,
  addTestXP,
} from '../controllers/seasonPassController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';
import { verifyAuthSession } from '../utils/authSession.js';

// Optional auth — sets req.userId if token present, never blocks
const optionalAuth = async (req, res, next) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      const decoded = await verifyAuthSession(token);
      req.userId = decoded.userId;
    } catch { /* ignore */ }
  }
  next();
};

const router = express.Router();

// Public (optionally auth for user progress)
router.get('/active', optionalAuth, getActivePass);
router.post('/collect', authMiddleware, collectReward);
router.post('/buy-premium', authMiddleware, buyPremium);

// Root-only admin
router.get('/', authMiddleware, isRoot, listSeasonPasses);
router.post('/', authMiddleware, isRoot, createSeasonPass);
router.put('/:id', authMiddleware, isRoot, updateSeasonPass);
router.delete('/:id', authMiddleware, isRoot, deleteSeasonPass);
router.post('/test-xp', authMiddleware, isRoot, addTestXP);

export default router;
