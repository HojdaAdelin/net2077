import Terminal from '../models/Terminal.js';
import User from '../models/User.js';
import { updateUserStreak } from '../utils/streakUtils.js';

export const getTerminalQuestions = async (req, res) => {
  try {
    const questions = await Terminal.find({}).sort({ order: 1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const submitTerminalCommand = async (req, res) => {
  try {
    const { questionId, command } = req.body;
    const user = await User.findById(req.userId);
    const question = await Terminal.findById(questionId);
    
    if (!question) {
      return res.status(404).json({ message: 'Terminal question not found' });
    }

    const alreadySolved = user.solvedTerminalQuestions.some(
      id => id.toString() === questionId.toString()
    );

    if (!alreadySolved) {
      // Check if command is accepted
      const isCorrect = question.acceptedCommands.some(acceptedCmd => 
        acceptedCmd.toLowerCase().trim() === command.toLowerCase().trim()
      );

      if (isCorrect) {
        user.solvedTerminalQuestions.push(questionId);
        user.terminalStats.solved += 1;
        user.xp += question.points || 5;
        user.level = Math.floor(user.xp / 100) + 1;
        
        await updateUserStreak(user);
        await user.save();
        
        console.log(`[✔] Terminal question ${questionId} solved by user ${user.username}`);
        
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
    } else {
      res.json({ 
        success: false, 
        message: 'Question already solved' 
      });
    }
  } catch (error) {
    console.error('Error submitting terminal command:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};