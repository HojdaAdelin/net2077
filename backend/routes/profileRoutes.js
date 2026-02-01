import express from 'express';
import { getUserProfile, getCurrentUserProfile } from '../controllers/profileController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me', authMiddleware, getCurrentUserProfile);
router.get('/:username', getUserProfile);

export default router;