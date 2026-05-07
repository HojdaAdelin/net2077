import express from 'express';
import { getUserProgress, getLevel, addSimulation, claimLevelRewards, checkPendingRewards, saveLinuxChapterStats } from '../controllers/progressController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/user', authMiddleware, getUserProgress);
router.get('/level', authMiddleware, getLevel);
router.post('/addSimulation', authMiddleware, addSimulation);
router.post('/claim-rewards', authMiddleware, claimLevelRewards);
router.get('/pending-rewards', authMiddleware, checkPendingRewards);
router.post('/linux-chapter-stats', authMiddleware, saveLinuxChapterStats);

export default router;
