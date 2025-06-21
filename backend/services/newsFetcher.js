/**
 * News Fetcher Service
 * Fetches news from external APIs and processes the results
 */

const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const NewsItem = require('../models/NewsItem');

// API configuration
const NEWS_API_KEY = config.EXTERNAL_APIS.NEWS_API_KEY;
const NEWS_API_BASE_URL = config.EXTERNAL_APIS.NEWS_API_BASE_URL;
const GNEWS_API_KEY = config.EXTERNAL_APIS.GNEWS_API_KEY;
const GNEWS_API_BASE_URL = config.EXTERNAL_APIS.GNEWS_API_BASE_URL;

/**
 * Fetches top headlines from multiple sources
 * @param {Object} options - Options for fetching news
 * @returns {Array} - List of news articles
 */
async function fetchTopHeadlines(options = {}) {
  try {
    const { 
      country = config.NEWS.DEFAULT_COUNTRY, 
      category, 
      pageSize = 20, 
      page = 1,
      sources 
    } = options;
    
    // Check cache first
    const cacheKey = `headlines_${country}_${category || 'all'}_${sources || 'all'}_${page}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Returning cached headlines');
      return cachedData;
    }
    
    // Prepare API request
    const params = {
      apiKey: NEWS_API_KEY,
      pageSize: Math.min(pageSize, config.NEWS.MAX_ARTICLES_PER_REQUEST),
      page
    };
    
    // Cannot mix sources parameter with country/category
    if (sources) {
      params.sources = sources;
    } else {
      params.country = country;
      if (category) params.category = category;
    }
    
    // Make the API request
    logger.debug(`Fetching headlines: ${JSON.stringify(params)}`);
    const response = await axios.get(`${NEWS_API_BASE_URL}/top-headlines`, { params });
    
    if (response.data.status !== 'ok') {
      throw new Error('Failed to fetch news');
    }
    
    // Process and enhance articles
    const articles = await processArticles(response.data.articles, category);
    
    // Cache the results
    cache.set(cacheKey, articles, config.NEWS.CACHE_DURATION);
    
    return articles;
  } catch (error) {
    logger.error(`Error fetching headlines: ${error.message}`);
    
    // If News API fails, try GNews API as fallback
    if (GNEWS_API_KEY) {
      try {
        return await fetchFromGNews(options);
      } catch (gnewsError) {
        logger.error(`GNews fallback failed: ${gnewsError.message}`);
      }
    }
    
    // If all APIs fail, return mock data in development
    if (config.IS_DEVELOPMENT) {
      logger.warn('Using mock headlines data');
      return getMockArticles(options.category);
    }
    
    return [];
  }
}

/**
 * Searches for news articles based on query
 * @param {String} query - Search query
 * @param {Object} options - Search options
 * @returns {Array} - List of news articles
 */
async function searchNews(query, options = {}) {
  try {
    const { 
      language = config.NEWS.DEFAULT_LANGUAGE, 
      sortBy = 'relevancy', 
      pageSize = 20,
      page = 1,
      fromDate,
      toDate
    } = options;
    
    // Check cache first
    const cacheKey = `search_${query}_${language}_${sortBy}_${page}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Returning cached search results');
      return cachedData;
    }
    
    const params = {
      apiKey: NEWS_API_KEY,
      q: query,
      language,
      sortBy,
      pageSize: Math.min(pageSize, config.NEWS.MAX_ARTICLES_PER_REQUEST),
      page
    };
    
    // Add date filters if available
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;
    
    logger.debug(`Searching news: ${query}`);
    const response = await axios.get(`${NEWS_API_BASE_URL}/everything`, { params });
    
    if (response.data.status !== 'ok') {
      throw new Error('Failed to search news');
    }
    
    // Process articles
    const articles = await processArticles(response.data.articles);
    
    // Cache the results
    cache.set(cacheKey, articles, config.NEWS.CACHE_DURATION);
    
    return articles;
  } catch (error) {
    logger.error(`Error searching news: ${error.message}`);
    
    // Try GNews API as fallback
    if (GNEWS_API_KEY) {
      try {
        return await searchGNews(query, options);
      } catch (gnewsError) {
        logger.error(`GNews search fallback failed: ${gnewsError.message}`);
      }
    }
    
    // Return mock data in development
    if (config.IS_DEVELOPMENT) {
      logger.warn('Using mock search results');
      return getMockArticles().filter(article => 
        article.title.toLowerCase().includes(query.toLowerCase()) || 
        article.description.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    return [];
  }
}

/**
 * Fetches news from multiple categories for a comprehensive feed
 * @param {Array} categories - Array of categories to fetch
 * @param {number} articlesPerCategory - Number of articles per category
 * @returns {Promise<Object>} - Object with categories as keys and article arrays as values
 */
async function fetchMultiCategoryNews(categories = config.NEWS.DEFAULT_CATEGORIES, articlesPerCategory = 5) {
  try {
    // Check cache first
    const cacheKey = `multi_category_${categories.join('_')}_${articlesPerCategory}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Returning cached multi-category news');
      return cachedData;
    }
    
    const categoryPromises = categories.map(category => {
      return fetchTopHeadlines({
        category,
        pageSize: articlesPerCategory
      }).then(articles => ({ category, articles }));
    });
    
    const results = await Promise.all(categoryPromises);
    
    // Convert array of results to an object keyed by category
    const categoryNews = results.reduce((acc, { category, articles }) => {
      acc[category] = articles;
      return acc;
    }, {});
    
    // Cache the results
    cache.set(cacheKey, categoryNews, config.NEWS.CACHE_DURATION);
    
    return categoryNews;
  } catch (error) {
    logger.error(`Error fetching multi-category news: ${error.message}`);
    
    // Return mock data in development
    if (config.IS_DEVELOPMENT) {
      logger.warn('Using mock multi-category data');
      const mockCategoryNews = {};
      categories.forEach(category => {
        mockCategoryNews[category] = getMockArticles(category).slice(0, articlesPerCategory);
      });
      return mockCategoryNews;
    }
    
    return {};
  }
}

/**
 * Fetches news sources
 * @returns {Promise<Array>} - List of news sources
 */
async function fetchNewsSources() {
  try {
    // Check cache first
    const cacheKey = 'news_sources';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      logger.info('Returning cached news sources');
      return cachedData;
    }
    
    const params = {
      apiKey: NEWS_API_KEY,
      language: config.NEWS.DEFAULT_LANGUAGE
    };
    
    const response = await axios.get(`${NEWS_API_BASE_URL}/sources`, { params });
    
    if (response.data.status !== 'ok') {
      throw new Error('Failed to fetch sources');
    }
    
    // Cache the results for 24 hours
    cache.set(cacheKey, response.data.sources, 24 * 60 * 60);
    
    return response.data.sources;
  } catch (error) {
    logger.error(`Error fetching news sources: ${error.message}`);
    
    // Return mock data in development
    if (config.IS_DEVELOPMENT) {
      logger.warn('Using mock sources data');
      return getMockSources();
    }
    
    return [];
  }
}

/**
 * Fetches from GNews API as fallback
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} - News articles
 */
async function fetchFromGNews(options = {}) {
  if (!GNEWS_API_KEY) {
    throw new Error('GNews API key not configured');
  }
  
  const { 
    country = config.NEWS.DEFAULT_COUNTRY,
    category,
    pageSize = 20,
    page = 1
  } = options;
  
  const params = {
    token: GNEWS_API_KEY,
    country,
    max: pageSize,
    page
  };
  
  if (category) {
    params.topic = mapCategoryToGNewsTopic(category);
  }
  
  const response = await axios.get(`${GNEWS_API_BASE_URL}/top-headlines`, { params });
  
  if (!response.data || !response.data.articles) {
    throw new Error('Invalid GNews API response');
  }
  
  // Map GNews format to our standard format
  return response.data.articles.map(article => ({
    title: article.title,
    description: article.description,
    content: article.content,
    url: article.url,
    urlToImage: article.image,
    publishedAt: article.publishedAt,
    source: {
      name: article.source.name,
      id: null
    },
    category: category || extractCategoryFromUrl(article.url)
  }));
}

/**
 * Searches news from GNews API
 * @param {String} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - News articles
 */
async function searchGNews(query, options = {}) {
  if (!GNEWS_API_KEY) {
    throw new Error('GNews API key not configured');
  }
  
  const { 
    language = config.NEWS.DEFAULT_LANGUAGE,
    pageSize = 20,
    page = 1
  } = options;
  
  const params = {
    token: GNEWS_API_KEY,
    q: query,
    lang: language,
    max: pageSize,
    page
  };
  
  const response = await axios.get(`${GNEWS_API_BASE_URL}/search`, { params });
  
  if (!response.data || !response.data.articles) {
    throw new Error('Invalid GNews API response');
  }
  
  // Map GNews format to our standard format
  return response.data.articles.map(article => ({
    title: article.title,
    description: article.description,
    content: article.content,
    url: article.url,
    urlToImage: article.image,
    publishedAt: article.publishedAt,
    source: {
      name: article.source.name,
      id: null
    },
    category: extractCategoryFromUrl(article.url)
  }));
}

/**
 * Process articles to enhance them with additional data and store in DB
 * @param {Array} articles - Raw articles from API
 * @param {String} category - Category if known
 * @returns {Promise<Array>} - Processed articles
 */
async function processArticles(articles, category = null) {
  if (!articles || !Array.isArray(articles)) {
    return [];
  }
  
  const processedArticles = [];
  
  for (const article of articles) {
    try {
      if (!article.url) continue;
      
      // Extract category if not provided
      const articleCategory = category || extractCategoryFromUrl(article.url);
      
      // Check if article exists in database
      let newsItem = await NewsItem.findOne({ url: article.url });
      
      if (newsItem) {
        // Update existing article
        newsItem.title = article.title || newsItem.title;
        newsItem.description = article.description || newsItem.description;
        newsItem.content = article.content || newsItem.content;
        newsItem.urlToImage = article.urlToImage || newsItem.urlToImage;
        newsItem.category = articleCategory || newsItem.category;
        await newsItem.save();
      } else {
        // Create new article
        newsItem = new NewsItem({
          title: article.title,
          description: article.description,
          content: article.content,
          url: article.url,
          urlToImage: article.urlToImage,
          publishedAt: article.publishedAt || new Date(),
          author: article.author,
          source: article.source,
          category: articleCategory
        });
        await newsItem.save();
      }
      
      processedArticles.push(newsItem);
    } catch (error) {
      logger.error(`Error processing article: ${error.message}`);
      // Continue with next article
    }
  }
  
  return processedArticles;
}

/**
 * Extracts category from article URL or content
 * @param {String} url - Article URL
 * @returns {String} - Category
 */
function extractCategoryFromUrl(url = '') {
  const categories = [
    'politics', 'business', 'technology', 'science', 
    'health', 'sports', 'entertainment', 'world'
  ];
  
  const urlLower = url.toLowerCase();
  
  for (const category of categories) {
    if (urlLower.includes(`/${category}/`) || 
        urlLower.includes(`-${category}-`) || 
        urlLower.includes(`-${category}/`) ||
        urlLower.includes(`/${category}-`)) {
      return category;
    }
  }
  
  return 'general';
}

/**
 * Maps News API category to GNews topic
 * @param {String} category - News API category
 * @returns {String} - GNews topic
 */
function mapCategoryToGNewsTopic(category) {
  const mapping = {
    'general': 'general',
    'business': 'business',
    'technology': 'technology',
    'science': 'science',
    'health': 'health',
    'entertainment': 'entertainment',
    'sports': 'sports',
    'politics': 'world' // GNews doesn't have politics, using world
  };
  
  return mapping[category] || 'general';
}

/**
 * Get mock articles for development
 * @param {String} category - Category to filter by
 * @returns {Array} - Mock articles
 */
function getMockArticles(category = null) {
  const now = new Date();
  
  const mockArticles = [
    {
      title: "New AI Breakthrough Changes Everything",
      description: "Researchers have developed a new AI model that can understand context better than previous models.",
      content: "A team of researchers announced a breakthrough in artificial intelligence...",
      url: "https://example.com/tech/ai-breakthrough",
      urlToImage: "https://example.com/images/ai.jpg",
      publishedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      author: "Jane Smith",
      source: { id: "tech-daily", name: "Tech Daily" },
      category: "technology",
      _id: "mock1",
      relevanceScore: 85
    },
    {
      title: "Global Markets Reach All-Time High",
      description: "Stock markets around the world have reached unprecedented levels as economic recovery continues.",
      content: "Global markets surged today as investors responded positively to...",
      url: "https://example.com/business/global-markets",
      urlToImage: "https://example.com/images/markets.jpg",
      publishedAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      author: "John Doe",
      source: { id: "financial-times", name: "Financial Times" },
      category: "business",
      _id: "mock2",
      relevanceScore: 78
    },
    {
      title: "BREAKING: Major Scientific Discovery Announced",
      description: "Scientists have announced a groundbreaking discovery that could change our understanding of physics.",
      content: "In a press conference today, scientists announced they have discovered...",
      url: "https://example.com/science/physics-discovery",
      urlToImage: "https://example.com/images/science.jpg",
      publishedAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      author: "Sarah Johnson",
      source: { id: "science-today", name: "Science Today" },
      category: "science",
      _id: "mock3",
      relevanceScore: 92,
      isBreakingNews: true
    },
    {
      title: "New Health Guidelines Released",
      description: "Health authorities have released new guidelines for maintaining optimal health and wellbeing.",
      content: "The Department of Health today released updated guidelines for...",
      url: "https://example.com/health/new-guidelines",
      urlToImage: "https://example.com/images/health.jpg",
      publishedAt: new Date(now - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
      author: "Dr. Michael Brown",
      source: { id: "health-journal", name: "Health Journal" },
      category: "health",
      _id: "mock4",
      relevanceScore: 65
    },
    {
      title: "Blockbuster Movie Breaks Box Office Records",
      description: "The latest superhero movie has shattered box office records in its opening weekend.",
      content: "The highly anticipated film has exceeded all expectations by...",
      url: "https://example.com/entertainment/movie-records",
      urlToImage: "https://example.com/images/movie.jpg",
      publishedAt: new Date(now - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
      author: "Emma Wilson",
      source: { id: "entertainment-weekly", name: "Entertainment Weekly" },
      category: "entertainment",
      _id: "mock5",
      relevanceScore: 70
    }
  ];
  
  if (category) {
    return mockArticles.filter(article => article.category === category);
  }
  
  return mockArticles;
}

/**
 * Get mock news sources for development
 * @returns {Array} - Mock sources
 */
function getMockSources() {
  return [
    {
      id: "bbc-news",
      name: "BBC News",
      description: "Use BBC News for up-to-the-minute news, breaking news, video, audio and feature stories.",
      url: "http://www.bbc.co.uk/news",
      category: "general",
      language: "en",
      country: "gb"
    },
    {
      id: "cnn",
      name: "CNN",
      description: "View the latest news and breaking news today for U.S., world, weather, entertainment, politics and health.",
      url: "http://us.cnn.com",
      category: "general",
      language: "en",
      country: "us"
    },
    {
      id: "the-verge",
      name: "The Verge",
      description: "The Verge covers the intersection of technology, science, art, and culture.",
      url: "http://www.theverge.com",
      category: "technology",
      language: "en",
      country: "us"
    },
    {
      id: "wired",
      name: "Wired",
      description: "Wired is a monthly American magazine that reports on how emerging technologies affect culture, the economy, and politics.",
      url: "https://www.wired.com",
      category: "technology",
      language: "en",
      country: "us"
    },
    {
      id: "financial-times",
      name: "Financial Times",
      description: "The Financial Times is one of the world's leading news organisations, recognised internationally for its authority, integrity and accuracy.",
      url: "http://www.ft.com",
      category: "business",
      language: "en",
      country: "gb"
    }
  ];
}

module.exports = {
  fetchTopHeadlines,
  searchNews,
  fetchMultiCategoryNews,
  fetchNewsSources,
  processArticles
};
