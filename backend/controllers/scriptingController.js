import Scripting from '../models/Scripting.js';
import User from '../models/User.js';
import { calculateXPWithBoosts } from './shopController.js';
import { trackCompetitiveXP } from './competitiveController.js';

export const getAllProblems = async (req, res) => {
  try {
    const problems = await Scripting.find();
    const user = await User.findById(req.userId);

    const result = problems.map(p => {
      const isCompleted = user.solvedScripting?.some(id => id.toString() === p._id.toString()) || false;
      const obj = p.toObject();
      if (!isCompleted) delete obj.correctAnswers;
      return { ...obj, isCompleted };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await Scripting.findById(id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const user = await User.findById(req.userId);
    const isCompleted = user.solvedScripting?.some(sid => sid.toString() === id) || false;

    const obj = problem.toObject();
    if (!isCompleted) delete obj.correctAnswers;

    res.json({ ...obj, isCompleted });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const { selectedAnswers } = req.body; 

    const problem = await Scripting.findById(id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const user = await User.findById(req.userId);
    const alreadySolved = user.solvedScripting?.some(sid => sid.toString() === id);

    if (alreadySolved) {
      return res.json({ success: true, message: 'Already solved!', xpGained: 0, alreadySolved: true });
    }

    const correct = problem.correctAnswers;
    const selected = [...selectedAnswers].sort((a, b) => a - b);
    const expected = [...correct].sort((a, b) => a - b);

    const isCorrect =
      selected.length === expected.length &&
      selected.every((v, i) => v === expected[i]);

    if (isCorrect) {
      if (!user.solvedScripting) user.solvedScripting = [];
      user.solvedScripting.push(problem._id);
      if (!user.scriptingStats) user.scriptingStats = { solved: 0 };
      user.scriptingStats.solved += 1;

      const finalXP = await calculateXPWithBoosts(user._id, problem.xp);
      user.xp += finalXP;
      user.level = Math.floor(user.xp / 100) + 1;
      await trackCompetitiveXP(user._id, finalXP);
      await user.save();

      return res.json({
        success: true,
        message: `Correct! +${finalXP} XP`,
        xpGained: finalXP,
        newXP: user.xp,
        newLevel: user.level,
        correctAnswers: problem.correctAnswers
      });
    }

    res.json({ success: false, message: 'Wrong answer. Try again!', xpGained: 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
