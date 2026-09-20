import express from 'express';
import { getSeasonBoxPrizes, openSeasonBox } from '../controllers/seasonBoxController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/prizes', getSeasonBoxPrizes);
router.post('/open', authMiddleware, openSeasonBox);

export default router;
