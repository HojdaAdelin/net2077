import express from 'express';
import { getTasks, createTask, toggleTask, deleteTask } from '../controllers/plannerController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';

const router = express.Router();

router.get('/', authMiddleware, isRoot, getTasks);
router.post('/', authMiddleware, isRoot, createTask);
router.patch('/:id/toggle', authMiddleware, isRoot, toggleTask);
router.delete('/:id', authMiddleware, isRoot, deleteTask);

export default router;
