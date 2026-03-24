import User from '../models/User.js';
import { updateUserStreak, getStreakInfo } from '../utils/streakUtils.js';
import { calculateXPWithBoosts } from './shopController.js';
import { trackCompetitiveXP } from './competitiveController.js';

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
    const arduinoSolved = user.solvedByTag.ARDUINO || 0;
    const terminalSolved = user.terminalStats.solved || 0;
    const isSolved = user.isStats.solved || 0;
    const totalSolvedByCategories = linuxSolved + networkSolved + terminalSolved + isSolved + arduinoSolved;

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
    
    const finalXP = await calculateXPWithBoosts(req.userId, score);
    
    user.xp += finalXP; 
    user.level = Math.floor(user.xp / 100) + 1;
    
    await trackCompetitiveXP(req.userId, finalXP);
    
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



export const claimLevelRewards = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize lastLevelRewarded if it doesn't exist
    if (!user.lastLevelRewarded) {
      user.lastLevelRewarded = 1;
    }

    const currentLevel = user.level;
    const lastRewarded = user.lastLevelRewarded;

    // Check if there are rewards to claim
    if (currentLevel <= lastRewarded) {
      return res.json({ 
        success: false, 
        message: 'No rewards to claim',
        pendingRewards: 0
      });
    }

    // Calculate rewards (2 gold per level)
    const levelsToReward = currentLevel - lastRewarded;
    const goldReward = levelsToReward * 2;

    // Update user
    user.gold += goldReward;
    user.lastLevelRewarded = currentLevel;
    await user.save();

    res.json({
      success: true,
      goldEarned: goldReward,
      levelsRewarded: levelsToReward,
      newGoldTotal: user.gold
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const checkPendingRewards = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize lastLevelRewarded if it doesn't exist
    if (!user.lastLevelRewarded) {
      user.lastLevelRewarded = 1;
      await user.save();
    }

    const currentLevel = user.level;
    const lastRewarded = user.lastLevelRewarded;
    const pendingLevels = Math.max(0, currentLevel - lastRewarded);
    const pendingGold = pendingLevels * 2;

    res.json({
      hasPendingRewards: pendingLevels > 0,
      pendingLevels,
      pendingGold,
      currentLevel,
      lastRewarded
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
