import express from 'express';
import { getStats } from '../controllers/statsController.js';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';

const router = express.Router();

// Cache stats for 5 minutes (300 seconds)
router.get('/', cacheMiddleware(300), getStats);

export default router;
