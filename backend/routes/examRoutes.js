import express from 'express';
import { getExams, getExamById, createExam, updateExam, bulkAddQuestions, deleteExam, examStats } from '../controllers/examController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';

const router = express.Router();

router.get('/', getExams);
router.get('/:id', getExamById);
router.post('/', authMiddleware, isRoot, createExam);
router.put('/:id', authMiddleware, isRoot, updateExam);
router.post('/bulk-questions', authMiddleware, isRoot, bulkAddQuestions);
router.post('/:id/stats', examStats)
router.delete('/:id', authMiddleware, isRoot, deleteExam);

export default router;
