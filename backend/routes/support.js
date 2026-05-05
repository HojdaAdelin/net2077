import express from 'express';
import { createSupportRequest, getUserSupportRequests, getAllSupportRequests, updateSupportStatus, deleteSupportRequest, replyToSupportRequest, awardGoldToUser } from '../controllers/supportController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { supportRateLimit } from '../middleware/supportRateLimit.js';

const router = express.Router();

router.post('/', authMiddleware, supportRateLimit, createSupportRequest);
router.get('/', authMiddleware, getUserSupportRequests);
router.get('/all', authMiddleware, getAllSupportRequests);
router.patch('/:id/status', authMiddleware, updateSupportStatus);
router.post('/:id/reply', authMiddleware, replyToSupportRequest);
router.post('/:id/gold', authMiddleware, awardGoldToUser);
router.delete('/:id', authMiddleware, deleteSupportRequest);

export default router;