import express from 'express';
import { getUpdates, publishUpdate, deleteUpdate, getWhatsNew, markSeen } from '../controllers/updateController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { checkRole } from '../middleware/checkRole.js';

const router = express.Router();

router.get('/', getUpdates);
router.get('/whats-new', authMiddleware, getWhatsNew);
router.post('/mark-seen', authMiddleware, markSeen);
router.post('/', authMiddleware, checkRole('root'), publishUpdate);
router.delete('/:id', authMiddleware, checkRole('root'), deleteUpdate);

export default router;
