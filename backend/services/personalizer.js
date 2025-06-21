/**
 * Personalizer Service
 * Personalizes news based on user interests and reading behavior
 */

const { createChatCompletion } = require('../config/openai');
const logger = require('../utils/logger');
const User = require('../models/User');
const UserHistory = require('../models/UserHistory');

/**
 * Personalizes a news feed based on user interests and reading history
 * @param {Array} articles - List of news articles
 * @param {Object} user - User object with preferences and history
 * @returns {Promise<Array>} - Personalized list of articles
 */
async function personalizeNewsFeed(articles, user) {
  try {
    if (!articles || articles.length === 0) {
      return [];
    }
    
    if (!user) {
      return articles;
    }
    
    // Get user's reading patterns
    const readingPatterns = await getUserReadingPatterns(user);
    
    // Apply personalization filters
    let personalizedArticles = articles;
    
    // Filter out topics to avoid
    if (user.preferences?.topicsToAvoid && user.preferences.topicsToAvoid.length > 0) {
      personalizedArticles = filterTopicsToAvoid(personalizedArticles, user.preferences.topicsToAvoid);
    }
    
    // Boost articles from preferred categories
    if (readingPatterns.preferredCategories && readingPatterns.preferredCategories.length > 0) {
      personalizedArticles = boostPreferredCategories(personalizedArticles, readingPatterns.preferredCategories);
    }
    
    // Boost articles from preferred sources
    if (readingPatterns.preferredSources && readingPatterns.preferredSources.length > 0) {
      personalizedArticles = boostPreferredSources(personalizedArticles, readingPatterns.preferredSources);
    }
    
    // Diversify the feed to avoid echo chambers
    personalizedArticles = diversifyNewsFeed(personalizedArticles);
    
    // Ensure some breaking news is included
    personalizedArticles = ensureBreakingNewsIncluded(personalizedArticles);
    
    return personalizedArticles;
  } catch (error) {
    logger.error(`Error personalizing news feed: ${error.message}`);
    return articles; // Return original articles if personalization fails
  }
}

/**
 * Analyzes user's reading habits to suggest interests
 * @param {Object} user - User object with reading history
 * @returns {Promise<Array>} - Suggested interests
 */
