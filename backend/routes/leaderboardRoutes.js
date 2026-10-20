import express from 'express';
import { getLeaderboard, getCategoryLeaderboard, getMyLeaderboardPosition } from '../controllers/leaderboardController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getLeaderboard);
router.get('/me', authMiddleware, getMyLeaderboardPosition);
router.get('/category/:tag', getCategoryLeaderboard);

export default router;
