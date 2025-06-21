/**
 * Cache Utility
 * Provides in-memory caching for API responses and other data
 */

const NodeCache = require('node-cache');
const logger = require('./logger');

// Create cache instance with default TTL of 30 minutes
const cache = new NodeCache({
  stdTTL: 30 * 60, // 30 minutes in seconds
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false // Store references to objects to save memory
});

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {any} Cached value or undefined if not found
 */
const get = (key) => {
  try {
    const value = cache.get(key);
    if (value) {
      logger.debug(`Cache hit: ${key}`);
    } else {
      logger.debug(`Cache miss: ${key}`);
    }
    return value;
  } catch (error) {
    logger.error(`Error getting from cache: ${error.message}`);
    return undefined;
  }
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (optional)
 * @returns {boolean} True if successful, false otherwise
 */
const set = (key, value, ttl = undefined) => {
  try {
    const success = cache.set(key, value, ttl);
    logger.debug(`Cache set: ${key}, TTL: ${ttl || 'default'}`);
    return success;
  } catch (error) {
    logger.error(`Error setting cache: ${error.message}`);
    return false;
  }
};

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {number} Number of deleted entries
 */
const del = (key) => {
  try {
    const deleted = cache.del(key);
    logger.debug(`Cache delete: ${key}, Deleted: ${deleted}`);
    return deleted;
  } catch (error) {
    logger.error(`Error deleting from cache: ${error.message}`);
    return 0;
  }
};

/**
 * Clear all cache
 * @returns {boolean} True if successful
 */
const clear = () => {
  try {
    cache.flushAll();
    logger.info('Cache cleared');
    return true;
  } catch (error) {
    logger.error(`Error clearing cache: ${error.message}`);
    return false;
  }
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
const stats = () => {
  return cache.getStats();
};

/**
 * Get all cache keys
 * @returns {Array} Array of cache keys
 */
const keys = () => {
  return cache.keys();
};

/**
 * Check if key exists in cache
 * @param {string} key - Cache key
 * @returns {boolean} True if key exists
 */
const has = (key) => {
  return cache.has(key);
};

/**
 * Get time to live for a key
 * @param {string} key - Cache key
 * @returns {number} TTL in seconds, or -1 if not found, 0 if no TTL
 */
const ttl = (key) => {
  return cache.getTtl(key);
};

/**
 * Get multiple values from cache
 * @param {Array} keys - Array of cache keys
 * @returns {Object} Object with key-value pairs
 */
const mget = (keys) => {
  try {
    return cache.mget(keys);
  } catch (error) {
    logger.error(`Error getting multiple keys from cache: ${error.message}`);
    return {};
  }
};

/**
 * Set multiple values in cache
 * @param {Object} data - Object with key-value pairs
 * @param {number} ttl - Time to live in seconds (optional)
 * @returns {boolean} True if successful
 */
const mset = (data, ttl = undefined) => {
  try {
    const success = cache.mset(
      Object.entries(data).map(([key, value]) => ({ key, val: value, ttl }))
    );
    logger.debug(`Cache mset: ${Object.keys(data).join(', ')}`);
    return success;
  } catch (error) {
    logger.error(`Error setting multiple keys in cache: ${error.message}`);
    return false;
  }
};

/**
 * Cache middleware for Express routes
 * @param {number} duration - Cache duration in seconds
 * @returns {Function} Express middleware
 */
const cacheMiddleware = (duration = 60) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Create a cache key from the URL and any query parameters
    const key = `__express__${req.originalUrl || req.url}`;
    
    // Check if we have a cached response
    const cachedBody = get(key);
    
    if (cachedBody) {
      // Send cached response
      res.send(cachedBody);
      return;
    }
    
    // Store the original send function
    const originalSend = res.send;
    
    // Override res.send to cache the response
    res.send = function(body) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        set(key, body, duration);
      }
      
      // Call the original send function
      originalSend.call(this, body);
    };
    
    next();
  };
};

module.exports = {
  get,
  set,
  del,
  clear,
  stats,
  keys,
  has,
  ttl,
  mget,
  mset,
  cacheMiddleware
};
