/**
 * Scheduler Service
 * Schedules periodic news fetching and analysis tasks
 */

const newsFetcher = require('./newsFetcher');
const newsAnalyzer = require('./newsAnalyzer');
const logger = require('../utils/logger');
const config = require('../config/config');
const NewsItem = require('../models/NewsItem');

// Update interval in milliseconds
const UPDATE_INTERVAL = config.NEWS.UPDATE_INTERVAL;

// Categories to fetch
const CATEGORIES = config.NEWS.DEFAULT_CATEGORIES;

// Flag to track if fetching is in progress
let isFetchingNews = false;

/**
 * Starts the news update scheduler
 * @returns {Object} - Scheduler interval reference
 */
function startNewsUpdateScheduler() {
  logger.info('Starting news update scheduler');
  
  // Fetch news immediately on startup
  fetchAndAnalyzeNews();
  
  // Schedule periodic updates
  const schedulerInterval = setInterval(fetchAndAnalyzeNews, UPDATE_INTERVAL);
  
  // Schedule daily cleanup of old news
  const cleanupInterval = setInterval(cleanupOldNews, 24 * 60 * 60 * 1000); // Once per day
  
  return {
    schedulerInterval,
    cleanupInterval
  };
}

/**
 * Stops the news update scheduler
 * @param {Object} intervals - Scheduler interval references
 */
function stopNewsUpdateScheduler(intervals) {
  if (intervals.schedulerInterval) {
    clearInterval(intervals.schedulerInterval);
  }
  
  if (intervals.cleanupInterval) {
    clearInterval(intervals.cleanupInterval);
  }
  
  logger.info('News update scheduler stopped');
}

/**
 * Fetches and analyzes news from all categories
 */
async function fetchAndAnalyzeNews() {
  // Prevent concurrent fetching
  if (isFetchingNews) {
    logger.info('News fetching already in progress, skipping this cycle');
    return;
  }
  
  isFetchingNews = true;
  
  try {
    logger.info('Starting scheduled news fetch');
    
    // Fetch news from all categories
    const fetchPromises = CATEGORIES.map(category => 
      newsFetcher.fetchTopHeadlines({ category, pageSize: 20 })
    );
    
    // Wait for all fetches to complete
    const categoryResults = await Promise.all(fetchPromises);
    
    // Flatten results and remove duplicates
    let allArticles = [];
    categoryResults.forEach(articles => {
      allArticles = [...allArticles, ...articles];
    });
    
    // Remove duplicates by URL
    const uniqueUrls = new Set();
    const uniqueArticles = allArticles.filter(article => {
      if (!article.url || uniqueUrls.has(article.url)) {
        return false;
      }
      uniqueUrls.add(article.url);
      return true;
    });
    
    logger.info(`Fetched ${uniqueArticles.length} unique articles`);
    
    // Analyze articles in batches to avoid overloading the API
    const BATCH_SIZE = 10;
    for (let i = 0; i < uniqueArticles.length; i += BATCH_SIZE) {
      const batch = uniqueArticles.slice(i, i + BATCH_SIZE);
      
      try {
        // Analyze this batch
        await newsAnalyzer.analyzeAndRankNews(batch, {});
        logger.info(`Analyzed batch ${i/BATCH_SIZE + 1} of ${Math.ceil(uniqueArticles.length/BATCH_SIZE)}`);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (batchError) {
        logger.error(`Error analyzing batch: ${batchError.message}`);
        // Continue with next batch
      }
    }
    
    logger.info('Scheduled news fetch and analysis completed');
  } catch (error) {
    logger.error(`Error in scheduled news fetch: ${error.message}`);
  } finally {
    isFetchingNews = false;
  }
}

/**
 * Cleans up old news articles
 */
async function cleanupOldNews() {
  try {
    logger.info('Starting old news cleanup');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Find old articles that aren't saved by any user
    const result = await NewsItem.deleteMany({
      publishedAt: { $lt: thirtyDaysAgo },
      saveCount: { $lt: 1 }
    });
    
    logger.info(`Deleted ${result.deletedCount} old news articles`);
  } catch (error) {
    logger.error(`Error cleaning up old news: ${error.message}`);
  }
}

/**
 * Manually triggers a news fetch and analysis
 * @returns {Promise<boolean>} - Success status
 */
async function triggerManualUpdate() {
  if (isFetchingNews) {
    logger.info('News fetching already in progress');
    return false;
  }
  
  try {
    await fetchAndAnalyzeNews();
    return true;
  } catch (error) {
    logger.error(`Error in manual news update: ${error.message}`);
    return false;
  }
}

module.exports = {
  startNewsUpdateScheduler,
  stopNewsUpdateScheduler,
  triggerManualUpdate
};
