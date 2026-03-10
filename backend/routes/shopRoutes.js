import express from 'express';
import { getShopItems, purchaseItem, useItem, getInventory } from '../controllers/shopController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/items', getShopItems);
router.get('/inventory', authMiddleware, getInventory);
router.post('/purchase/:itemId', authMiddleware, purchaseItem);
router.post('/use/:itemId', authMiddleware, useItem);

export default router;
