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
    // Check if requester is root (token present and valid)
    let isRoot = false;
    if (req.userId) {
      const User = (await import('../models/User.js')).default;
      const user = await User.findById(req.userId).select('role');
      isRoot = user?.role === 'root';
    }

    const filter = isRoot ? {} : { visible: true };
    const roadmaps = await Roadmap.find(filter).sort({ createdAt: -1 });
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
