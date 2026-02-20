import express from 'express';
import { createMatch, joinMatch, getMatch, submitAnswer, finishMatch, getAvailableMatches } from '../controllers/arenaController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create', authMiddleware, createMatch);
router.post('/join', authMiddleware, joinMatch);
router.get('/available', authMiddleware, getAvailableMatches);
router.get('/:matchId', authMiddleware, getMatch);
router.post('/answer', authMiddleware, submitAnswer);
router.post('/finish', authMiddleware, finishMatch);

export default router;
