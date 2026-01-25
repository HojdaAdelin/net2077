import express from 'express';
import { getTerminalQuestions, getUserTerminalProgress, submitTerminalCommand, seedTerminalData } from '../controllers/terminalController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getTerminalQuestions);
router.get('/progress', authMiddleware, getUserTerminalProgress);
router.post('/submit', authMiddleware, submitTerminalCommand);
router.post('/seed', seedTerminalData);

export default router;