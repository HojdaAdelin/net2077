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