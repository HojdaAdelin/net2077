import express from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';
import { listNetworkProblems, getNetworkProblem, saveNetworkAttempt, resetNetworkAttempt, checkNetworkProblem,
  adminListNetworkProblems, previewNetworkProblems, createNetworkProblems, updateNetworkProblem, deleteNetworkProblem, reorderNetworkProblems } from '../controllers/networkProblemController.js';

const router = express.Router();
router.use(authMiddleware);
const checkLimiter = rateLimit({ windowMs: 60000, limit: 30, standardHeaders: true, legacyHeaders: false, keyGenerator: req => req.userId });
router.get('/admin', isRoot, adminListNetworkProblems);
router.post('/admin/preview', isRoot, previewNetworkProblems);
router.post('/admin', isRoot, createNetworkProblems);
router.put('/admin/order', isRoot, reorderNetworkProblems);
router.put('/admin/:id', isRoot, updateNetworkProblem);
router.delete('/admin/:id', isRoot, deleteNetworkProblem);
router.get('/', listNetworkProblems);
router.get('/:id', getNetworkProblem);
router.put('/:id/attempt', saveNetworkAttempt);
router.post('/:id/reset', resetNetworkAttempt);
router.post('/:id/check', checkLimiter, checkNetworkProblem);
export default router;
