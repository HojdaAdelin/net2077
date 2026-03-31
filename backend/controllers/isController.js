import IS from '../models/IS.js';
import User from '../models/User.js';
import { calculateXPWithBoosts } from './shopController.js';

export const getAllISProblems = async (req, res) => {
  try {
    const problems = await IS.find().select('-officialcode -tests');
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
    const problem = await IS.findById(id).select('-officialcode -tests');
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

export const getISTestInput = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await IS.findById(id).select('tests');
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const cases = problem.tests?.cases || [];
    const t = problem.tests?.t || cases.length;

    // Build full input: t on first line, then each case input on its own line
    const inputLines = cases
      .filter(c => c.input && c.input.trim() !== '')
      .map(c => c.input);

    const fullInput = inputLines.length > 0
      ? `${t}\n${inputLines.join('\n')}`
      : `${t}`;

    res.json({ input: fullInput, t });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const submitISCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { outputs } = req.body; // array of strings, one per test case
    const user = await User.findById(req.userId);
    const problem = await IS.findById(id);
    
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const cases = problem.tests?.cases || [];

    if (!outputs || outputs.length === 0) {
      return res.status(400).json({ message: 'No output provided' });
    }

    // Build expected: all outputs concatenated, strip all whitespace
    const expectedCombined = cases.map(tc => tc.output).join('').replace(/\s+/g, '');
    // User submits one string with all outputs - strip all whitespace
    const submittedCombined = (outputs[0] || '').replace(/\s+/g, '');

    const allPassed = submittedCombined === expectedCombined;

    if (allPassed && !user.solvedIS.includes(problem._id)) {
      user.solvedIS.push(problem._id);
      user.isStats.solved += 1;
      const finalXP = await calculateXPWithBoosts(user._id, problem.xp);
      user.xp += finalXP;
      user.level = Math.floor(user.xp / 100) + 1;
      await user.save();
      return res.json({ success: true, message: `All tests passed! +${finalXP} XP`, xpGained: finalXP, newXP: user.xp, newLevel: user.level });
    } else if (allPassed && user.solvedIS.includes(problem._id)) {
      return res.json({ success: true, message: 'Already solved!', xpGained: 0 });
    } else {
      return res.json({ success: false, message: 'Incorrect output. Try again!', xpGained: 0 });
    }
  } catch (error) {
    console.error('Error submitting IS output:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};