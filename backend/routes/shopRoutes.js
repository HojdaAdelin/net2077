import express from 'express';
import { getShopItems, purchaseItem, useItem, getInventory, transferGold, gambleGold } from '../controllers/shopController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';

const router = express.Router();

router.get('/items', authMiddleware, isRoot, getShopItems);
router.post('/purchase/:itemId', authMiddleware, isRoot, purchaseItem);
router.get('/inventory', authMiddleware, getInventory);
router.post('/use/:itemId', authMiddleware, useItem);
router.post('/transfer', authMiddleware, transferGold);
router.post('/gamble', authMiddleware, gambleGold);

export default router;
