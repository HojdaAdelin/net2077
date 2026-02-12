import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware to check if user has required role(s)
 * @param {Array|String} allowedRoles - Single role or array of allowed roles
 * @returns {Function} Express middleware function
 * 
 * Role Hierarchy (lowest to highest):
 * user < helper < mod < head-mod < admin < head-admin < root
 * 
 * Usage:
 * - checkRole('admin') - only admin
 * - checkRole(['admin', 'mod']) - admin or mod
 */
export const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Get token from cookie
      const token = req.cookies.token;
      
      if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Verify token and extract user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      // Fetch user from database to get REAL role (not from token/request)
      const user = await User.findById(userId).select('role username');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Normalize allowedRoles to array
      const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      // Check if user's role is in allowed roles
      if (!rolesArray.includes(user.role)) {
        return res.status(403).json({ 
          message: 'Access denied. Insufficient permissions.',
          requiredRole: rolesArray,
          userRole: user.role
        });
      }

      // Attach user info to request for use in route handlers
      req.user = {
        id: userId,
        username: user.username,
        role: user.role
      };

      next();
    } catch (error) {
      console.error('Role check error:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      
      return res.status(500).json({ message: 'Authorization error' });
    }
  };
};

/**
 * Middleware to check if user is admin
 * Shorthand for checkRole('admin')
 */
export const isAdmin = checkRole('admin');

/**
 * Middleware to check if user is head admin or above
 * Shorthand for checkRole(['head-admin', 'root'])
 */
export const isHeadAdmin = checkRole(['head-admin', 'root']);

/**
 * Middleware to check if user is root
 * Shorthand for checkRole('root')
 */
export const isRoot = checkRole('root');

/**
 * Middleware to check if user is admin or moderator
 * Shorthand for checkRole(['admin', 'mod'])
 */
export const isModerator = checkRole(['admin', 'head-admin', 'root', 'mod', 'head-mod']);

/**
 * Middleware to check if user is head moderator or above
 * Shorthand for checkRole(['head-mod', 'admin', 'head-admin', 'root'])
 */
export const isHeadMod = checkRole(['head-mod', 'admin', 'head-admin', 'root']);

/**
 * Middleware to check if user is staff (admin, mod, or helper)
 * Shorthand for checkRole(['admin', 'mod', 'helper'])
 */
export const isStaff = checkRole(['admin', 'head-admin', 'root', 'mod', 'head-mod', 'helper']);
