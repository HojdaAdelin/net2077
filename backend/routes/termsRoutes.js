import express from 'express';
import { getTerms, uploadTerms, downloadTerms } from '../controllers/termsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';

const router = express.Router();

router.get('/', getTerms);
router.get('/download', authMiddleware, isRoot, downloadTerms);
router.post('/', authMiddleware, isRoot, uploadTerms);

export default router;
