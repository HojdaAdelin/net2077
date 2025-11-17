import User from '../models/User.js';

export const getUserProgress = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('solvedQuestions');
    res.json({
      solvedCount: user.solvedQuestions.length,
      simulations: user.simulations,
      xp: user.xp,
      level: user.level
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getLevel = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ xp: user.xp, level: user.level });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const addSimulation = async (req, res) => {
  try {
    const { score, total } = req.body;
    const user = await User.findById(req.userId);
    
    user.simulations.push({ score, total, date: new Date() });
    user.xp += Math.floor(score / total * 100) * 2;
    user.level = Math.floor(user.xp / 100) + 1;
    await user.save();
    
    res.json({ xp: user.xp, level: user.level });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
