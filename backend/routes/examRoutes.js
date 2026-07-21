import express from 'express';
import { getExams, getExamById, createExam, bulkAddQuestions, deleteExam } from '../controllers/examController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';

const router = express.Router();

router.get('/', getExams);
router.get('/:id', getExamById);
router.post('/', authMiddleware, isRoot, createExam);
router.post('/bulk-questions', authMiddleware, isRoot, bulkAddQuestions);
router.delete('/:id', authMiddleware, isRoot, deleteExam);

export default router;
