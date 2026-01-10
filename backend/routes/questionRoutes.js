import express from 'express';
import { getQuestions, getUnsolvedQuestions, getRandom50, markSolved, dailyLinux, getDailyChallengeStatus, completeDailyChallenge, resetBasicStats, dailyNetwork } from '../controllers/questionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getQuestions);
router.get('/unsolved', authMiddleware, getUnsolvedQuestions);
router.get('/random50', getRandom50);
router.get('/dailyLinux', dailyLinux);
router.get('/dailyNetwork', dailyNetwork);
router.get('/dailyChallengeStatus', authMiddleware, getDailyChallengeStatus);
router.post('/markSolved', authMiddleware, markSolved);
router.post('/examPoints', authMiddleware, markSolved);
router.post('/completeDailyChallenge', authMiddleware, completeDailyChallenge);
router.post('/resetBasicStats', authMiddleware, resetBasicStats);

export default router;
