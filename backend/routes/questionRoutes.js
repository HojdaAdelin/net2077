import express from 'express';
import { getQuestions, getUnsolvedQuestions, getRandom50, markSolved } from '../controllers/questionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getQuestions);
router.get('/unsolved', authMiddleware, getUnsolvedQuestions);
router.get('/random50', getRandom50);
router.post('/markSolved', authMiddleware, markSolved);

export default router;
