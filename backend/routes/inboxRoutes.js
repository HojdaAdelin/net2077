import express from 'express';
import { getInboxMessages, getUnreadCount, markAsRead, deleteMessage, deleteAllMessages, getMessage } from '../controllers/inboxController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getInboxMessages);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.get('/:messageId', authMiddleware, getMessage);
router.patch('/:messageId/read', authMiddleware, markAsRead);
router.delete('/', authMiddleware, deleteAllMessages);
router.delete('/:messageId', authMiddleware, deleteMessage);

export default router;