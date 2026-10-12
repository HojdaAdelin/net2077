import express from 'express';
import {
  getCompetitiveLeaderboard,
  triggerCompetitiveReset,
  getOldPeriodsCount,
  clearOldPeriods,
} from '../controllers/competitiveController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';

const router = express.Router();

router.get('/leaderboard', getCompetitiveLeaderboard);
router.post('/trigger-reset', authMiddleware, isRoot, triggerCompetitiveReset);
router.get('/old-periods', authMiddleware, isRoot, getOldPeriodsCount);
router.delete('/old-periods', authMiddleware, isRoot, clearOldPeriods);

export default router;
