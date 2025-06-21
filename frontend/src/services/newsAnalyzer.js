/**
 * News Analyzer Service
 * Analyzes, ranks and processes news articles based on various factors
 */

// Constants for scoring algorithm
const SCORE_FACTORS = {
  RECENCY: 0.3,        // 30% weight for recency
  RELEVANCE: 0.4,      // 40% weight for relevance to user interests
  SOURCE_QUALITY: 0.2, // 20% weight for source reliability
  POPULARITY: 0.1      // 10% weight for popularity/trending
};

// Trusted news sources with quality scores (1-10)
const SOURCE_QUALITY_RATINGS = {
  'bbc.com': 9,
  'reuters.com': 9,
  'apnews.com': 9,
  'nytimes.com': 8,
  'washingtonpost.com': 8,
  'theguardian.com': 8,
  'economist.com': 8,
  'wsj.com': 7,
  'bloomberg.com': 7,
  'npr.org': 8,
  'cnn.com': 6,
  'foxnews.com': 5,
  // Add more sources as needed
};

/**
 * Analyzes and scores a list of news articles based on user preferences
 * @param {Array} articles - List of news articles
 * @param {Object} userPreferences - User preferences for personalization
 * @returns {Array} - Scored and ranked articles
 */
export const analyzeAndRankNews = (articles, userPreferences) => {
  if (!articles || articles.length === 0) {
    return [];
  }

  const { categories = [], sources = [] } = userPreferences;
  
  // Score each article
  const scoredArticles = articles.map(article => {
    const scores = {
      recency: calculateRecencyScore(article.publishedAt),
      relevance: calculateRelevanceScore(article, categories),
      sourceQuality: calculateSourceQualityScore(article.source?.name || article.url),
      popularity: article.popularity || 0.5 // Default if not available
    };
    
    // Calculate weighted total score
    const totalScore = 
      scores.recency * SCORE_FACTORS.RECENCY +
      scores.relevance * SCORE_FACTORS.RELEVANCE +
      scores.sourceQuality * SCORE_FACTORS.SOURCE_QUALITY +
      scores.popularity * SCORE_FACTORS.POPULARITY;
    
    return {
      ...article,
      score: totalScore,
      analysisDetails: scores
    };
  });
  
  // Sort by score (descending)
  return scoredArticles.sort((a, b) => b.score - a.score);
};

/**
 * Calculate recency score based on publication date
 * @param {string} publishedAt - ISO date string
 * @returns {number} - Score between 0-1
 */
const calculateRecencyScore = (publishedAt) => {
  if (!publishedAt) return 0.5;
  
  const now = new Date();
  const publishDate = new Date(publishedAt);
  const ageInHours = (now - publishDate) / (1000 * 60 * 60);
  
  // Articles less than 2 hours old get highest score
  if (ageInHours < 2) return 1;
  
  // Articles less than 12 hours old get high score
  if (ageInHours < 12) return 0.9 - (ageInHours / 120);
  
  // Articles less than 24 hours old get medium score
  if (ageInHours < 24) return 0.8 - (ageInHours / 240);
  
  // Articles less than 48 hours get lower score
  if (ageInHours < 48) return 0.7 - (ageInHours / 480);
  
  // Articles less than 72 hours get even lower score
  if (ageInHours < 72) return 0.5 - (ageInHours / 720);
  
  // Articles older than 72 hours get lowest scores
  return Math.max(0.1, 0.4 - (ageInHours / 1000));
};

/**
 * Calculate relevance score based on user categories
 * @param {Object} article - News article
 * @param {Array} userCategories - User preferred categories
 * @returns {number} - Score between 0-1
 */
