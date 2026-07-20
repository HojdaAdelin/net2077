import express from 'express';
import { getUpdates, publishUpdate, deleteUpdate } from '../controllers/updateController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { checkRole } from '../middleware/checkRole.js';

const router = express.Router();

router.get('/', getUpdates);
router.post('/', authMiddleware, checkRole('root'), publishUpdate);
router.delete('/:id', authMiddleware, checkRole('root'), deleteUpdate);

export default router;
