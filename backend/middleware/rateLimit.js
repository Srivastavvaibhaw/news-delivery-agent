/**
 * Rate Limit Middleware
 * Limits the number of requests from a single IP address
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Create a rate limiter with custom options
 * @param {Object} options - Rate limiter options
 * @returns {Function} Rate limiter middleware
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: config.RATE_LIMIT.WINDOW_MS,
    max: config.RATE_LIMIT.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      const ip = req.ip || req.connection.remoteAddress;
      logger.warn(`Rate limit exceeded for IP: ${ip}, Path: ${req.path}`);
      
      res.status(options.statusCode).json({
        success: false,
        message: options.message || 'Too many requests, please try again later',
        retryAfter: Math.ceil(options.windowMs / 1000 / 60) // in minutes
      });
    },
    skip: (req) => {
      // Skip rate limiting for certain routes or IPs if needed
      // For example, skip for admin users or internal API calls
      return false;
    },
    keyGenerator: (req) => {
      // Use IP address as default key
      return req.ip || req.connection.remoteAddress;
    },
    onLimitReached: (req, res, options) => {
      const ip = req.ip || req.connection.remoteAddress;
      logger.warn(`Rate limit reached for IP: ${ip}, Path: ${req.path}`);
    }
  };
  
  return rateLimit({
    ...defaultOptions,
    ...options
  });
};

// Default rate limiter middleware
const limiter = createRateLimiter();

// API rate limiter middleware
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many API requests, please try again later'
});

// Authentication rate limiter middleware (more strict)
const authLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 auth requests per hour
  message: 'Too many authentication attempts, please try again later'
});

// Search rate limiter middleware
const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 search requests per minute
  message: 'Too many search requests, please try again after a minute'
});

module.exports = {
  createRateLimiter,
  limiter,
  apiLimiter,
  authLimiter,
  searchLimiter
};

// Export default limiter for convenience
module.exports.default = limiter;
