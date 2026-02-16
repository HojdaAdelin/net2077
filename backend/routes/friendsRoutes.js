import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriends,
  sendDirectMessage,
  getConversation,
  getUnreadCount
} from '../controllers/friendsController.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const friendRequestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many friend requests, please try again later'
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many messages, please slow down'
});

router.post('/request', authMiddleware, friendRequestLimiter, sendFriendRequest);
router.post('/accept', authMiddleware, acceptFriendRequest);
router.post('/reject', authMiddleware, rejectFriendRequest);
router.post('/remove', authMiddleware, removeFriend);
router.get('/', authMiddleware, getFriends);
router.post('/message', authMiddleware, messageLimiter, sendDirectMessage);
router.get('/conversation/:userId', authMiddleware, getConversation);
router.get('/unread', authMiddleware, getUnreadCount);

export default router;
