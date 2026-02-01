import InboxMessage from '../models/InboxMessage.js';
import User from '../models/User.js';

export const getInboxMessages = async (req, res) => {
  try {
    const messages = await InboxMessage.find({ recipientId: req.userId })
      .sort({ createdAt: -1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching inbox messages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await InboxMessage.countDocuments({ 
      recipientId: req.userId, 
      isRead: false 
    });
    
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await InboxMessage.findOneAndUpdate(
      { _id: messageId, recipientId: req.userId },
      { 
        isRead: true, 
        readAt: new Date() 
      },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await InboxMessage.findOneAndDelete({
      _id: messageId,
      recipientId: req.userId
    });
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await InboxMessage.findOne({
      _id: messageId,
      recipientId: req.userId
    });
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json(message);
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};