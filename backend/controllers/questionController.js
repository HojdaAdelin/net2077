import Question from '../models/Question.js';
import User from '../models/User.js';

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

    // Check if already solved
    const alreadySolved = user.solvedQuestions.some(
      id => id.toString() === questionId.toString()
    );

    if (!alreadySolved) {
      user.solvedQuestions.push(questionId);
      user.xp += question.points || 1;
      user.level = Math.floor(user.xp / 100) + 1;
      
      // Update solvedByTag
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
      console.log(`✅ Question ${questionId} marked as solved for user ${user.username}`);
    } else {
      console.log(`ℹ️  Question ${questionId} already solved by user ${user.username}`);
    }
    
    res.json({ 
      xp: user.xp, 
      level: user.level,
      solvedByTag: user.solvedByTag,
      alreadySolved 
    });
  } catch (error) {
    console.error('Error marking question as solved:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
