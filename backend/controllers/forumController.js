import ForumZone from '../models/ForumZone.js';
import ForumTopic from '../models/ForumTopic.js';

export const getForumStructure = async (req, res) => {
  try {
    const zones = await ForumZone.find().sort({ order: 1 });
    
    const structuredZones = zones.map(zone => ({
      ...zone.toObject(),
      items: zone.items.sort((a, b) => a.order - b.order)
    }));

    res.json({ zones: structuredZones });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createZone = async (req, res) => {
  try {
    const { name, order } = req.body;

    if (!name || order === undefined) {
      return res.status(400).json({ message: 'Name and order are required' });
    }

    const zone = new ForumZone({
      name,
      order,
      items: []
    });

    await zone.save();

    res.json({ message: 'Zone created successfully', zone });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateZone = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { name, order } = req.body;

    const zone = await ForumZone.findById(zoneId);
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }

    if (name !== undefined) zone.name = name;
    if (order !== undefined) zone.order = order;

    await zone.save();

    res.json({ message: 'Zone updated successfully', zone });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteZone = async (req, res) => {
  try {
    const { zoneId } = req.params;

    const zone = await ForumZone.findByIdAndDelete(zoneId);
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }

    res.json({ message: 'Zone deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addItem = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { name, icon, order } = req.body;

    if (!name || !icon || order === undefined) {
      return res.status(400).json({ message: 'Name, icon, and order are required' });
    }

    const zone = await ForumZone.findById(zoneId);
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }

    zone.items.push({ name, icon, order });
    await zone.save();

    res.json({ message: 'Item added successfully', zone });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { zoneId, itemId } = req.params;
    const { name, icon, order } = req.body;

    const zone = await ForumZone.findById(zoneId);
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }

    const item = zone.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (name !== undefined) item.name = name;
    if (icon !== undefined) item.icon = icon;
    if (order !== undefined) item.order = order;

    await zone.save();

    res.json({ message: 'Item updated successfully', zone });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { zoneId, itemId } = req.params;

    const zone = await ForumZone.findById(zoneId);
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }

    zone.items.pull(itemId);
    await zone.save();

    res.json({ message: 'Item deleted successfully', zone });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Topic Management
export const getItemTopics = async (req, res) => {
  try {
    const { zoneId, itemId } = req.params;

    const zone = await ForumZone.findById(zoneId);
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }

    const item = zone.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const topics = await ForumTopic.find({ zoneId, itemId })
      .populate('author', 'username level')
      .sort({ lastReply: -1 });

    res.json({ 
      item: {
        _id: item._id,
        name: item.name,
        icon: item.icon
      },
      topics 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createTopic = async (req, res) => {
  try {
    const { zoneId, itemId } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const zone = await ForumZone.findById(zoneId);
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }

    const item = zone.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const topic = new ForumTopic({
      zoneId,
      itemId,
      title: title.trim(),
      author: req.user.id
    });

    await topic.save();

    // Update post count
    item.postCount = (item.postCount || 0) + 1;
    await zone.save();

    const populatedTopic = await ForumTopic.findById(topic._id)
      .populate('author', 'username level');

    res.json({ message: 'Topic created successfully', topic: populatedTopic });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteTopic = async (req, res) => {
  try {
    const { zoneId, itemId, topicId } = req.params;

    const topic = await ForumTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    await ForumTopic.findByIdAndDelete(topicId);

    // Update post count
    const zone = await ForumZone.findById(zoneId);
    if (zone) {
      const item = zone.items.id(itemId);
      if (item && item.postCount > 0) {
        item.postCount -= 1;
        await zone.save();
      }
    }

    res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Get single topic with content
export const getTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const topic = await ForumTopic.findById(topicId)
      .populate('author', 'username level role profilePicture');

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // Get replies with pagination
    const ForumReply = (await import('../models/ForumReply.js')).default;
    const skip = (page - 1) * limit;
    
    const replies = await ForumReply.find({ topicId })
      .populate('author', 'username level role profilePicture')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalReplies = await ForumReply.countDocuments({ topicId });

    res.json({
      topic,
      replies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReplies / limit),
        totalReplies,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update topic (content and minRoleToReply)
export const updateTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { content, minRoleToReply } = req.body;

    const topic = await ForumTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    if (content !== undefined) topic.content = content;
    if (minRoleToReply !== undefined) topic.minRoleToReply = minRoleToReply;

    await topic.save();

    const updatedTopic = await ForumTopic.findById(topicId)
      .populate('author', 'username level role profilePicture');

    res.json({ message: 'Topic updated successfully', topic: updatedTopic });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create reply
export const createReply = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const topic = await ForumTopic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // Check if user has required role
    const roleHierarchy = ['user', 'helper', 'mod', 'head-mod', 'admin', 'head-admin', 'root'];
    const userRoleIndex = roleHierarchy.indexOf(req.user.role);
    const minRoleIndex = roleHierarchy.indexOf(topic.minRoleToReply);

    if (userRoleIndex < minRoleIndex) {
      return res.status(403).json({ 
        message: `You need at least ${topic.minRoleToReply} role to reply to this topic` 
      });
    }

    const ForumReply = (await import('../models/ForumReply.js')).default;
    const reply = new ForumReply({
      topicId,
      author: req.user.id,
      content: content.trim()
    });

    await reply.save();

    // Update reply count and last reply time
    topic.replyCount = (topic.replyCount || 0) + 1;
    topic.lastReply = new Date();
    await topic.save();

    const populatedReply = await ForumReply.findById(reply._id)
      .populate('author', 'username level role profilePicture');

    res.json({ message: 'Reply created successfully', reply: populatedReply });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete reply
export const deleteReply = async (req, res) => {
  try {
    const { topicId, replyId } = req.params;

    const ForumReply = (await import('../models/ForumReply.js')).default;
    const reply = await ForumReply.findById(replyId);
    
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    await ForumReply.findByIdAndDelete(replyId);

    // Update reply count
    const topic = await ForumTopic.findById(topicId);
    if (topic && topic.replyCount > 0) {
      topic.replyCount -= 1;
      await topic.save();
    }

    res.json({ message: 'Reply deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
