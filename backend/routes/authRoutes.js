/**
 * Authentication Routes
 * API routes for user authentication
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { asyncHandler } = require('../utils/errorHandler');
const validator = require('../middleware/validator');
const rateLimit = require('../middleware/rateLimit');
const auth = require('../middleware/auth');

// Apply stricter rate limiting to auth routes
const authRateLimit = rateLimit.createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later'
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authRateLimit,
  validator.validateRegistration,
  asyncHandler(authController.register)
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authRateLimit,
  validator.validateLogin,
  asyncHandler(authController.login)
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me',
  auth,
  asyncHandler(authController.getCurrentUser)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side function)
 * @access  Private
 */
router.post(
  '/logout',
  auth,
  asyncHandler(authController.logout)
);

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 * @access  Private
 */
router.put(
  '/password',
  auth,
  authRateLimit,
  validator.validatePasswordChange,
  asyncHandler(authController.changePassword)
);

/**
 * @route   POST /api/auth/password/reset-request
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/password/reset-request',
  authRateLimit,
  validator.validateEmail,
  asyncHandler(authController.requestPasswordReset)
);

/**
 * @route   POST /api/auth/password/reset
 * @desc    Reset password
 * @access  Public
 */
router.post(
  '/password/reset',
  authRateLimit,
  validator.validatePasswordReset,
  asyncHandler(authController.resetPassword)
);

/**
 * @route   GET /api/auth/verify-token
 * @desc    Verify JWT token
 * @access  Private
 */
router.get(
  '/verify-token',
  auth,
  asyncHandler((req, res) => {
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        userId: req.user.id
      }
    });
  })
);

module.exports = router;
