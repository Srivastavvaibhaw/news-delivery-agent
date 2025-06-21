/**
 * Fetch Initial News Script
 * Fetches initial news data to populate the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const newsFetcher = require('../services/newsFetcher');
const newsAnalyzer = require('../services/newsAnalyzer');
const NewsItem = require('../models/NewsItem');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
mongoose.connect(config.DATABASE.URI, config.DATABASE.OPTIONS)
  .then(() => {
    logger.info('Connected to MongoDB for initial news fetch');
    fetchInitialNews();
  })
  .catch(err => {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  });

/**
 * Main function to fetch initial news
 */
async function fetchInitialNews() {
  try {
    logger.info('Starting initial news fetch');
    
    // Load categories from data file
    const categoriesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/categories.json'), 'utf8')
    );
    
    const categories = categoriesData.categories.map(cat => cat.id);
    
    // Check if we already have news articles
    const existingCount = await NewsItem.countDocuments();
    if (existingCount > 0) {
      logger.info(`Database already has ${existingCount} news articles, skipping initial fetch`);
      logger.info('If you want to force a new fetch, drop the news_items collection first');
      process.exit(0);
    }
    
    // Fetch news for each category
    logger.info(`Fetching news for ${categories.length} categories`);
    
    for (const category of categories) {
      try {
        logger.info(`Fetching news for category: ${category}`);
        
        // Fetch top headlines for this category
        const articles = await newsFetcher.fetchTopHeadlines({
          category,
          pageSize: 20
        });
        
        logger.info(`Fetched ${articles.length} articles for category: ${category}`);
        
        // Analyze articles
        if (articles.length > 0) {
          try {
            logger.info(`Analyzing ${articles.length} articles for category: ${category}`);
            await newsAnalyzer.analyzeAndRankNews(articles, {});
            logger.info(`Analysis completed for category: ${category}`);
          } catch (analysisError) {
            logger.error(`Error analyzing articles for category ${category}: ${analysisError.message}`);
          }
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (categoryError) {
        logger.error(`Error fetching news for category ${category}: ${categoryError.message}`);
        // Continue with next category
      }
    }
    
    // Fetch breaking news
    try {
      logger.info('Fetching breaking news');
      const breakingNews = await newsFetcher.fetchBreakingNews();
      logger.info(`Fetched ${breakingNews.length} breaking news articles`);
      
      // Analyze breaking news
      if (breakingNews.length > 0) {
        await newsAnalyzer.analyzeAndRankNews(breakingNews, {});
      }
    } catch (breakingError) {
      logger.error(`Error fetching breaking news: ${breakingError.message}`);
    }
    
    // Count total articles fetched
    const totalCount = await NewsItem.countDocuments();
    logger.info(`Successfully fetched and stored ${totalCount} news articles`);
    
    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error(`Error in initial news fetch: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle process termination
 */
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed due to app termination');
    process.exit(0);
  });
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});
