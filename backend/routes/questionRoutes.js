import express from 'express';
import { getQuestions, getQuestionById, getUnsolvedQuestions, getRandom50, markSolved, dailyLinux, getDailyChallengeStatus, completeDailyChallenge, resetBasicStats, dailyNetwork, resetLinuxStats, getLinuxOverviewTest, submitRandom50 } from '../controllers/questionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/unsolved', authMiddleware, getUnsolvedQuestions);
router.get('/random50', getRandom50);
router.get('/dailyLinux', dailyLinux);
router.get('/dailyNetwork', dailyNetwork);
router.get('/dailyChallengeStatus', authMiddleware, getDailyChallengeStatus);
router.get('/linux-overview-test', getLinuxOverviewTest);
router.post('/markSolved', authMiddleware, markSolved);
router.post('/examPoints', authMiddleware, markSolved);
router.post('/completeDailyChallenge', authMiddleware, completeDailyChallenge);
router.post('/resetBasicStats', authMiddleware, resetBasicStats);
router.post('/resetLinuxStats', authMiddleware, resetLinuxStats);
router.get('/', getQuestions);
router.get('/:id', getQuestionById);
router.post('/submitRandom50', authMiddleware, submitRandom50);

export default router;
