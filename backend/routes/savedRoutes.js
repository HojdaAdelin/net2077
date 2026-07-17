import express from 'express';
import { getSaved, toggleSave } from '../controllers/savedController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getSaved);
router.post('/toggle', authMiddleware, toggleSave);

export default router;
