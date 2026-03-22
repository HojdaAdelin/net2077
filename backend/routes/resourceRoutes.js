import express from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';
import { getAllResources, getPredefined, getRoadmaps, createRoadmap, updateRoadmap, deleteRoadmap } from '../controllers/resourceController.js';

// Middleware optional - ataseaza userId daca exista token valid, altfel continua
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
    } catch {}
  }
  next();
};

const router = express.Router();

router.get('/all', getAllResources);
router.get('/predefined', getPredefined);

// Public route - only visible roadmaps, no auth needed
router.get('/roadmaps/public', getRoadmaps);
// Root route - all roadmaps including hidden
router.get('/roadmaps/root', authMiddleware, isRoot, getRoadmaps);
// Legacy with optionalAuth (kept for compatibility)
router.get('/roadmaps', optionalAuth, getRoadmaps);

router.post('/roadmaps', authMiddleware, isRoot, createRoadmap);
router.put('/roadmaps/:roadmapId', authMiddleware, isRoot, updateRoadmap);
router.delete('/roadmaps/:roadmapId', authMiddleware, isRoot, deleteRoadmap);

export default router;
