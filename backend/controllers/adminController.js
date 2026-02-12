import User from '../models/User.js';

/**
 * Update user role (Admin only)
 */
export const updateUserRole = async (req, res) => {
  try {
    const { userId, newRole } = req.body;

    // Validate role
    const validRoles = ['user', 'helper', 'mod', 'head-mod', 'admin', 'head-admin', 'root'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ 
        message: 'Invalid role',
        validRoles 
      });
    }

    // Role hierarchy for permission checking
    const roleHierarchy = {
      'user': 0,
      'helper': 1,
      'mod': 2,
      'head-mod': 3,
      'admin': 4,
      'head-admin': 5,
      'root': 6
    };

    // Find target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get current user's role level
    const currentUserRoleLevel = roleHierarchy[req.user.role] || 0;
    const targetUserRoleLevel = roleHierarchy[targetUser.role] || 0;
    const newRoleLevel = roleHierarchy[newRole] || 0;

    // Prevent modifying users with equal or higher role
    if (targetUserRoleLevel >= currentUserRoleLevel && req.user.id !== userId) {
      return res.status(403).json({ 
        message: 'Cannot modify user with equal or higher role' 
      });
    }

    // Prevent assigning role equal or higher than your own (except root can do anything)
    if (newRoleLevel >= currentUserRoleLevel && req.user.role !== 'root') {
      return res.status(403).json({ 
        message: 'Cannot assign role equal or higher than your own' 
      });
    }

    // Prevent self-demotion from critical roles
    if (req.user.id === userId && ['root', 'head-admin'].includes(targetUser.role) && newRole !== targetUser.role) {
      return res.status(400).json({ 
        message: 'Cannot demote yourself from critical role' 
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
    const validRoles = ['user', 'helper', 'mod', 'head-mod', 'admin', 'head-admin', 'root'];
    if (role && validRoles.includes(role)) {
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
      'head-mod': 0,
      admin: 0,
      'head-admin': 0,
      root: 0
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
