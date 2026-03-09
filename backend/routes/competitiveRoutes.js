import express from 'express';
import { getCompetitiveLeaderboard } from '../controllers/competitiveController.js';

const router = express.Router();

router.get('/leaderboard', getCompetitiveLeaderboard);

export default router;
