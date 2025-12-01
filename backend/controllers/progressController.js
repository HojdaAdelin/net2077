import User from '../models/User.js';

export const getUserProgress = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('solvedQuestions', '_id tags type');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const solvedQuestions = user.solvedQuestions.map(question => ({
      id: question._id.toString(),
      tags: question.tags || [],
      type: question.type
    }));

    res.json({
      solvedCount: solvedQuestions.length,
      solvedQuestions,
      solvedByTag: user.solvedByTag,
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
    const { examId, examTitle, examTag, score, totalPoints, correctAnswers, totalQuestions } = req.body;
    const user = await User.findById(req.userId);
    
    user.simulations.push({ 
      examId,
      examTitle,
      examTag,
      score, 
      totalPoints,
      correctAnswers,
      totalQuestions,
      date: new Date() 
    });
    
    // Calculate XP based on score percentage
    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
    user.xp += Math.floor(percentage) * 2;
    user.level = Math.floor(user.xp / 100) + 1;
    await user.save();
    
    res.json({ xp: user.xp, level: user.level });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


