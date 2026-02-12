import User from '../models/User.js';

/**
 * Update user role (Admin only)
 */
export const updateUserRole = async (req, res) => {
  try {
    const { userId, newRole } = req.body;

    // Validate role
    const validRoles = ['user', 'helper', 'mod', 'admin'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ 
        message: 'Invalid role',
        validRoles 
      });
    }

    // Find target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent self-demotion from admin
    if (req.user.id === userId && targetUser.role === 'admin' && newRole !== 'admin') {
      return res.status(400).json({ 
        message: 'Cannot demote yourself from admin role' 
      });
    }

    // Update role
    targetUser.role = newRole;
    await targetUser.save();

    res.json({ 
      success: true,
      message: `User ${targetUser.username} role updated to ${newRole}`,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get all users with their roles (Admin/Mod only)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, role, search } = req.query;

    const query = {};
    
    // Filter by role if provided
    if (role && ['user', 'helper', 'mod', 'admin'].includes(role)) {
      query.role = role;
    }

    // Search by username or email
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('username email role xp level createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalUsers: count
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get role statistics (Admin only)
 */
export const getRoleStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const roleStats = {
      user: 0,
      helper: 0,
      mod: 0,
      admin: 0
    };

    stats.forEach(stat => {
      roleStats[stat._id] = stat.count;
    });

    const totalUsers = await User.countDocuments();

    res.json({
      roleStats,
      totalUsers
    });
  } catch (error) {
    console.error('Error fetching role stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
