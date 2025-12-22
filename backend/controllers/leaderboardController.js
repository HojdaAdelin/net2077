import User from '../models/User.js';

export const getLeaderboard = async (req, res) => {
  try {
    const topUsers = await User.find({})
      .select('username xp level')
      .sort({ xp: -1 })
      .limit(10)
      .lean();

    const leaderboard = topUsers.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      xp: user.xp || 0,
      level: user.level || 1
    }));

    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard'
    });
  }
};