const calculateRelevanceScore = (article, userCategories) => {
  if (!userCategories || userCategories.length === 0) return 0.5;
  if (!article.title && !article.description && !article.content) return 0.3;
  
  // If article has a category that matches user preferences, boost score
  if (article.category && userCategories.includes(article.category.toLowerCase())) {
    return 0.9;
  }
  
  // Calculate keyword matches
  const articleText = [
    article.title || '',
    article.description || '',
    article.content || ''
  ].join(' ').toLowerCase();
  
  let matchScore = 0;
  
  // Check for category keywords in article text
  userCategories.forEach(category => {
    // Define keywords for each category
    const categoryKeywords = getCategoryKeywords(category);
    
    // Count matches
    const matches = categoryKeywords.filter(keyword => 
      articleText.includes(keyword)
    ).length;
    
    // Add to match score
    matchScore += matches * 0.1;
  });
  
  // Cap at 1.0
  return Math.min(1.0, 0.3 + matchScore);
};

/**
 * Get keywords associated with a category
 * @param {string} category - Category name
 * @returns {Array} - Array of keywords
 */
const getCategoryKeywords = (category) => {
  const keywordMap = {
    'technology': ['tech', 'software', 'hardware', 'ai', 'artificial intelligence', 'app', 'digital', 'internet', 'cyber', 'computer'],
    'business': ['market', 'stock', 'economy', 'finance', 'company', 'trade', 'investment', 'startup', 'entrepreneur'],
    'science': ['research', 'study', 'discovery', 'scientist', 'experiment', 'space', 'physics', 'chemistry', 'biology'],
    'health': ['medical', 'doctor', 'patient', 'hospital', 'disease', 'treatment', 'medicine', 'healthcare', 'wellness'],
    'entertainment': ['movie', 'film', 'music', 'celebrity', 'actor', 'actress', 'hollywood', 'tv', 'show', 'star'],
    'sports': ['game', 'player', 'team', 'match', 'tournament', 'championship', 'athlete', 'league', 'score'],
    'politics': ['government', 'president', 'election', 'party', 'vote', 'campaign', 'policy', 'congress', 'senate', 'democrat', 'republican'],
    'world': ['country', 'international', 'global', 'foreign', 'nation', 'diplomatic', 'embassy', 'treaty', 'border']
  };
  
  return keywordMap[category.toLowerCase()] || [];
};

/**
 * Calculate source quality score based on predefined ratings
 * @param {string} source - Source name or URL
 * @returns {number} - Score between 0-1
 */
const calculateSourceQualityScore = (source) => {
  if (!source) return 0.5;
  
  // Extract domain from URL if source is a URL
  let domain = source.toLowerCase();
  if (domain.includes('://')) {
    try {
      domain = new URL(domain).hostname;
    } catch (e) {
      // If URL parsing fails, use the original string
    }
  }
  
  // Check if domain exists in our ratings
  for (const [ratedDomain, rating] of Object.entries(SOURCE_QUALITY_RATINGS)) {
    if (domain.includes(ratedDomain)) {
      return rating / 10; // Convert 1-10 scale to 0-1
    }
  }
  
  // Default score for unknown sources
  return 0.5;
};

/**
 * Groups articles by category
 * @param {Array} articles - List of news articles
 * @returns {Object} - Articles grouped by category
 */
export const groupArticlesByCategory = (articles) => {
  return articles.reduce((groups, article) => {
    const category = article.category || 'uncategorized';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(article);
    return groups;
  }, {});
};

/**
 * Detects and marks breaking news
 * @param {Array} articles - List of news articles
 * @returns {Array} - Articles with breaking news flag
 */
export const detectBreakingNews = (articles) => {
  return articles.map(article => {
    // Check recency (less than 3 hours old)
    const isRecent = calculateRecencyScore(article.publishedAt) > 0.85;
    
    // Check for breaking news keywords in title
    const breakingKeywords = ['breaking', 'urgent', 'just in', 'alert', 'update'];
    const titleLower = (article.title || '').toLowerCase();
    const hasBreakingKeywords = breakingKeywords.some(keyword => titleLower.includes(keyword));
    
    // Mark as breaking if recent and has keywords, or has very high score
    const isBreaking = (isRecent && hasBreakingKeywords) || article.score > 0.9;
    
    return {
      ...article,
      isBreakingNews: isBreaking
    };
  });
};

export default {
  analyzeAndRankNews,
  groupArticlesByCategory,
  detectBreakingNews
};
