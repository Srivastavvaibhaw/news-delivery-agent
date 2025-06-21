/**
 * Error Handler Middleware
 * Handles errors in a consistent way across the application
 */

const logger = require('./logger');
const config = require('../config/config');

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Creates a custom API error
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Optional error code
 * @returns {ApiError} Custom API error
 */
const createApiError = (message, statusCode, errorCode = null) => {
  return new ApiError(message, statusCode, errorCode);
};

/**
 * Error handler middleware for Express
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errorCode = err.errorCode || null;
  let stack = err.stack;
  let errors = err.errors || null;
  
  // Log the error
  logger.error(`${statusCode} - ${message}`, {
    url: req.originalUrl,
    method: req.method,
    errorCode,
    stack,
    errors
  });
  
  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map(val => val.message);
  }
  
  // Handle Mongoose cast errors (e.g., invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }
  
  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    statusCode = 400;
    message = `Duplicate value for ${Object.keys(err.keyValue).join(', ')}`;
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(errorCode && { errorCode }),
    ...(errors && { errors }),
    ...(config.IS_DEVELOPMENT && { stack })
  });
};

/**
 * Async handler to avoid try-catch blocks in route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function that catches errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found handler middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFound = (req, res, next) => {
  const error = createApiError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

module.exports = {
  ApiError,
  createApiError,
  errorHandler,
  asyncHandler,
  notFound
};
