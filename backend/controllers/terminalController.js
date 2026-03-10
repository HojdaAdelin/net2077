import Terminal from '../models/Terminal.js';
import User from '../models/User.js';
import { updateUserStreak } from '../utils/streakUtils.js';
import { trackCompetitiveXP } from './competitiveController.js';
import { calculateXPWithBoosts } from './shopController.js';

export const getTerminalQuestions = async (req, res) => {
  try {
    const questions = await Terminal.find({}).sort({ order: 1 });
    res.json(questions);
  } catch (error) {
    console.error('Error fetching terminal questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserTerminalProgress = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('solvedTerminalQuestions');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalQuestions = await Terminal.countDocuments();
    
    res.json({
      solved: user.solvedTerminalQuestions || [],
      totalSolved: user.terminalStats.solved,
      totalQuestions
    });
  } catch (error) {
    console.error('Error fetching user terminal progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const submitTerminalCommand = async (req, res) => {
  try {
    const { questionId, command } = req.body;
    const userId = req.userId;

    if (!questionId || !command) {
      return res.status(400).json({ message: 'Question ID and command are required' });
    }

    const question = await Terminal.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Terminal question not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.solvedTerminalQuestions.includes(questionId)) {
      return res.status(400).json({ message: 'Question already solved' });
    }

    // Check if command is accepted
    const isCorrect = question.acceptedCommands.some(acceptedCmd => 
      acceptedCmd.toLowerCase().trim() === command.toLowerCase().trim()
    );

    if (isCorrect) {
      
      user.solvedTerminalQuestions.push(questionId);
      user.terminalStats.solved += 1;
      
      const finalXP = await calculateXPWithBoosts(user._id, question.points);
      
      user.xp += finalXP;
      user.level = Math.floor(user.xp / 100) + 1;
      
      
      await updateUserStreak(user);
      await trackCompetitiveXP(user._id, finalXP)
      
      await user.save();

      console.log(`[✔] Terminal question ${questionId} solved by user ${user.username}: +${question.points} XP`);

      res.json({ 
        success: true, 
        message: 'Correct command!', 
        points: question.points,
        xp: user.xp,
        level: user.level,
        streak: {
          current: user.streak?.current || 0,
          max: user.streak?.max || 0,
          isActive: true
        }
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Incorrect command. Try again!' 
      });
    }
  } catch (error) {
    console.error('Error submitting terminal command:', error);
    res.status(500).json({ message: 'Server error' });
  }
};