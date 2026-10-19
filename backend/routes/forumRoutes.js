import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isRoot } from '../middleware/checkRole.js';
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
  deleteTopic,
  getTopic,
  updateTopic,
  createReply,
  deleteReply
} from '../controllers/forumController.js';

const router = express.Router();

router.use(authMiddleware, isRoot);

router.get('/structure', getForumStructure);

router.post('/zones', createZone);
router.put('/zones/:zoneId', updateZone);
router.delete('/zones/:zoneId', deleteZone);

router.post('/zones/:zoneId/items', addItem);
router.put('/zones/:zoneId/items/:itemId', updateItem);
router.delete('/zones/:zoneId/items/:itemId', deleteItem);

router.get('/zones/:zoneId/items/:itemId/topics', getItemTopics);
router.post('/zones/:zoneId/items/:itemId/topics', createTopic);
router.delete('/zones/:zoneId/items/:itemId/topics/:topicId', deleteTopic);

router.get('/topics/:topicId', getTopic);
router.put('/topics/:topicId', updateTopic);
router.post('/topics/:topicId/replies', createReply);
router.delete('/topics/:topicId/replies/:replyId', deleteReply);

export default router;
