import express from 'express';
import { getShopItems, purchaseItem, useItem, getInventory, transferGold, gambleGold } from '../controllers/shopController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';

const router = express.Router();

router.get('/items', authMiddleware, isRoot, getShopItems);
router.get('/inventory', authMiddleware, isRoot, getInventory);
router.post('/purchase/:itemId', authMiddleware, isRoot, purchaseItem);
router.post('/use/:itemId', authMiddleware, isRoot, useItem);
router.post('/transfer', authMiddleware, isRoot, transferGold);
router.post('/gamble', authMiddleware, isRoot, gambleGold);

export default router;
