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
    const roadmaps = await Roadmap.find();
    res.json(roadmaps);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
