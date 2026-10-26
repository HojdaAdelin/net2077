import express from 'express';
import { getTerminalQuestions, getTerminalCategories, getUserTerminalProgress, submitTerminalCommand } from '../controllers/terminalController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';
import { getTerminalAdmin, createTerminalProblem, updateTerminalProblem, deleteTerminalProblem,
  createTerminalCategory, updateTerminalCategory, deleteTerminalCategory } from '../controllers/terminalAdminController.js';

const router = express.Router();

router.get('/admin', authMiddleware, isRoot, getTerminalAdmin);
router.post('/admin/problems', authMiddleware, isRoot, createTerminalProblem);
router.put('/admin/problems/:id', authMiddleware, isRoot, updateTerminalProblem);
router.delete('/admin/problems/:id', authMiddleware, isRoot, deleteTerminalProblem);
router.post('/admin/categories', authMiddleware, isRoot, createTerminalCategory);
router.put('/admin/categories/:id', authMiddleware, isRoot, updateTerminalCategory);
router.delete('/admin/categories/:id', authMiddleware, isRoot, deleteTerminalCategory);

router.get('/', getTerminalQuestions);
router.get('/categories', authMiddleware, getTerminalCategories);
router.get('/progress', authMiddleware, getUserTerminalProgress);
router.post('/submit', authMiddleware, submitTerminalCommand);

export default router;
