import express from 'express';
import { register, login, logout, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { registerRateLimit, loginRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.post('/register', registerRateLimit, register);
router.post('/login', loginRateLimit, login);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMe);

export default router;
