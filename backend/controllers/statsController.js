import User from '../models/User.js';
import Question from '../models/Question.js';
import Resource from '../models/Resource.js';
import Terminal from '../models/Terminal.js';
import Roadmap from '../models/Roadmap.js';

export const getStats = async (req, res) => {
  try {
    const totalQuestions = await Question.countDocuments() + await Terminal.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalResources = await Roadmap.countDocuments();
    
    res.json({ totalQuestions, totalUsers, totalResources });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
