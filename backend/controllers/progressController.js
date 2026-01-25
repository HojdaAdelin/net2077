import User from '../models/User.js';
import { updateUserStreak, getStreakInfo } from '../utils/streakUtils.js';

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

    const linuxSolved = user.solvedByTag?.LINUX || 0;
    const networkSolved = user.solvedByTag?.NETWORK || 0;
    const totalSolvedByCategories = linuxSolved + networkSolved;

    const streakInfo = getStreakInfo(user);

    res.json({
      solvedCount: totalSolvedByCategories,
      solvedQuestions,
      solvedByTag: user.solvedByTag,
      terminalStats: user.terminalStats,
      simulations: user.simulations,
      xp: user.xp,
      level: user.level,
      streak: streakInfo
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
    
    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
    user.xp += score; 
    user.level = Math.floor(user.xp / 100) + 1;
    
    if (correctAnswers > 0) {
      await updateUserStreak(user);
    }
    
    await user.save();
    
    const streakInfo = getStreakInfo(user);
    
    res.json({ 
      xp: user.xp, 
      level: user.level,
      streak: streakInfo
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


