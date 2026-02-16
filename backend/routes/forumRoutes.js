import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot, isHeadAdmin } from '../middleware/checkRole.js';
import {
  getForumStructure,
  createZone,
  updateZone,
  deleteZone,
  addItem,
  updateItem,
  deleteItem,
  getItemTopics,
  createTopic,
  deleteTopic
} from '../controllers/forumController.js';

const router = express.Router();

router.get('/structure', authMiddleware, getForumStructure);

router.post('/zones', authMiddleware, isRoot, createZone);
router.put('/zones/:zoneId', authMiddleware, isRoot, updateZone);
router.delete('/zones/:zoneId', authMiddleware, isRoot, deleteZone);

router.post('/zones/:zoneId/items', authMiddleware, isRoot, addItem);
router.put('/zones/:zoneId/items/:itemId', authMiddleware, isRoot, updateItem);
router.delete('/zones/:zoneId/items/:itemId', authMiddleware, isRoot, deleteItem);

// Topic routes
router.get('/zones/:zoneId/items/:itemId/topics', authMiddleware, getItemTopics);
router.post('/zones/:zoneId/items/:itemId/topics', authMiddleware, isHeadAdmin, createTopic);
router.delete('/zones/:zoneId/items/:itemId/topics/:topicId', authMiddleware, isHeadAdmin, deleteTopic);

export default router;
