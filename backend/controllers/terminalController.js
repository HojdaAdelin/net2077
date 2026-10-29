import Terminal from '../models/Terminal.js';
import TerminalCategory from '../models/TerminalCategory.js';
import { levelFromXp } from '../utils/xpUtils.js';
import User from '../models/User.js';
import { updateUserStreak } from '../utils/streakUtils.js';
import { trackCompetitiveXP } from './competitiveController.js';
import { calculateXPWithBoosts } from './shopController.js';
import { terminalCategoryAccess } from '../utils/terminalCategoryAccess.js';

export const getTerminalCategories = async (req, res) => {
  try {
    const [categories, user] = await Promise.all([
      TerminalCategory.find().sort({ createdAt: 1, _id: 1 })
        .populate('questions', 'title description difficulty points').lean(),
      User.findById(req.userId).select('solvedTerminalQuestions'),
    ]);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const publicCategories = categories.map(category => {
      const seen = new Set();
      const questions = category.questions.filter(question => {
        if (!question || seen.has(String(question._id))) return false;
        seen.add(String(question._id));
        return true;
      }).map(({ _id, title, description, difficulty, points }) => ({ _id, title, description, difficulty, points }));
      return { _id: category._id, name: category.name, levelName: category.levelName,
        levelColor: category.levelColor, badge: category.badge || null, questions, questionCount: questions.length };
    });
    res.json({ categories: terminalCategoryAccess(publicCategories, user.solvedTerminalQuestions || []) });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load terminal categories. Please try again.' });
  }
};

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
    const { questionId, command, categoryId } = req.body;
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

    const categories = await TerminalCategory.find().sort({ createdAt: 1, _id: 1 })
      .populate('questions', '_id').lean();
    const accessible = terminalCategoryAccess(categories, user.solvedTerminalQuestions || []);
    const memberships = accessible.filter(category => category.questions.some(item => item && String(item._id ?? item) === questionId));
    const requestedCategory = categoryId ? accessible.find(category => String(category._id) === categoryId) : null;
    if (categoryId && (!requestedCategory || !memberships.includes(requestedCategory))) {
      return res.status(400).json({ message: 'Problem is not part of this category.' });
    }
    const blocked = categoryId ? requestedCategory.locked : memberships.length > 0 && memberships.every(category => category.locked);
    if (blocked) {
      const prerequisite = requestedCategory?.prerequisiteName || memberships[0].prerequisiteName;
      return res.status(403).json({ message: `Complete all problems in ${prerequisite} to unlock this category.` });
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
      user.level = levelFromXp(user.xp);
      
      
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

