import express from 'express';
import { getTerminalQuestions, getUserTerminalProgress, submitTerminalCommand } from '../controllers/terminalController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getTerminalQuestions);
router.get('/progress', authMiddleware, getUserTerminalProgress);
router.post('/submit', authMiddleware, submitTerminalCommand);

export default router;