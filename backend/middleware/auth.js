/**
 * Authentication Middleware
 * Verifies JWT token and adds user data to request object
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { createApiError } = require('../utils/errorHandler');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate requests using JWT
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createApiError('Authentication required', 401));
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(createApiError('Authentication required', 401));
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, config.AUTH.JWT_SECRET);
      
      // Find user
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(createApiError('User not found', 404));
      }
      
      if (!user.isActive) {
        return next(createApiError('User account is deactivated', 403));
      }
      
      // Add user to request object
      req.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      
      // Update last active timestamp (but don't wait for it)
      User.findByIdAndUpdate(user._id, { 
        $set: { lastLogin: new Date() } 
      }).catch(err => {
        logger.error(`Failed to update last active timestamp: ${err.message}`);
      });
      
      next();
    } catch (err) {
      if (err.name === 'JsonWebTokenError') {
        return next(createApiError('Invalid token', 401));
      }
      
      if (err.name === 'TokenExpiredError') {
        return next(createApiError('Token expired', 401));
      }
      
      throw err;
    }
  } catch (err) {
    logger.error(`Auth middleware error: ${err.message}`);
    next(createApiError('Authentication failed', 500));
  }
};

/**
 * Middleware to check if user has required role
 * @param {string|Array} roles - Required role(s)
 * @returns {Function} Middleware function
 */
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createApiError('Authentication required', 401));
    }
    
    const userRole = req.user.role;
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!requiredRoles.includes(userRole)) {
      return next(
        createApiError('Not authorized to access this resource', 403)
      );
    }
    
    next();
  };
};

/**
 * Optional authentication middleware
 * Verifies JWT token if present, but doesn't require it
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    // If no token, continue without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, config.AUTH.JWT_SECRET);
      
      // Find user
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        // Add user to request object
        req.user = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
      
      next();
    } catch (err) {
      // If token is invalid, continue without authentication
      next();
    }
  } catch (err) {
    logger.error(`Optional auth middleware error: ${err.message}`);
    next();
  }
};

module.exports = {
  auth,
  authorize,
  optionalAuth
};
