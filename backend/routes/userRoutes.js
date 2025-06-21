/**
 * User Routes
 * API routes for user preference management
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { asyncHandler } = require('../utils/errorHandler');
const auth = require('../middleware/auth');
const validator = require('../middleware/validator');

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', auth, asyncHandler(userController.getUserProfile));

/**
 * @route   PUT /api/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put(
  '/preferences',
  auth,
  validator.validatePreferences,
  asyncHandler(userController.updateUserPreferences)
);

/**
 * @route   GET /api/users/reading-history
 * @desc    Get user reading history
 * @access  Private
 */
router.get(
  '/reading-history',
  auth,
  asyncHandler(userController.getUserReadingHistory)
);

/**
 * @route   POST /api/users/articles/:articleId/save
 * @desc    Save article for later reading
 * @access  Private
 */
router.post(
  '/articles/:articleId/save',
  auth,
  asyncHandler(userController.saveArticle)
);

/**
 * @route   DELETE /api/users/articles/:articleId/save
 * @desc    Remove saved article
 * @access  Private
 */
router.delete(
  '/articles/:articleId/save',
  auth,
  asyncHandler(userController.removeSavedArticle)
);

/**
 * @route   GET /api/users/interests
 * @desc    Get user interests
 * @access  Private
 */
router.get(
  '/interests',
  auth,
  asyncHandler(userController.getUserInterests)
);

/**
 * @route   PUT /api/users/interests
 * @desc    Update user interests
 * @access  Private
 */
router.put(
  '/interests',
  auth,
  validator.validateInterests,
  asyncHandler(userController.updateUserInterests)
);

/**
 * @route   GET /api/users/reading-habits
 * @desc    Analyze user reading habits
 * @access  Private
 */
router.get(
  '/reading-habits',
  auth,
  asyncHandler(userController.analyzeReadingHabits)
);

/**
 * @route   GET /api/users/saved-articles
 * @desc    Get user saved articles
 * @access  Private
 */
router.get('/saved-articles', auth, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;
  
  const user = await require('../models/User').findById(userId)
    .populate({
      path: 'savedArticles',
      select: 'title description url publishedAt source category urlToImage',
      options: {
        sort: { publishedAt: -1 },
        skip: (parseInt(page) - 1) * parseInt(limit),
        limit: parseInt(limit)
      }
    });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  const total = user.savedArticles.length;
  
  res.status(200).json({
    success: true,
    data: {
      savedArticles: user.savedArticles,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  auth,
  validator.validateUserProfile,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, email } = req.body;
    
    const user = await require('../models/User').findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (name) user.name = name;
    if (email) user.email = email;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        name: user.name,
        email: user.email
      }
    });
  })
);

module.exports = router;
