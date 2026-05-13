import express from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';
import {
  getAllResources, getPredefined, getRoadmaps,
  createRoadmap, updateRoadmap, deleteRoadmap, startRoadmap,
  getRoadmapEditors, searchUsersForEditor, addEditor, removeEditor
} from '../controllers/resourceController.js';
import Roadmap from '../models/Roadmap.js';

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

// Middleware: root OR user is in roadmap editors list
const canEditRoadmap = async (req, res, next) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.userId).select('role');
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    if (user.role === 'root') {
      req.user = { id: req.userId, role: user.role };
      return next();
    }

    const roadmap = await Roadmap.findById(req.params.roadmapId).select('editors');
    if (!roadmap) return res.status(404).json({ message: 'Roadmap not found' });

    const isEditor = roadmap.editors.some(id => id.toString() === req.userId);
    if (!isEditor) return res.status(403).json({ message: 'Access denied' });

    req.user = { id: req.userId, role: user.role };
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const router = express.Router();

router.get('/all', getAllResources);
router.get('/predefined', getPredefined);

// Public route - only visible roadmaps, no auth needed
router.get('/roadmaps/public', getRoadmaps);
// Authenticated route - visible + roadmaps where user is editor
router.get('/roadmaps/me', authMiddleware, getRoadmaps);
// Root route - all roadmaps including hidden
router.get('/roadmaps/root', authMiddleware, isRoot, getRoadmaps);
// Legacy with optionalAuth (kept for compatibility)
router.get('/roadmaps', optionalAuth, getRoadmaps);

router.post('/roadmaps', authMiddleware, isRoot, createRoadmap);
router.put('/roadmaps/:roadmapId', authMiddleware, isRoot, updateRoadmap);
router.delete('/roadmaps/:roadmapId', authMiddleware, isRoot, deleteRoadmap);
router.post('/roadmaps/:roadmapId/start', authMiddleware, startRoadmap);

// Editor management (root only)
router.get('/roadmaps/:roadmapId/editors', authMiddleware, isRoot, getRoadmapEditors);
router.get('/roadmaps/search-users', authMiddleware, isRoot, searchUsersForEditor);
router.post('/roadmaps/:roadmapId/editors', authMiddleware, isRoot, addEditor);
router.delete('/roadmaps/:roadmapId/editors/:userId', authMiddleware, isRoot, removeEditor);

export { canEditRoadmap };
export default router;
