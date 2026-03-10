import express from 'express';
import { getShopItems, purchaseItem } from '../controllers/shopController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/items', getShopItems);
router.post('/purchase/:itemId', authMiddleware, purchaseItem);

export default router;
