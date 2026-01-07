import express from 'express';
import { createSupportRequest, getUserSupportRequests } from '../controllers/supportController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { supportRateLimit } from '../middleware/supportRateLimit.js';

const router = express.Router();

router.post('/', authMiddleware, supportRateLimit, createSupportRequest);
router.get('/', authMiddleware, getUserSupportRequests);

export default router;