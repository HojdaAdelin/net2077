import Resource from '../models/Resource.js';

export const getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find();
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getDictionary = async (req, res) => {
  try {
    const dictionary = await Resource.find({ category: 'dictionary' }).sort({ title: 1 });
    res.json(dictionary);
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
