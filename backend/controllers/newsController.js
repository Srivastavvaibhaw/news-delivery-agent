/**
 * News Controller
 * Handles news fetching, analysis, and delivery requests
 */

const newsFetcher = require('../services/newsFetcher');
const newsAnalyzer = require('../services/newsAnalyzer');
const personalizer = require('../services/personalizer');
const User = require('../models/User');
const NewsItem = require('../models/NewsItem');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

/**
 * Get personalized news feed for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getPersonalizedNewsFeed(req, res) {
  try {
    const userId = req.user.id;
    
    // Get user preferences
    const user = await User.findById(userId).select('preferences interests readingHistory');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check cache first
    const cacheKey = `feed_${userId}_${Date.now().toString().slice(0, -4)}`;
    const cachedFeed = cache.get(cacheKey);
    
    if (cachedFeed) {
      logger.info(`Serving cached news feed for user ${userId}`);
      return res.status(200).json({
        success: true,
        data: cachedFeed
      });
    }
    
    // Fetch news based on user preferences
    const articles = await fetchNewsBasedOnPreferences(user.preferences);
    
    // Analyze and rank articles
    const analyzedArticles = await newsAnalyzer.analyzeAndRankNews(
      articles,
      user.interests
    );
    
    // Personalize the news feed
    const personalizedArticles = await personalizer.personalizeNewsFeed(
      analyzedArticles,
      user
    );
    
    // Return top articles (10-15)
    const maxArticles = user.preferences?.maxArticles || 15;
    const topArticles = personalizedArticles.slice(0, maxArticles);
    
    // Identify breaking news
    const breakingNews = newsAnalyzer.identifyBreakingNews(analyzedArticles);
    
    // Group articles by category
    const articlesByCategory = newsAnalyzer.groupArticlesByCategory(topArticles);
    
    // Create response data
    const responseData = {
      articles: topArticles,
      breakingNews,
      articlesByCategory,
      lastUpdated: new Date()
    };
    
    // Cache the response
    cache.set(cacheKey, responseData, 10 * 60); // Cache for 10 minutes
    
    // Update user's last feed timestamp
    user.lastFeedAccess = new Date();
    await user.save();
    
    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    logger.error(`Error getting personalized news feed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get personalized news feed',
      error: error.message
    });
  }
}

/**
 * Fetch news based on user preferences
 * @param {Object} preferences - User preferences
 * @returns {Array} - News articles
 */
async function fetchNewsBasedOnPreferences(preferences) {
  const { categories = [], sources = [], country = 'us', language = 'en' } = preferences;
  
  let allArticles = [];
  
  // Fetch from selected categories
  if (categories.length > 0) {
    for (const category of categories) {
      const articles = await newsFetcher.fetchTopHeadlines({
        category,
        country,
        language
      });
      allArticles = [...allArticles, ...articles];
    }
  }
  
  // Fetch from selected sources
  if (sources.length > 0) {
    const sourceStr = sources.join(',');
    const articles = await newsFetcher.fetchTopHeadlines({
      sources: sourceStr
    });
    allArticles = [...allArticles, ...articles];
  }
  
  // If no specific categories or sources, get general headlines
  if (categories.length === 0 && sources.length === 0) {
    const articles = await newsFetcher.fetchTopHeadlines({ country, language });
    allArticles = articles;
  }
  
  // Remove duplicates
  const uniqueArticles = removeDuplicateArticles(allArticles);
  
  return uniqueArticles;
}

/**
 * Remove duplicate articles based on URL
 * @param {Array} articles - List of articles
 * @returns {Array} - Deduplicated articles
 */
function removeDuplicateArticles(articles) {
  const uniqueUrls = new Set();
  return articles.filter(article => {
    if (!article.url || uniqueUrls.has(article.url)) {
      return false;
    }
    uniqueUrls.add(article.url);
    return true;
  });
}

