import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';
import {
  getChapters, createChapter, updateChapter, deleteChapter,
  getLessons, getLesson, getLessonForEdit, createLesson, updateLesson, deleteLesson,
  checkAnswer, getRoadmapProgress, getLessonProgress,
} from '../controllers/learnController.js';

const router = express.Router();

// Chapters
router.get('/roadmaps/:roadmapId/chapters', authMiddleware, getChapters);
router.post('/roadmaps/:roadmapId/chapters', authMiddleware, isRoot, createChapter);
router.put('/chapters/:chapterId', authMiddleware, isRoot, updateChapter);
router.delete('/chapters/:chapterId', authMiddleware, isRoot, deleteChapter);

// Lessons
router.get('/chapters/:chapterId/lessons', authMiddleware, getLessons);
router.post('/chapters/:chapterId/lessons', authMiddleware, isRoot, createLesson);
router.get('/lessons/:lessonId', authMiddleware, getLesson);
router.get('/lessons/:lessonId/edit', authMiddleware, isRoot, getLessonForEdit);
router.put('/lessons/:lessonId', authMiddleware, isRoot, updateLesson);
router.delete('/lessons/:lessonId', authMiddleware, isRoot, deleteLesson);

// Progress
router.post('/lessons/:lessonId/items/:itemId/check', authMiddleware, checkAnswer);
router.get('/roadmaps/:roadmapId/progress', authMiddleware, getRoadmapProgress);
router.get('/lessons/:lessonId/progress', authMiddleware, getLessonProgress);

export default router;
