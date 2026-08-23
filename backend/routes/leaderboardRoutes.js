import express from 'express';
import { getLeaderboard, getCategoryLeaderboard } from '../controllers/leaderboardController.js';

const router = express.Router();

router.get('/', getLeaderboard);
router.get('/category/:tag', getCategoryLeaderboard);

export default router;
