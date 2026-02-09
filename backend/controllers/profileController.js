import User from '../models/User.js';

export const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username }).select('-password -email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate total questions solved
    const totalQuestionsSolved = user.solvedByTag.LINUX + user.solvedByTag.NETWORK + user.solvedTerminalQuestions.length + user.solvedIS.length;
    
    // Determine preferred category
    const categoryStats = {
      linux: user.solvedByTag.LINUX || 0,
      network: user.solvedByTag.NETWORK || 0,
      terminal: user.terminalStats.solved || 0,
      is: user.isStats?.solved || 0
    };
    
    const preferredCategory = Object.entries(categoryStats).reduce((a, b) => 
      categoryStats[a[0]] > categoryStats[b[0]] ? a : b
    )[0];

    // Calculate leaderboard rank
    const usersAbove = await User.countDocuments({ xp: { $gt: user.xp } });
    const leaderboardRank = usersAbove + 1;

    const profileData = {
      username: user.username,
      xp: user.xp,
      level: user.level,
      totalQuestionsSolved,
      streak: {
        current: user.streak.current,
        max: user.streak.max
      },
      preferredCategory: preferredCategory.charAt(0).toUpperCase() + preferredCategory.slice(1),
      categoryStats,
      leaderboardRank,
      joinedAt: user.createdAt,
      lastActivity: user.streak.lastActivity
    };

    res.json(profileData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getCurrentUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate total questions solved
    const totalQuestionsSolved = user.solvedByTag.LINUX + user.solvedByTag.NETWORK + user.solvedTerminalQuestions.length + user.solvedIS.length;
    
    // Determine preferred category
    const categoryStats = {
      linux: user.solvedByTag.LINUX || 0,
      network: user.solvedByTag.NETWORK || 0,
      terminal: user.terminalStats.solved || 0,
      is: user.isStats?.solved || 0
    };
    
    const preferredCategory = Object.entries(categoryStats).reduce((a, b) => 
      categoryStats[a[0]] > categoryStats[b[0]] ? a : b
    )[0];

    const profileData = {
      username: user.username,
      xp: user.xp,
      level: user.level,
      totalQuestionsSolved,
      streak: {
        current: user.streak.current,
        max: user.streak.max
      },
      preferredCategory: preferredCategory.charAt(0).toUpperCase() + preferredCategory.slice(1),
      categoryStats,
      joinedAt: user.createdAt,
      lastActivity: user.streak.lastActivity
    };

    res.json(profileData);
  } catch (error) {
    console.error('Error fetching current user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};