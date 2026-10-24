import { requestPasswordReset, verifyPasswordReset, completePasswordReset } from '../controllers/passwordResetController.js';
import express from 'express';
import { register, login, logout, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { registerRateLimit, loginRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();
router.post('/password-reset/request', requestPasswordReset);
router.post('/password-reset/verify', verifyPasswordReset);
router.post('/password-reset/complete', completePasswordReset);

router.post('/register', registerRateLimit, register);
router.post('/login', loginRateLimit, login);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMe);

export default router;
