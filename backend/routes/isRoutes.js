import express from 'express';
import { getAllISProblems, getISProblem, submitISCode } from '../controllers/isController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getAllISProblems);
router.get('/:id', authMiddleware, getISProblem);
router.post('/:id/submit', authMiddleware, submitISCode);

export default router;