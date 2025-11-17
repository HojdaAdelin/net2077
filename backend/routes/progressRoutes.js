import express from 'express';
import { getUserProgress, getLevel, addSimulation } from '../controllers/progressController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/user', authMiddleware, getUserProgress);
router.get('/level', authMiddleware, getLevel);
router.post('/addSimulation', authMiddleware, addSimulation);

export default router;
