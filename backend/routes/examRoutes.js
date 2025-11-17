import express from 'express';
import { getExams, getExamById } from '../controllers/examController.js';

const router = express.Router();

router.get('/', getExams);
router.get('/:id', getExamById);

export default router;
