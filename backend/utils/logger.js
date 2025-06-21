/**
 * Logger Utility
 * Provides consistent logging throughout the application
 */

const winston = require('winston');
const config = require('../config/config');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(
    ({ level, message, timestamp, stack }) => {
      if (stack) {
        // Print stack traces for errors
        return `${timestamp} ${level}: ${message}\n${stack}`;
      }
      return `${timestamp} ${level}: ${message}`;
    }
  )
);

// Create the logger instance
const logger = winston.createLogger({
  level: config.LOGGING.LEVEL,
  format: logFormat,
  defaultMeta: { service: 'news-delivery-agent' },
  transports: [
    // Write logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/exceptions.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: 'logs/rejections.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add console transport for non-production environments
if (config.IS_DEVELOPMENT || config.IS_TEST) {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true
    })
  );
}

// Create a stream object for Morgan integration
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

/**
 * Log API request details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} options - Additional options
 */
logger.logApiRequest = (req, res, options = {}) => {
  const { excludeBody = false, maskFields = ['password', 'token'] } = options;
  
  const logData = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id || 'unauthenticated',
    userAgent: req.headers['user-agent'],
    responseTime: res.responseTime,
    statusCode: res.statusCode
  };
  
  // Include request body if not excluded and not a GET request
  if (!excludeBody && req.method !== 'GET' && req.body) {
    // Create a copy of the body to mask sensitive fields
    const sanitizedBody = { ...req.body };
    
    // Mask sensitive fields
    maskFields.forEach(field => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = '***masked***';
      }
    });
    
    logData.body = sanitizedBody;
  }
  
  // Log at appropriate level based on status code
  if (res.statusCode >= 500) {
    logger.error('API Request Error', logData);
  } else if (res.statusCode >= 400) {
    logger.warn('API Request Warning', logData);
  } else {
    logger.info('API Request', logData);
  }
};

module.exports = logger;
