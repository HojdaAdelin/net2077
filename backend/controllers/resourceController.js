import Resource from '../models/Resource.js';
import Roadmap from '../models/Roadmap.js';

export const getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find();
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPredefined = async (req, res) => {
  try {
    const resources = await Resource.find({ category: 'resource' });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getRoadmaps = async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;

    let isRootUser = false;
    let userId = null;

    if (req.user?.role === 'root') {
      isRootUser = true;
    } else if (req.userId) {
      userId = req.userId;
      const user = await User.findById(req.userId).select('role');
      isRootUser = user?.role === 'root';
    }

    let roadmaps;
    if (isRootUser) {
      roadmaps = await Roadmap.find({}).sort({ createdAt: -1 }).populate('editors', 'username');
    } else if (userId) {
      // visible OR user is in editors list
      roadmaps = await Roadmap.find({
        $or: [{ visible: true }, { editors: userId }]
      }).sort({ createdAt: -1 }).populate('editors', 'username');
    } else {
      roadmaps = await Roadmap.find({ visible: true }).sort({ createdAt: -1 });
    }

    res.json(roadmaps);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createRoadmap = async (req, res) => {
  try {
    const { id, title, description, icon, chapters, lessons, type, visible } = req.body;

    if (!id || !title || !description || !icon || chapters === undefined || lessons === undefined) {
      return res.status(400).json({ message: 'All fields are required: id, title, description, icon, chapters, lessons' });
    }

    const existing = await Roadmap.findOne({ id });
    if (existing) {
      return res.status(400).json({ message: 'A roadmap with this ID already exists' });
    }

    const roadmap = new Roadmap({
      id,
      title,
      description,
      icon,
      chapters: Number(chapters),
      lessons: Number(lessons),
      type: type || 'free',
      visible: visible !== undefined ? Boolean(visible) : true,
    });

    await roadmap.save();
    res.status(201).json({ message: 'Roadmap created successfully', roadmap });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateRoadmap = async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const { title, description, icon, chapters, lessons, type, visible } = req.body;

    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) return res.status(404).json({ message: 'Roadmap not found' });

    if (title !== undefined) roadmap.title = title;
    if (description !== undefined) roadmap.description = description;
    if (icon !== undefined) roadmap.icon = icon;
    if (chapters !== undefined) roadmap.chapters = Number(chapters);
    if (lessons !== undefined) roadmap.lessons = Number(lessons);
    if (type !== undefined) roadmap.type = type;
    if (visible !== undefined) roadmap.visible = Boolean(visible);

    await roadmap.save();
    res.json({ message: 'Roadmap updated successfully', roadmap });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const startRoadmap = async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.userId).select('startedRoadmaps');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const alreadyStarted = user.startedRoadmaps?.some(id => id.toString() === roadmapId);
    if (alreadyStarted) return res.json({ success: true, alreadyStarted: true });

    // Increment counter on roadmap
    const roadmap = await Roadmap.findByIdAndUpdate(
      roadmapId,
      { $inc: { startedBy: 1 } },
      { new: true }
    );
    if (!roadmap) return res.status(404).json({ message: 'Roadmap not found' });

    // Mark on user
    user.startedRoadmaps = user.startedRoadmaps || [];
    user.startedRoadmaps.push(roadmapId);
    await user.save();

    res.json({ success: true, alreadyStarted: false, startedBy: roadmap.startedBy });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteRoadmap = async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const roadmap = await Roadmap.findByIdAndDelete(roadmapId);
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }
    res.json({ message: 'Roadmap deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getRoadmapEditors = async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const roadmap = await Roadmap.findById(roadmapId).populate('editors', 'username role');
    if (!roadmap) return res.status(404).json({ message: 'Roadmap not found' });
    res.json({ editors: roadmap.editors });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const searchUsersForEditor = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ users: [] });
    }
    const User = (await import('../models/User.js')).default;
    const users = await User.find({
      username: { $regex: q.trim(), $options: 'i' },
      role: { $ne: 'root' } // don't show root users — they already have full access
    })
      .select('username role')
      .limit(8);
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addEditor = async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const User = (await import('../models/User.js')).default;
    const targetUser = await User.findById(userId).select('username role');
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (targetUser.role === 'root') {
      return res.status(400).json({ message: 'Root users already have full access' });
    }

    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) return res.status(404).json({ message: 'Roadmap not found' });

    const alreadyEditor = roadmap.editors.some(id => id.toString() === userId);
    if (alreadyEditor) return res.status(400).json({ message: 'User is already an editor' });

    roadmap.editors.push(userId);
    await roadmap.save();

    const updated = await Roadmap.findById(roadmapId).populate('editors', 'username role');
    res.json({ success: true, editors: updated.editors });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const removeEditor = async (req, res) => {
  try {
    const { roadmapId, userId } = req.params;

    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) return res.status(404).json({ message: 'Roadmap not found' });

    roadmap.editors = roadmap.editors.filter(id => id.toString() !== userId);
    await roadmap.save();

    const updated = await Roadmap.findById(roadmapId).populate('editors', 'username role');
    res.json({ success: true, editors: updated.editors });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
