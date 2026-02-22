import express from 'express';
import { createMatch, joinMatch, getMatch, submitAnswer, finishMatch, getAvailableMatches, cancelMatch, getMyWaitingMatch } from '../controllers/arenaController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create', authMiddleware, createMatch);
router.post('/join', authMiddleware, joinMatch);
router.post('/cancel', authMiddleware, cancelMatch);
router.get('/available', authMiddleware, getAvailableMatches);
router.get('/my-waiting', authMiddleware, getMyWaitingMatch);
router.get('/:matchId', authMiddleware, getMatch);
router.post('/answer', authMiddleware, submitAnswer);
router.post('/finish', authMiddleware, finishMatch);

export default router;
