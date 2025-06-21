/**
 * Application Configuration
 * Centralizes all configuration variables and environment setup
 */

require('dotenv').config();

// Environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_DEVELOPMENT = NODE_ENV === 'development';
const IS_TEST = NODE_ENV === 'test';

// Server configuration
const SERVER = {
  PORT: process.env.PORT || 5000,
  HOST: process.env.HOST || 'localhost',
  API_PREFIX: '/api'
};

// Database configuration
const DATABASE = {
  URI: process.env.MONGODB_URI || '',
  OPTIONS: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000
  }
};

// Authentication configuration
const AUTH = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',
  SALT_ROUNDS: 10
};

// External API keys
const EXTERNAL_APIS = {
  NEWS_API_KEY: process.env.NEWS_API_KEY || '',
  NEWS_API_BASE_URL: 'https://newsapi.org/v2',
  GNEWS_API_KEY: process.env.GNEWS_API_KEY,
  GNEWS_API_BASE_URL: 'https://gnews.io/api/v4'
};

// Azure OpenAI API configuration
const AZURE_OPENAI = {
  API_KEY: process.env.AZURE_OPENAI_API_KEY || '',
  ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT || '',
  API_VERSION: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
  DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'mindcraft-gpt4o'
};

// News fetching configuration
const NEWS = {
  DEFAULT_COUNTRY: 'us',
  DEFAULT_LANGUAGE: 'en',
  MAX_ARTICLES_PER_REQUEST: 100,
  CACHE_DURATION: 30 * 60, // 30 minutes in seconds
  UPDATE_INTERVAL: 30 * 60 * 1000, // 30 minutes in milliseconds
  DEFAULT_CATEGORIES: ['general', 'business', 'technology', 'science', 'health', 'entertainment', 'sports', 'politics']
};

// Logging configuration
const LOGGING = {
  LEVEL: IS_PRODUCTION ? 'info' : 'debug',
  FORMAT: IS_PRODUCTION ? 'combined' : 'dev'
};

// Rate limiting
const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100 // limit each IP to 100 requests per windowMs
};

// Export all configurations
module.exports = {
  NODE_ENV,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  IS_TEST,
  SERVER,
  DATABASE,
  AUTH,
  EXTERNAL_APIS,
  AZURE_OPENAI,
  NEWS,
  LOGGING,
  RATE_LIMIT
};
