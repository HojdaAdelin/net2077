import IS from '../models/IS.js';
import User from '../models/User.js';

export const getAllISProblems = async (req, res) => {
  try {
    const problems = await IS.find().select('-officialcode');
    const user = await User.findById(req.userId);
    
    const problemsWithStatus = problems.map(problem => ({
      ...problem.toObject(),
      isCompleted: user.solvedIS.includes(problem._id)
    }));
    
    res.json(problemsWithStatus);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getISProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await IS.findById(id).select('-officialcode');
    const user = await User.findById(req.userId);
    
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    
    const isCompleted = user.solvedIS.includes(problem._id);
    
    res.json({
      ...problem.toObject(),
      isCompleted
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const submitISCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;
    const user = await User.findById(req.userId);
    const problem = await IS.findById(id);
    
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Normalize code by removing all whitespace and converting to lowercase
    const normalizeCode = (str) => {
      return str.replace(/\s+/g, '').toLowerCase();
    };

    const normalizedSubmitted = normalizeCode(code);
    const normalizedOfficial = normalizeCode(problem.officialcode);

    const isCorrect = normalizedSubmitted === normalizedOfficial;

    if (isCorrect && !user.solvedIS.includes(problem._id)) {
      // Add problem to solved list
      user.solvedIS.push(problem._id);
      user.isStats.solved += 1;
      
      // Add XP
      user.xp += problem.xp;
      user.level = Math.floor(user.xp / 100) + 1;
      
      await user.save();
      
      return res.json({
        success: true,
        message: `Correct! +${problem.xp} XP`,
        xpGained: problem.xp,
        newXP: user.xp,
        newLevel: user.level
      });
    } else if (isCorrect && user.solvedIS.includes(problem._id)) {
      return res.json({
        success: true,
        message: 'Already solved!',
        xpGained: 0
      });
    } else {
      return res.json({
        success: false,
        message: 'Incorrect solution. Try again!'
      });
    }
  } catch (error) {
    console.error('Error submitting IS code:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};