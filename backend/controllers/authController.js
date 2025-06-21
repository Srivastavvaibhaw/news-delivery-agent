/**
 * Auth Controller
 * Handles user authentication and authorization
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Create new user
    const user = new User({
      name,
      email,
      password,
      preferences: {
        categories: ['general', 'technology'],
        maxArticles: 15,
        refreshInterval: 30,
        notificationsEnabled: true
      },
      interests: []
    });
    
    // Save user
    await user.save();
    
    // Create token
    const token = jwt.sign(
      { id: user._id },
      config.AUTH.JWT_SECRET,
      { expiresIn: config.AUTH.JWT_EXPIRY }
    );
    
    // Return user and token
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (error) {
    logger.error(`Error registering user: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message
    });
  }
}

/**
 * Login user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Create token
    const token = jwt.sign(
      { id: user._id },
      config.AUTH.JWT_SECRET,
      { expiresIn: config.AUTH.JWT_EXPIRY }
    );
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Return user and token
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (error) {
    logger.error(`Error logging in user: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message
    });
  }
}

/**
 * Get current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getCurrentUser(req, res) {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('-password -__v');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error(`Error getting current user: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get current user',
      error: error.message
    });
  }
}

/**
 * Change password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function changePassword(req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }
    
    // Find user
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error(`Error changing password: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
}

/**
 * Request password reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email'
      });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User with this email does not exist'
      });
    }
    
    // Generate reset token
    const resetToken = jwt.sign(
      { id: user._id },
      config.AUTH.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // In a real application, send email with reset link
    // For this example, just return the token
    logger.info(`Password reset requested for ${email}`);
    
    return res.status(200).json({
      success: true,
      message: 'Password reset link sent to email',
      // For development purposes only, remove in production
      devToken: resetToken
    });
  } catch (error) {
    logger.error(`Error requesting password reset: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to request password reset',
      error: error.message
    });
  }
}

/**
 * Reset password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide token and new password'
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.AUTH.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    // Find user
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    logger.error(`Error resetting password: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
}

/**
 * Logout user (client-side function)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function logout(req, res) {
  // JWT tokens are stateless, so we just return success
  // In a real app, you might want to invalidate the token on the client side
  // or add it to a blacklist if using a token store
  return res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
}

module.exports = {
  register,
  login,
  getCurrentUser,
  changePassword,
  requestPasswordReset,
  resetPassword,
  logout
};
