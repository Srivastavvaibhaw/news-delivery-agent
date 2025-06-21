/**
 * Request Validation Middleware
 * Validates request bodies against defined schemas
 */

const { body, validationResult, param, query } = require('express-validator');
const { createApiError } = require('../utils/errorHandler');

/**
 * Process validation results and handle errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateResults = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return next(createApiError(
      'Validation Error', 
      400, 
      'VALIDATION_ERROR',
      errorMessages
    ));
  }
  
  next();
};

/**
 * Validation rules for user registration
 */
const validateRegistration = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),
  
  validateResults
];

/**
 * Validation rules for user login
 */
const validateLogin = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  validateResults
];

/**
 * Validation rules for password change
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/\d/).withMessage('New password must contain at least one number'),
  
  validateResults
];

/**
 * Validation rules for password reset request
 */
const validateEmail = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  validateResults
];

/**
 * Validation rules for password reset
 */
const validatePasswordReset = [
  body('token')
    .notEmpty().withMessage('Token is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/\d/).withMessage('New password must contain at least one number'),
  
  validateResults
];

/**
 * Validation rules for user preferences
 */
const validatePreferences = [
  body('preferences')
    .optional()
    .isObject().withMessage('Preferences must be an object'),
  
  body('preferences.categories')
    .optional()
    .isArray().withMessage('Categories must be an array'),
  
  body('preferences.sources')
    .optional()
    .isArray().withMessage('Sources must be an array'),
  
  body('preferences.maxArticles')
    .optional()
    .isInt({ min: 5, max: 50 }).withMessage('Max articles must be between 5 and 50'),
  
  body('preferences.refreshInterval')
    .optional()
    .isInt({ min: 15, max: 120 }).withMessage('Refresh interval must be between 15 and 120 minutes'),
  
  body('preferences.notificationsEnabled')
    .optional()
    .isBoolean().withMessage('Notifications enabled must be a boolean'),
  
  validateResults
];

/**
 * Validation rules for user interests
 */
const validateInterests = [
  body('interests')
    .isArray().withMessage('Interests must be an array')
    .custom(interests => {
      if (!interests.every(item => typeof item === 'string')) {
        throw new Error('Each interest must be a string');
      }
      return true;
    }),
  
  validateResults
];

/**
 * Validation rules for user profile update
 */
const validateUserProfile = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .optional()
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  validateResults
];

/**
 * Validation rules for article ID
 */
const validateArticleId = [
  param('articleId')
    .notEmpty().withMessage('Article ID is required')
    .isMongoId().withMessage('Invalid article ID format'),
  
  validateResults
];

/**
 * Validation rules for search query
 */
const validateSearchQuery = [
  query('query')
    .notEmpty().withMessage('Search query is required')
    .isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
  
  validateResults
];

module.exports = {
  validateResults,
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateEmail,
  validatePasswordReset,
  validatePreferences,
  validateInterests,
  validateUserProfile,
  validateArticleId,
  validateSearchQuery
};
