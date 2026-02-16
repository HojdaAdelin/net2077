import express from 'express';
import { updateUserRole, getAllUsers, getRoleStats } from '../controllers/adminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isHeadAdmin, isModerator } from '../middleware/checkRole.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiter for admin actions
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many admin requests, please try again later'
});

// Apply rate limiting to all admin routes
router.use(adminLimiter);

// Admin only routes
router.post('/users/role', authMiddleware, isHeadAdmin, updateUserRole);
router.get('/users/stats', authMiddleware, isHeadAdmin, getRoleStats);

// Admin and Moderator routes
router.get('/users', authMiddleware, isModerator, getAllUsers);

export default router;
