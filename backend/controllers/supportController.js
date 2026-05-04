import Support from '../models/Support.js';
import User from '../models/User.js';

export const createSupportRequest = async (req, res) => {
  try {
    const { title, description, type } = req.body;
    const userId = req.userId;

    // Validation
    if (!title || !description || !type) {
      return res.status(400).json({ 
        message: 'Title, description and type are required' 
      });
    }

    if (title.length > 100) {
      return res.status(400).json({ 
        message: 'Title must be less than 100 characters' 
      });
    }

    if (description.length > 1000) {
      return res.status(400).json({ 
        message: 'Description must be less than 1000 characters' 
      });
    }

    if (!['bug', 'enhancement'].includes(type)) {
      return res.status(400).json({ 
        message: 'Type must be either bug or enhancement' 
      });
    }

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create support request
    const supportRequest = new Support({
      userId,
      username: user.username,
      title,
      description,
      type
    });

    await supportRequest.save();

    res.status(201).json({
      message: 'Support request created successfully',
      supportRequest: {
        id: supportRequest._id,
        title: supportRequest.title,
        description: supportRequest.description,
        type: supportRequest.type,
        status: supportRequest.status,
        createdAt: supportRequest.createdAt
      }
    });

  } catch (error) {
    console.error('Create support request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserSupportRequests = async (req, res) => {
  try {
    const userId = req.userId;

    const supportRequests = await Support.find({ userId })
      .sort({ createdAt: -1 })
      .select('-userId -username');

    res.json({ supportRequests });

  } catch (error) {
    console.error('Get support requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllSupportRequests = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role');
    if (!user || user.role !== 'root') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const requests = await Support.find({}).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error) {
    console.error('Get all support requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateSupportStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role');
    if (!user || user.role !== 'root') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'in-progress', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await Support.findByIdAndUpdate(id, { status }, { new: true });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    res.json({ request });
  } catch (error) {
    console.error('Update support status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const replyToSupportRequest = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role');
    if (!user || user.role !== 'root') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { description } = req.body;

    if (!description?.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }

    const request = await Support.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const InboxMessage = (await import('../models/InboxMessage.js')).default;

    const title = request.type === 'bug'
      ? `NET2077 Team — Bug Report Response`
      : `NET2077 Team — Feature Request Response`;

    const inboxMessage = new InboxMessage({
      recipientId: request.userId,
      recipientUsername: request.username,
      sender: 'NET2077 Team',
      title,
      description: description.trim()
    });

    await inboxMessage.save();

    res.json({ message: 'Reply sent successfully' });
  } catch (error) {
    console.error('Reply to support request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteSupportRequest = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role');
    if (!user || user.role !== 'root') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const request = await Support.findByIdAndDelete(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Delete support request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};