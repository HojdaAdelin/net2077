import express from 'express';
import { getAllProblems, getProblem, submitAnswer } from '../controllers/scriptingController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getAllProblems);
router.get('/:id', authMiddleware, getProblem);
router.post('/:id/submit', authMiddleware, submitAnswer);

export default router;
