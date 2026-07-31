import express from 'express';
import { getShopItems, purchaseItem, useItem, getInventory, transferGold, gambleGold } from '../controllers/shopController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/items', getShopItems);
router.get('/inventory', authMiddleware, getInventory);
router.post('/purchase/:itemId', authMiddleware, purchaseItem);
router.post('/use/:itemId', authMiddleware, useItem);
router.post('/transfer', authMiddleware, transferGold);
router.post('/gamble', authMiddleware, gambleGold);

export default router;
