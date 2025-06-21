/**
 * News API Service
 * Handles all external API calls to fetch news data
 */

// API configuration
const API_KEY = import.meta.env.VITE_NEWS_API_KEY || 'pub_ebd39b30ef684ab48077697f3c2780c2';
const BASE_URL = 'https://newsapi.org/v2';

// Mock data for development
const MOCK_ARTICLES = [
  {
    id: 1,
    title: "New AI Breakthrough Changes Everything",
    description: "Researchers have developed a new AI model that can understand context better than previous models.",
    source: { name: "Tech Daily" },
    publishedAt: new Date().toISOString(),
    url: "https://example.com/ai-news",
    urlToImage: "https://source.unsplash.com/random/300x200?ai",
    category: "technology"
  },
  {
    id: 2,
    title: "Global Markets Reach All-Time High",
    description: "Stock markets around the world have reached unprecedented levels as economic recovery continues.",
    source: { name: "Financial Times" },
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    url: "https://example.com/market-news",
    urlToImage: "https://source.unsplash.com/random/300x200?finance",
    category: "business"
  },
  {
    id: 3,
    title: "BREAKING: Major Scientific Discovery Announced",
    description: "Scientists have announced a groundbreaking discovery that could change our understanding of physics.",
    source: { name: "Science Today" },
    publishedAt: new Date(Date.now() - 1800000).toISOString(),
    url: "https://example.com/science-news",
    urlToImage: "https://source.unsplash.com/random/300x200?science",
    category: "science",
    isBreakingNews: true
  },
  {
    id: 4,
    title: "New Health Guidelines Released",
    description: "Health authorities have released new guidelines for maintaining optimal health and wellbeing.",
    source: { name: "Health Journal" },
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    url: "https://example.com/health-news",
    urlToImage: "https://source.unsplash.com/random/300x200?health",
    category: "health"
  },
  {
    id: 5,
    title: "Blockbuster Movie Breaks Box Office Records",
    description: "The latest superhero movie has shattered box office records in its opening weekend.",
    source: { name: "Entertainment Weekly" },
    publishedAt: new Date(Date.now() - 5400000).toISOString(),
    url: "https://example.com/movie-news",
    urlToImage: "https://source.unsplash.com/random/300x200?movie",
    category: "entertainment"
  }
];

// Use mock data in development
const USE_MOCK_DATA = true; // Set to false when using a real API key

/**
 * Fetches top headlines based on user preferences
 * @param {Object} preferences - User preferences for news filtering
 * @returns {Promise<Array>} - Array of news articles
 */
const fetchTopHeadlines = async (preferences = {}) => {
  if (USE_MOCK_DATA) {
    // Return mock data with a delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    return MOCK_ARTICLES;
  }
  
  try {
    const { categories = [], sources = [], maxArticles = 15 } = preferences;
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('apiKey', API_KEY);
    queryParams.append('pageSize', maxArticles);
    
    // Add category if only one is selected (API limitation)
    if (categories.length === 1) {
      queryParams.append('category', categories[0]);
    }
    
    // Add sources if available
    if (sources.length > 0) {
      queryParams.append('sources', sources.join(','));
    }
    
    // Default country if no specific sources
    if (sources.length === 0) {
      queryParams.append('country', 'us');
    }
    
    const response = await fetch(`${BASE_URL}/top-headlines?${queryParams}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch news');
    }
    
    const data = await response.json();
    return data.articles;
  } catch (error) {
    console.error('Error fetching top headlines:', error);
    throw error;
  }
};

/**
 * Searches for news articles based on query and preferences
 * @param {string} query - Search query
 * @param {Object} preferences - User preferences
 * @returns {Promise<Array>} - Array of news articles
 */
const searchNews = async (query, preferences = {}) => {
  if (USE_MOCK_DATA) {
    // Filter mock data based on query
    await new Promise(resolve => setTimeout(resolve, 800));
    const filtered = MOCK_ARTICLES.filter(article => 
      article.title.toLowerCase().includes(query.toLowerCase()) || 
      article.description.toLowerCase().includes(query.toLowerCase())
    );
    return filtered;
  }
  
  try {
    const { maxArticles = 15, fromDate, toDate } = preferences;
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('apiKey', API_KEY);
    queryParams.append('q', query);
    queryParams.append('pageSize', maxArticles);
    
    // Add date filters if available
    if (fromDate) {
      queryParams.append('from', fromDate);
    }
    
    if (toDate) {
      queryParams.append('to', toDate);
    }
    
    // Sort by relevance for search queries
    queryParams.append('sortBy', 'relevancy');
    
    const response = await fetch(`${BASE_URL}/everything?${queryParams}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to search news');
    }
    
    const data = await response.json();
    return data.articles;
  } catch (error) {
    console.error('Error searching news:', error);
    throw error;
  }
};

/**
 * Fetches news from multiple categories for a comprehensive feed
 * @param {Array} categories - Array of categories to fetch
 * @param {number} articlesPerCategory - Number of articles per category
 * @returns {Promise<Object>} - Object with categories as keys and article arrays as values
 */
const fetchMultiCategoryNews = async (categories = ['general', 'technology', 'business'], articlesPerCategory = 5) => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 800));
    const result = {};
    categories.forEach(category => {
      result[category] = MOCK_ARTICLES.filter(article => article.category === category);
    });
    return result;
  }
  
  try {
    const categoryPromises = categories.map(category => {
      const queryParams = new URLSearchParams();
      queryParams.append('apiKey', API_KEY);
      queryParams.append('category', category);
      queryParams.append('pageSize', articlesPerCategory);
      queryParams.append('country', 'us');
      
      return fetch(`${BASE_URL}/top-headlines?${queryParams}`)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch ${category} news`);
          return response.json();
        })
        .then(data => ({ category, articles: data.articles }));
    });
    
    const results = await Promise.all(categoryPromises);
    
    // Convert array of results to an object keyed by category
    return results.reduce((acc, { category, articles }) => {
      acc[category] = articles;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error fetching multi-category news:', error);
    throw error;
  }
};

/**
 * Fetches breaking news (most recent important headlines)
 * @returns {Promise<Array>} - Array of breaking news articles
 */
const fetchBreakingNews = async () => {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return MOCK_ARTICLES.filter(article => article.isBreakingNews);
  }
  
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('apiKey', API_KEY);
    queryParams.append('country', 'us');
    queryParams.append('pageSize', 5);
    
    const response = await fetch(`${BASE_URL}/top-headlines?${queryParams}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch breaking news');
    }
    
    const data = await response.json();
    return data.articles;
  } catch (error) {
    console.error('Error fetching breaking news:', error);
    throw error;
  }
};

// Create a newsApi object with all methods
const newsApi = {
  fetchTopHeadlines,
  searchNews,
  fetchMultiCategoryNews,
  fetchBreakingNews
};

export default newsApi;