async function analyzeReadingHabits(user) {
  try {
    if (!user || !user.readingHistory || user.readingHistory.length < 5) {
      return [];
    }
    
    // Get user's reading history with article details
    const readingHistory = user.readingHistory
      .filter(item => item.article)
      .map(item => ({
        title: item.article.title,
        description: item.article.description,
        category: item.article.category,
        tags: item.article.tags || [],
        readAt: item.readAt
      }))
      .slice(0, 50); // Limit to most recent 50 articles
    
    // Create system prompt for interest analysis
    const systemPrompt = `You are an expert in analyzing reading habits and suggesting interests.
    Based on the user's reading history, identify their top interests and topics they engage with most.
    Return a JSON array of interest topics, ranked by relevance.
    Each item should include:
    - topic: The interest topic
    - relevance: A score from 1-10 indicating how relevant this topic is to the user
    - category: The broader category this topic belongs to`;
    
    // Call Azure OpenAI API
    const response = await createChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this reading history: ${JSON.stringify(readingHistory)}` }
    ], {
      temperature: 0.3,
      maxTokens: 1000
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    let suggestedInterests;
    try {
      suggestedInterests = JSON.parse(content);
    } catch (error) {
      logger.error(`Error parsing interest suggestions: ${error.message}`);
      return [];
    }
    
    return suggestedInterests;
  } catch (error) {
    logger.error(`Error analyzing reading habits: ${error.message}`);
    return [];
  }
}

/**
 * Gets user's reading patterns
 * @param {Object} user - User object
 * @returns {Promise<Object>} - Reading patterns
 */
async function getUserReadingPatterns(user) {
  try {
    // If user has no reading history, return empty patterns
    if (!user.readingHistory || user.readingHistory.length === 0) {
      return {
        preferredCategories: [],
        preferredSources: [],
        readingFrequency: 'new',
        topicsOfInterest: []
      };
    }
    
    // Get reading statistics from UserHistory model
    const stats = await UserHistory.getUserReadingStats(user._id);
    
    // Extract preferred categories
    const preferredCategories = stats.categoryDistribution
      .slice(0, 5)
      .map(item => item._id);
    
    // Extract preferred sources
    const preferredSources = stats.sourceDistribution
      .slice(0, 5)
      .map(item => item._id);
    
    // Determine reading frequency
    let readingFrequency = 'low';
    if (stats.recentRead >= 30) {
      readingFrequency = 'high';
    } else if (stats.recentRead >= 10) {
      readingFrequency = 'medium';
    }
    
    // Get topics of interest from user model or calculate
    const topicsOfInterest = user.interests.length > 0 
      ? user.interests 
      : await extractTopicsOfInterest(user);
    
    return {
      preferredCategories,
      preferredSources,
      readingFrequency,
      topicsOfInterest
    };
  } catch (error) {
    logger.error(`Error getting user reading patterns: ${error.message}`);
    return {
      preferredCategories: [],
      preferredSources: [],
      readingFrequency: 'low',
      topicsOfInterest: []
    };
  }
}

/**
 * Extracts topics of interest from user's reading history
 * @param {Object} user - User object
 * @returns {Promise<Array>} - Topics of interest
 */
async function extractTopicsOfInterest(user) {
  try {
    // Get user's reading history with article details
    const history = await UserHistory.find({ user: user._id })
      .sort({ readAt: -1 })
      .limit(50)
      .populate('article', 'title description tags category');
    
    if (history.length === 0) {
      return [];
    }
    
    // Count tag occurrences
    const tagCounts = {};
    history.forEach(item => {
      if (item.article && item.article.tags) {
        item.article.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    // Sort tags by count and return top 10
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  } catch (error) {
    logger.error(`Error extracting topics of interest: ${error.message}`);
    return [];
  }
}

/**
 * Filters out topics that user wants to avoid
 * @param {Array} articles - List of articles
 * @param {Array} topicsToAvoid - Topics to avoid
 * @returns {Array} - Filtered articles
 */
function filterTopicsToAvoid(articles, topicsToAvoid) {
  if (!topicsToAvoid || topicsToAvoid.length === 0) {
    return articles;
  }
  
  return articles.filter(article => {
    const articleText = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();
    
    // Check if any topic to avoid is in the article text
    const containsTopicToAvoid = topicsToAvoid.some(topic => 
      articleText.includes(topic.toLowerCase())
    );
    
    return !containsTopicToAvoid;
  });
}

/**
 * Boosts articles from preferred categories
 * @param {Array} articles - List of articles
 * @param {Array} preferredCategories - Preferred categories
 * @returns {Array} - Articles with boosted scores
 */
function boostPreferredCategories(articles, preferredCategories) {
  if (!preferredCategories || preferredCategories.length === 0) {
    return articles;
  }
  
  return articles.map(article => {
    if (article.category && preferredCategories.includes(article.category)) {
      // Boost the composite score for preferred categories
      return {
        ...article,
        compositeScore: (article.compositeScore || 0) + 10
      };
    }
    return article;
  }).sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));
}

/**
 * Boosts articles from preferred sources
 * @param {Array} articles - List of articles
 * @param {Array} preferredSources - Preferred sources
 * @returns {Array} - Articles with boosted scores
 */
function boostPreferredSources(articles, preferredSources) {
  if (!preferredSources || preferredSources.length === 0) {
    return articles;
  }
  
  return articles.map(article => {
    if (article.source && article.source.name && 
        preferredSources.includes(article.source.name)) {
      // Boost the composite score for preferred sources
      return {
        ...article,
        compositeScore: (article.compositeScore || 0) + 5
      };
    }
    return article;
  }).sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));
}

/**
 * Diversifies the news feed to avoid echo chambers
 * @param {Array} articles - List of articles
 * @returns {Array} - Diversified articles
 */
function diversifyNewsFeed(articles) {
  if (!articles || articles.length < 5) {
    return articles;
  }
  
  // Group articles by category
  const categoryCounts = {};
  const sourcesCounts = {};
  
  articles.forEach(article => {
    // Count categories
    if (article.category) {
      categoryCounts[article.category] = (categoryCounts[article.category] || 0) + 1;
    }
    
    // Count sources
    if (article.source && article.source.name) {
      sourcesCounts[article.source.name] = (sourcesCounts[article.source.name] || 0) + 1;
    }
  });
  
  // Find dominant categories and sources (more than 30% of articles)
  const totalArticles = articles.length;
  const dominantCategories = Object.entries(categoryCounts)
    .filter(([_, count]) => count / totalArticles > 0.3)
    .map(([category]) => category);
  
  const dominantSources = Object.entries(sourcesCounts)
    .filter(([_, count]) => count / totalArticles > 0.3)
    .map(([source]) => source);
  
  // If there are dominant categories or sources, adjust scores
  if (dominantCategories.length > 0 || dominantSources.length > 0) {
    // Penalize articles from dominant categories/sources after the first few
    const processedArticles = [];
    const categoryCounter = {};
    const sourceCounter = {};
    
    articles.forEach(article => {
      let scoreAdjustment = 0;
      
      // Check for dominant category
      if (article.category && dominantCategories.includes(article.category)) {
        categoryCounter[article.category] = (categoryCounter[article.category] || 0) + 1;
        
        // Penalize after the first 3 articles from this category
        if (categoryCounter[article.category] > 3) {
          scoreAdjustment -= 5;
        }
      }
      
      // Check for dominant source
      if (article.source && article.source.name && dominantSources.includes(article.source.name)) {
        sourceCounter[article.source.name] = (sourceCounter[article.source.name] || 0) + 1;
        
        // Penalize after the first 2 articles from this source
        if (sourceCounter[article.source.name] > 2) {
          scoreAdjustment -= 3;
        }
      }
      
      // Apply score adjustment
      processedArticles.push({
        ...article,
        compositeScore: (article.compositeScore || 0) + scoreAdjustment
      });
    });
    
    // Resort articles
    return processedArticles.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));
  }
  
  return articles;
}

/**
 * Ensures breaking news is included in the feed
 * @param {Array} articles - List of articles
 * @returns {Array} - Articles with breaking news prioritized
 */
function ensureBreakingNewsIncluded(articles) {
  if (!articles || articles.length === 0) {
    return articles;
  }
  
  // Find breaking news articles
  const breakingNews = articles.filter(article => article.isBreakingNews);
  
  // If there are breaking news articles, make sure at least one is in top 3
  if (breakingNews.length > 0) {
    const nonBreakingNews = articles.filter(article => !article.isBreakingNews);
    
    // Check if there's already breaking news in top 3
    const hasBreakingInTop3 = articles.slice(0, 3).some(article => article.isBreakingNews);
    
    if (!hasBreakingInTop3 && breakingNews.length > 0) {
      // Get the highest-ranked breaking news
      const topBreakingNews = breakingNews[0];
      
      // Remove it from its current position
      const articlesWithoutTopBreaking = articles.filter(
        article => article._id.toString() !== topBreakingNews._id.toString()
      );
      
      // Insert at position 2 (third item)
      articlesWithoutTopBreaking.splice(2, 0, topBreakingNews);
      
      return articlesWithoutTopBreaking;
    }
  }
  
  return articles;
}

module.exports = {
  personalizeNewsFeed,
  analyzeReadingHabits,
  getUserReadingPatterns
};
