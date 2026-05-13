import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';
import Roadmap from '../models/Roadmap.js';
import Chapter from '../models/Chapter.js';
import Lesson from '../models/Lesson.js';
import User from '../models/User.js';
import {
  getChapters, createChapter, updateChapter, deleteChapter,
  getLessons, getLesson, getLessonForEdit, createLesson, updateLesson, deleteLesson,
  checkAnswer, getRoadmapProgress, getLessonProgress,
} from '../controllers/learnController.js';

const router = express.Router();

// Middleware: root OR editor of the roadmap
// Resolves roadmapId from params or from chapter/lesson in DB
const canEditLearn = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('role');
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.role === 'root') { req.user = { id: req.userId, role: 'root' }; return next(); }

    // Resolve roadmapId
    let roadmapId = req.params.roadmapId;

    if (!roadmapId && req.params.chapterId) {
      const ch = await Chapter.findById(req.params.chapterId).select('roadmapId');
      roadmapId = ch?.roadmapId?.toString();
    }
    if (!roadmapId && req.params.lessonId) {
      const ls = await Lesson.findById(req.params.lessonId).select('roadmapId');
      roadmapId = ls?.roadmapId?.toString();
    }
    // createLesson passes roadmapId in body
    if (!roadmapId && req.body?.roadmapId) {
      roadmapId = req.body.roadmapId;
    }

    if (!roadmapId) return res.status(400).json({ message: 'Cannot resolve roadmap' });

    const roadmap = await Roadmap.findById(roadmapId).select('editors');
    if (!roadmap) return res.status(404).json({ message: 'Roadmap not found' });

    const isEditor = roadmap.editors.some(id => id.toString() === req.userId);
    if (!isEditor) return res.status(403).json({ message: 'Access denied' });

    req.user = { id: req.userId, role: user.role };
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Chapters
router.get('/roadmaps/:roadmapId/chapters', authMiddleware, getChapters);
router.post('/roadmaps/:roadmapId/chapters', authMiddleware, canEditLearn, createChapter);
router.put('/chapters/:chapterId', authMiddleware, canEditLearn, updateChapter);
router.delete('/chapters/:chapterId', authMiddleware, canEditLearn, deleteChapter);

// Lessons
router.get('/chapters/:chapterId/lessons', authMiddleware, getLessons);
router.post('/chapters/:chapterId/lessons', authMiddleware, canEditLearn, createLesson);
router.get('/lessons/:lessonId', authMiddleware, getLesson);
router.get('/lessons/:lessonId/edit', authMiddleware, canEditLearn, getLessonForEdit);
router.put('/lessons/:lessonId', authMiddleware, canEditLearn, updateLesson);
router.delete('/lessons/:lessonId', authMiddleware, canEditLearn, deleteLesson);

// Progress
router.post('/lessons/:lessonId/items/:itemId/check', authMiddleware, checkAnswer);
router.get('/roadmaps/:roadmapId/progress', authMiddleware, getRoadmapProgress);
router.get('/lessons/:lessonId/progress', authMiddleware, getLessonProgress);

export default router;
