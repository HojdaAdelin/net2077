import User from '../models/User.js';
import Question from '../models/Question.js';

export const getLeaderboard = async (req, res) => {
  try {
    const topUsers = await User.find({})
      .select('username xp level role')
      .sort({ xp: -1 })
      .limit(10)
      .lean();

    const leaderboard = topUsers.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      xp: user.xp || 0,
      level: user.level || 1,
      role: user.role || 'user'
    }));

    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
};

export const getCategoryLeaderboard = async (req, res) => {
  try {
    const { tag } = req.params;
    const validTags = ['LINUX', 'NETWORK', 'ARDUINO'];
    const normalizedTag = tag.toUpperCase();

    if (!validTags.includes(normalizedTag)) {
      return res.status(400).json({ success: false, message: 'Invalid category tag' });
    }

    // Get all question IDs for this tag
    const questions = await Question.find({ tags: normalizedTag }).select('_id').lean();
    const questionIds = new Set(questions.map(q => q._id.toString()));

    // Load users who solved at least one question, count per-tag solved
    const users = await User.find({ solvedQuestions: { $exists: true, $not: { $size: 0 } } })
      .select('username solvedQuestions level role')
      .lean();

    const ranked = users
      .map(u => {
        const count = (u.solvedQuestions || []).filter(id => questionIds.has(id.toString())).length;
        return { username: u.username, solved: count, level: u.level || 1, role: u.role || 'user' };
      })
      .filter(u => u.solved > 0)
      .sort((a, b) => b.solved - a.solved)
      .slice(0, 5)
      .map((u, i) => ({ rank: i + 1, ...u }));

    res.json({ success: true, leaderboard: ranked });
  } catch (error) {
    console.error('Category leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category leaderboard' });
  }
};