/**
 * Get trending topics based on current news
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getTrendingTopics(req, res) {
  try {
    // Check cache first
    const cacheKey = 'trending_topics';
    const cachedTopics = cache.get(cacheKey);
    
    if (cachedTopics) {
      return res.status(200).json({
        success: true,
        data: cachedTopics
      });
    }
    
    // Fetch general headlines
    const articles = await newsFetcher.fetchTopHeadlines({
      pageSize: 100
    });
    
    // Extract topics using news analyzer
    const trendingTopics = await newsAnalyzer.extractTrendingTopics(articles);
    
    // Cache the results
    cache.set(cacheKey, trendingTopics, 60 * 60); // Cache for 1 hour
    
    return res.status(200).json({
      success: true,
      data: trendingTopics
    });
  } catch (error) {
    logger.error(`Error getting trending topics: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get trending topics',
      error: error.message
    });
  }
}

/**
 * Search for news articles
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function searchNews(req, res) {
  try {
    const { query, language = 'en', sortBy = 'relevancy', pageSize = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    // Check cache first
    const cacheKey = `search_${query}_${language}_${sortBy}`;
    const cachedResults = cache.get(cacheKey);
    
    if (cachedResults) {
      return res.status(200).json({
        success: true,
        data: cachedResults
      });
    }
    
    // Search for news
    const articles = await newsFetcher.searchNews(query, {
      language,
      sortBy,
      pageSize: parseInt(pageSize)
    });
    
    // Cache the results
    cache.set(cacheKey, articles, 30 * 60); // Cache for 30 minutes
    
    return res.status(200).json({
      success: true,
      data: articles
    });
  } catch (error) {
    logger.error(`Error searching news: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to search news',
      error: error.message
    });
  }
}

/**
 * Mark an article as read and add to user's reading history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function markArticleAsRead(req, res) {
  try {
    const { articleId } = req.params;
    const userId = req.user.id;
    
    // Find the article
    const article = await NewsItem.findById(articleId);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if article is already in reading history
    const alreadyRead = user.readingHistory.some(
      history => history.article.toString() === articleId
    );
    
    if (!alreadyRead) {
      // Add to reading history
      user.readingHistory.unshift({
        article: articleId,
        readAt: new Date()
      });
      
      // Limit reading history to 100 items
      if (user.readingHistory.length > 100) {
        user.readingHistory = user.readingHistory.slice(0, 100);
      }
      
      await user.save();
    }
    
    // Update article read count
    article.readCount = (article.readCount || 0) + 1;
    await article.save();
    
    return res.status(200).json({
      success: true,
      message: 'Article marked as read'
    });
  } catch (error) {
    logger.error(`Error marking article as read: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark article as read',
      error: error.message
    });
  }
}

/**
 * Get news categories
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getNewsCategories(req, res) {
  try {
    const categories = [
      { id: 'general', name: 'General', icon: 'newspaper' },
      { id: 'business', name: 'Business', icon: 'briefcase' },
      { id: 'technology', name: 'Technology', icon: 'microchip' },
      { id: 'science', name: 'Science', icon: 'flask' },
      { id: 'health', name: 'Health', icon: 'heartbeat' },
      { id: 'entertainment', name: 'Entertainment', icon: 'film' },
      { id: 'sports', name: 'Sports', icon: 'futbol' },
      { id: 'politics', name: 'Politics', icon: 'landmark' },
      { id: 'world', name: 'World', icon: 'globe' }
    ];
    
    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error(`Error getting news categories: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get news categories',
      error: error.message
    });
  }
}

/**
 * Get news sources
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getNewsSources(req, res) {
  try {
    // Check cache first
    const cacheKey = 'news_sources';
    const cachedSources = cache.get(cacheKey);
    
    if (cachedSources) {
      return res.status(200).json({
        success: true,
        data: cachedSources
      });
    }
    
    // Fetch sources from News API
    const sources = await newsFetcher.fetchNewsSources();
    
    // Cache the results
    cache.set(cacheKey, sources, 24 * 60 * 60); // Cache for 24 hours
    
    return res.status(200).json({
      success: true,
      data: sources
    });
  } catch (error) {
    logger.error(`Error getting news sources: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get news sources',
      error: error.message
    });
  }
}

module.exports = {
  getPersonalizedNewsFeed,
  getTrendingTopics,
  searchNews,
  markArticleAsRead,
  getNewsCategories,
  getNewsSources
};
