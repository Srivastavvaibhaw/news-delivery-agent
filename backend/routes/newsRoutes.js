/**
 * News Routes
 * API routes for news delivery and management
 */

const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const { asyncHandler } = require('../utils/errorHandler');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { cacheMiddleware } = require('../utils/cache');

// Apply rate limiting to all news routes
router.use(rateLimit);

/**
 * @route   GET /api/news/feed
 * @desc    Get personalized news feed
 * @access  Private
 */
router.get('/feed', auth, asyncHandler(newsController.getPersonalizedNewsFeed));

/**
 * @route   GET /api/news/trending
 * @desc    Get trending topics
 * @access  Public
 */
router.get(
  '/trending', 
  cacheMiddleware(30 * 60), // Cache for 30 minutes
  asyncHandler(newsController.getTrendingTopics)
);

/**
 * @route   GET /api/news/search
 * @desc    Search news articles
 * @access  Public
 */
router.get('/search', asyncHandler(newsController.searchNews));

/**
 * @route   GET /api/news/categories
 * @desc    Get news categories
 * @access  Public
 */
router.get(
  '/categories',
  cacheMiddleware(24 * 60 * 60), // Cache for 24 hours
  asyncHandler(newsController.getNewsCategories)
);

/**
 * @route   GET /api/news/sources
 * @desc    Get news sources
 * @access  Public
 */
router.get(
  '/sources',
  cacheMiddleware(24 * 60 * 60), // Cache for 24 hours
  asyncHandler(newsController.getNewsSources)
);

/**
 * @route   POST /api/news/:articleId/read
 * @desc    Mark article as read
 * @access  Private
 */
router.post(
  '/:articleId/read',
  auth,
  asyncHandler(newsController.markArticleAsRead)
);

/**
 * @route   GET /api/news/category/:category
 * @desc    Get news by category
 * @access  Public
 */
router.get('/category/:category', asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { limit = 15, page = 1 } = req.query;
  
  const articles = await newsController.fetchNewsByCategory(
    category,
    parseInt(limit),
    parseInt(page)
  );
  
  res.status(200).json({
    success: true,
    data: articles
  });
}));

/**
 * @route   GET /api/news/breaking
 * @desc    Get breaking news
 * @access  Public
 */
router.get('/breaking', asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;
  
  const breakingNews = await newsController.getBreakingNews(parseInt(limit));
  
  res.status(200).json({
    success: true,
    data: breakingNews
  });
}));

/**
 * @route   GET /api/news/:articleId/related
 * @desc    Get related articles
 * @access  Public
 */
router.get('/:articleId/related', asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const { limit = 5 } = req.query;
  
  const relatedArticles = await newsController.getRelatedArticles(
    articleId,
    parseInt(limit)
  );
  
  res.status(200).json({
    success: true,
    data: relatedArticles
  });
}));

/**
 * @route   GET /api/news/:articleId
 * @desc    Get article by ID
 * @access  Public
 */
router.get('/:articleId', asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  
  const article = await newsController.getArticleById(articleId);
  
  if (!article) {
    return res.status(404).json({
      success: false,
      message: 'Article not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: article
  });
}));

module.exports = router;
