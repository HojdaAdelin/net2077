import User from '../models/User.js';

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

    const sortField = `solvedByTag.${normalizedTag}`;

    const topUsers = await User.find({ [`solvedByTag.${normalizedTag}`]: { $gt: 0 } })
      .select(`username level role solvedByTag`)
      .sort({ [sortField]: -1 })
      .limit(5)
      .lean();

    const leaderboard = topUsers.map((u, i) => ({
      rank: i + 1,
      username: u.username,
      solved: u.solvedByTag?.[normalizedTag] || 0,
      level: u.level || 1,
      role: u.role || 'user'
    }));

    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Category leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category leaderboard' });
  }
};
