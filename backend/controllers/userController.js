/**
 * User Controller
 * Handles user management and preferences
 */

const User = require('../models/User');
const UserHistory = require('../models/UserHistory');
const logger = require('../utils/logger');
const personalizer = require('../services/personalizer');

/**
 * Get user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserProfile(req, res) {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId)
      .select('-password -__v')
      .populate('readingHistory.article', 'title url publishedAt source');
    
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
    logger.error(`Error getting user profile: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message
    });
  }
}

/**
 * Update user preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateUserPreferences(req, res) {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({
        success: false,
        message: 'Preferences are required'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update user preferences
    user.preferences = {
      ...user.preferences,
      ...preferences
    };
    
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: user.preferences
    });
  } catch (error) {
    logger.error(`Error updating user preferences: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
      error: error.message
    });
  }
}

/**
 * Get user reading history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserReadingHistory(req, res) {
  try {
    const userId = req.user.id;
    const { limit = 20, page = 1 } = req.query;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get reading history with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const history = await UserHistory.find({ user: userId })
      .sort({ readAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('article', 'title description url publishedAt source category');
    
    // Get total count for pagination
    const total = await UserHistory.countDocuments({ user: userId });
    
    return res.status(200).json({
      success: true,
      data: {
        history,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error(`Error getting user reading history: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get reading history',
      error: error.message
    });
  }
}

/**
 * Save article for later reading
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function saveArticle(req, res) {
  try {
    const userId = req.user.id;
    const { articleId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if article is already saved
    const isAlreadySaved = user.savedArticles.includes(articleId);
    
    if (isAlreadySaved) {
      return res.status(400).json({
        success: false,
        message: 'Article is already saved'
      });
    }
    
    // Save article
    user.savedArticles.push(articleId);
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Article saved successfully'
    });
  } catch (error) {
    logger.error(`Error saving article: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to save article',
      error: error.message
    });
  }
}

/**
 * Remove saved article
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function removeSavedArticle(req, res) {
  try {
    const userId = req.user.id;
    const { articleId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Remove article from saved articles
    user.savedArticles = user.savedArticles.filter(
      id => id.toString() !== articleId
    );
    
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Article removed successfully'
    });
  } catch (error) {
    logger.error(`Error removing saved article: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove article',
      error: error.message
    });
  }
}

/**
 * Get user interests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserInterests(req, res) {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('interests');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: user.interests
    });
  } catch (error) {
    logger.error(`Error getting user interests: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user interests',
      error: error.message
    });
  }
}

/**
 * Update user interests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateUserInterests(req, res) {
  try {
    const userId = req.user.id;
    const { interests } = req.body;
    
    if (!interests || !Array.isArray(interests)) {
      return res.status(400).json({
        success: false,
        message: 'Interests must be an array'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update user interests
    user.interests = interests;
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Interests updated successfully',
      data: user.interests
    });
  } catch (error) {
    logger.error(`Error updating user interests: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update interests',
      error: error.message
    });
  }
}

/**
 * Analyze user reading habits to suggest interests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function analyzeReadingHabits(req, res) {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId)
      .populate({
        path: 'readingHistory.article',
        select: 'title description content category tags'
      });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user has enough reading history
    if (!user.readingHistory || user.readingHistory.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Not enough reading history to analyze'
      });
    }
    
    // Analyze reading habits to suggest interests
    const suggestedInterests = await personalizer.analyzeReadingHabits(user);
    
    return res.status(200).json({
      success: true,
      data: suggestedInterests
    });
  } catch (error) {
    logger.error(`Error analyzing reading habits: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze reading habits',
      error: error.message
    });
  }
}

module.exports = {
  getUserProfile,
  updateUserPreferences,
  getUserReadingHistory,
  saveArticle,
  removeSavedArticle,
  getUserInterests,
  updateUserInterests,
  analyzeReadingHabits
};
