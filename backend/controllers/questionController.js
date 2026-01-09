import Question from '../models/Question.js';
import User from '../models/User.js';
import { updateUserStreak } from '../utils/streakUtils.js';

export const getQuestions = async (req, res) => {
  try {
    const { type, tags } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if (tags) {
      const tagArray = tags.split(',');
      filter.tags = { $in: tagArray };
    }
    
    const questions = await Question.find(filter);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUnsolvedQuestions = async (req, res) => {
  try {
    const { type, tags } = req.query;
    const user = await User.findById(req.userId);
    
    const filter = { _id: { $nin: user.solvedQuestions } };
    
    if (type) filter.type = type;
    if (tags) {
      const tagArray = tags.split(',');
      filter.tags = { $in: tagArray };
    }
    
    const questions = await Question.find(filter);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getRandom50 = async (req, res) => {
  try {
    const { type, tags } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if (tags) {
      const tagArray = tags.split(',');
      filter.tags = { $in: tagArray };
    }
    
    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: 50 } }
    ]);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const markSolved = async (req, res) => {
  try {
    const { questionId } = req.body;
    const user = await User.findById(req.userId);
    const question = await Question.findById(questionId);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const alreadySolved = user.solvedQuestions.some(
      id => id.toString() === questionId.toString()
    );

    if (!alreadySolved) {
      user.solvedQuestions.push(questionId);
      user.xp += question.points || 1;
      user.level = Math.floor(user.xp / 100) + 1;
      
      await updateUserStreak(user);
      
      if (question.tags && question.tags.length > 0) {
        question.tags.forEach(tag => {
          if (tag === 'LINUX' || tag === 'NETWORK') {
            if (!user.solvedByTag) {
              user.solvedByTag = { LINUX: 0, NETWORK: 0 };
            }
            user.solvedByTag[tag] = (user.solvedByTag[tag] || 0) + 1;
          }
        });
      }
      
      await user.save();
      console.log(`[✔] Question ${questionId} marked as solved for user ${user.username}`);
    } else {
      console.log(`[✘]  Question ${questionId} already solved by user ${user.username}`);
    }
    
    res.json({ 
      xp: user.xp, 
      level: user.level,
      solvedByTag: user.solvedByTag,
      alreadySolved,
      streak: {
        current: user.streak?.current || 0,
        max: user.streak?.max || 0,
        isActive: true
      }
    });
  } catch (error) {
    console.error('Error marking question as solved:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


export const dailyLinux = async (req, res) => {
  try {
    const questions = await Question.aggregate([
      { $match: { tags: { $in: ['LINUX'] } } },
      { $sample: { size: 20 } }
    ]);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getDailyChallengeStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const today = new Date().toISOString().split('T')[0]; 
    const isCompleted = user.dailyChallenge && user.dailyChallenge.lastCompleted === today;
    
    const now = new Date();
    const today13 = new Date();
    today13.setHours(13, 0, 0, 0);
    
    let next13;
    if (now >= today13) {
      next13 = new Date(today13);
      next13.setDate(next13.getDate() + 1);
    } else {

      next13 = today13;
    }
    
    const diff = next13 - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    res.json({
      completed: isCompleted,
      timeUntilNext: `${hours}h ${minutes}m`,
      lastScore: user.dailyChallenge?.lastScore || 0,
      lastTotalPoints: user.dailyChallenge?.lastTotalPoints || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const completeDailyChallenge = async (req, res) => {
  try {
    const { score, totalPoints } = req.body;
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const today = new Date().toISOString().split('T')[0]; 
    
    if (user.dailyChallenge && user.dailyChallenge.lastCompleted === today) {
      return res.status(400).json({ message: 'Daily challenge already completed today' });
    }

    const doubleXP = score * 2;
    user.xp += doubleXP;
    user.level = Math.floor(user.xp / 100) + 1;
    
    if (!user.dailyChallenge) {
      user.dailyChallenge = {};
    }
    user.dailyChallenge.lastCompleted = today;
    user.dailyChallenge.lastScore = score;
    user.dailyChallenge.lastTotalPoints = totalPoints;
    
    await user.save();
    
    console.log(`[✔] Daily challenge completed by user ${user.username}: ${score}/${totalPoints} points (${doubleXP} XP gained)`);
    
    res.json({ 
      xp: user.xp, 
      level: user.level,
      pointsAdded: doubleXP,
      challengeCompleted: true
    });
  } catch (error) {
    console.error('Error completing daily challenge:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
export const resetBasicStats = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all basic commands questions (type: 'basic')
    const basicQuestions = await Question.find({ type: 'basic' });
    const basicQuestionIds = basicQuestions.map(q => q._id.toString());
    
    // Count how many basic questions the user has solved
    const solvedBasicQuestions = user.solvedQuestions.filter(
      questionId => basicQuestionIds.includes(questionId.toString())
    );
    
    // Check if user has at least 50 solved basic questions
    if (solvedBasicQuestions.length < 50) {
      return res.status(400).json({ 
        message: 'You need at least 50 solved basic commands questions to reset stats',
        currentSolved: solvedBasicQuestions.length
      });
    }

    // Remove basic questions from user solved questions
    user.solvedQuestions = user.solvedQuestions.filter(
      questionId => !basicQuestionIds.includes(questionId.toString())
    );
    
    // Add XP for each solved basic question (1 point each)
    const xpToAdd = solvedBasicQuestions.length;
    user.xp += xpToAdd;
    user.level = Math.floor(user.xp / 100) + 1;
    
    await user.save();
    
    console.log(`[✔] Basic stats reset for user ${user.username}: ${solvedBasicQuestions.length} questions reset, ${xpToAdd} XP added`);
    
    res.json({
      message: 'Basic commands stats reset successfully',
      questionsReset: solvedBasicQuestions.length,
      xpAdded: xpToAdd,
      newXp: user.xp,
      newLevel: user.level
    });
  } catch (error) {
    console.error('Error resetting basic stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};