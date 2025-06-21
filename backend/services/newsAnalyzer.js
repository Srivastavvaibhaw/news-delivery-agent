/**
 * News Analyzer Service
 * Analyzes and ranks news articles using Azure OpenAI
 */

const { createChatCompletion } = require('../config/openai');
const logger = require('../utils/logger');
const config = require('../config/config');
const NewsItem = require('../models/NewsItem');

/**
 * Analyzes and ranks news articles using Azure OpenAI
 * @param {Array} articles - List of news articles to analyze
 * @param {Object} userInterests - User's interests and preferences
 * @returns {Promise<Array>} - Ranked articles with relevance scores
 */
async function analyzeAndRankNews(articles, userInterests = {}) {
  try {
    if (!articles || articles.length === 0) {
      return [];
    }

    // Check if articles need analysis (only analyze unanalyzed or old analyses)
    const articlesToAnalyze = articles.filter(article => {
      // If article has no lastAnalyzedAt or it's older than 12 hours
      return !article.lastAnalyzedAt || 
        (new Date() - new Date(article.lastAnalyzedAt)) > (12 * 60 * 60 * 1000);
    });

    if (articlesToAnalyze.length > 0) {
      logger.info(`Analyzing \${articlesToAnalyze.length} articles`);
      
      // Prepare the input for the OpenAI API
      const articlesData = articlesToAnalyze.map(article => ({
        id: article._id,
        title: article.title,
        description: article.description || "",
        source: article.source?.name || "Unknown",
        publishedAt: article.publishedAt,
        url: article.url,
        category: article.category || "general"
      }));

      // Create system prompt for analysis
      const systemPrompt = `You are an expert news analyst and personalization engine. 
      Your task is to analyze and rank news articles based on:
      1. Importance and global relevance (40%)
      2. Recency (30%)
      3. Relevance to user's interests (30%)
      
      User interests: \${JSON.stringify(userInterests)}
      
      For each article, provide:
      - A relevance score from 0-100
      - A brief explanation of why it's relevant or important
      - Tags/categories that best describe the article
      - Whether it should be considered "breaking news"
      - The sentiment of the article (positive, neutral, negative)
      
      Return the results as a valid JSON array with the following structure for each article:
      {
        "id": "article_id",
        "relevanceScore": 85,
        "explanation": "This article is important because...",
        "tags": ["politics", "economy", "global"],
        "isBreakingNews": true,
        "sentiment": "neutral",
        "sentimentScore": 0.1
      }`;

      // Call Azure OpenAI API
      const response = await createChatCompletion([
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze these news articles: ${JSON.stringify(articlesData)}` }
      ], {
        temperature: 0.3,
        maxTokens: 4000
      });

      // Parse the response
      const content = response.choices[0].message.content;
      let analysisResults;
      try {
        analysisResults = JSON.parse(content);
      } catch (error) {
        logger.error(`Error parsing OpenAI response: ${error.message}`);
        logger.debug(`Response content: ${content}`);
        analysisResults = { articles: [] };
      }
      
      // Update articles with analysis results
      for (const analysisResult of analysisResults.articles || []) {
        const article = articlesToAnalyze.find(a => a._id.toString() === analysisResult.id);
        if (article) {
          // Update article with analysis results
          article.relevanceScore = analysisResult.relevanceScore || article.relevanceScore || 50;
          article.tags = analysisResult.tags || article.tags || [];
          article.isBreakingNews = analysisResult.isBreakingNews || article.isBreakingNews || false;
          article.sentiment = analysisResult.sentiment || article.sentiment || 'neutral';
          article.sentimentScore = analysisResult.sentimentScore || article.sentimentScore || 0;
          article.lastAnalyzedAt = new Date();
          
          // Save to database
          await NewsItem.findByIdAndUpdate(article._id, {
            relevanceScore: article.relevanceScore,
            tags: article.tags,
            isBreakingNews: article.isBreakingNews,
            sentiment: article.sentiment,
            sentimentScore: article.sentimentScore,
            lastAnalyzedAt: article.lastAnalyzedAt
          });
        }
      }
    }
    
    // Rank articles based on relevance score and recency
    return rankArticles(articles, userInterests);
  } catch (error) {
    logger.error(`Error analyzing news: ${error.message}`);
    // Return articles sorted by publishedAt as fallback
    return articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
}

/**
 * Ranks articles based on relevance score, recency, and user interests
 * @param {Array} articles - List of news articles
 * @param {Object} userInterests - User interests
 * @returns {Array} - Ranked articles
 */
function rankArticles(articles, userInterests = {}) {
  // Calculate a composite score for each article
  const scoredArticles = articles.map(article => {
    // Base score is the relevance score (0-100)
    let score = article.relevanceScore || 50;
    
    // Boost score for recent articles
    const ageInHours = (new Date() - new Date(article.publishedAt)) / (1000 * 60 * 60);
    if (ageInHours < 2) {
      score += 20; // Very recent (< 2 hours)
    } else if (ageInHours < 6) {
      score += 15; // Recent (< 6 hours)
    } else if (ageInHours < 12) {
      score += 10; // Fairly recent (< 12 hours)
    } else if (ageInHours < 24) {
      score += 5; // Same day (< 24 hours)
    }
    
    // Boost score for articles matching user interests
    if (userInterests && userInterests.length > 0) {
      const articleText = `${article.title} ${article.description || ''} \${article.category || ''}`.toLowerCase();
      const interestMatches = userInterests.filter(interest => 
        articleText.includes(interest.toLowerCase())
      );
      
      score += interestMatches.length * 5; // +5 points per interest match
    }
    
    // Boost for breaking news
    if (article.isBreakingNews) {
      score += 15;
    }
    
    return {
      ...article,
      compositeScore: score
    };
  });
  
  // Sort by composite score (descending)
  return scoredArticles.sort((a, b) => b.compositeScore - a.compositeScore);
}

/**
 * Identifies breaking news from the list of articles
 * @param {Array} articles - List of news articles
 * @returns {Array} - Articles identified as breaking news
 */
function identifyBreakingNews(articles) {
  return articles.filter(article => article.isBreakingNews);
}

/**
 * Groups articles by category
 * @param {Array} articles - List of news articles
 * @returns {Object} - Articles grouped by category
 */
function groupArticlesByCategory(articles) {
  return articles.reduce((groups, article) => {
    const category = article.category || 'uncategorized';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(article);
    return groups;
  }, {});
}

/**
 * Extracts trending topics from articles
 * @param {Array} articles - List of news articles
 * @returns {Promise<Array>} - List of trending topics
 */
async function extractTrendingTopics(articles) {
  try {
    if (!articles || articles.length === 0) {
      return [];
    }
    
    // Prepare the input for the OpenAI API
    const articlesData = articles.map(article => article.title).join('\n');
    
    // Create system prompt for topic extraction
    const systemPrompt = `You are a news trend analyzer. Extract the top 10 trending topics from these headlines.
    For each topic, provide:
    - The topic name
    - A count of how many headlines relate to this topic
    - A category (politics, technology, business, health, etc.)
    
    Return the results as a valid JSON array with the following structure:
    [
      {
        "topic": "Climate Change",
        "count": 5,
        "category": "environment"
      },
      ...
    ]`;
    
    // Call Azure OpenAI API
    const response = await createChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: articlesData }
    ], {
      temperature: 0.3,
      maxTokens: 1000
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    let trendingTopics;
    try {
      trendingTopics = JSON.parse(content);
    } catch (error) {
      logger.error(`Error parsing trending topics: ${error.message}`);
      return [];
    }
    
    return trendingTopics;
  } catch (error) {
    logger.error(`Error extracting trending topics: ${error.message}`);
    return [];
  }
}

/**
 * Analyzes the sentiment of an article
 * @param {Object} article - News article
 * @returns {Promise<Object>} - Sentiment analysis results
 */
async function analyzeSentiment(article) {
  try {
    // If article already has sentiment, return it
    if (article.sentiment && article.sentimentScore) {
      return {
        sentiment: article.sentiment,
        sentimentScore: article.sentimentScore
      };
    }
    
    const text = `${article.title} ${article.description || ''}`;
    
    // Create system prompt for sentiment analysis
    const systemPrompt = `You are a sentiment analysis tool. Analyze the sentiment of the following news text.
    Return a JSON object with:
    - sentiment: "positive", "neutral", or "negative"
    - sentimentScore: a number between -1 (very negative) and 1 (very positive)`;
    
    // Call Azure OpenAI API
    const response = await createChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ], {
      temperature: 0.1,
      maxTokens: 100
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    let sentimentResult;
    try {
      sentimentResult = JSON.parse(content);
    } catch (error) {
      logger.error(`Error parsing sentiment analysis: ${error.message}`);
      return { sentiment: 'neutral', sentimentScore: 0 };
    }
    
    // Update article in database
    await NewsItem.findByIdAndUpdate(article._id, {
      sentiment: sentimentResult.sentiment,
      sentimentScore: sentimentResult.sentimentScore,
      lastAnalyzedAt: new Date()
    });
    
    return sentimentResult;
  } catch (error) {
    logger.error(`Error analyzing sentiment: ${error.message}`);
    return { sentiment: 'neutral', sentimentScore: 0 };
  }
}

/**
 * Extracts keywords from articles
 * @param {Object} article - News article
 * @returns {Promise<Array>} - Extracted keywords
 */
async function extractKeywords(article) {
  try {
    // If article already has tags, return them
    if (article.tags && article.tags.length > 0) {
      return article.tags;
    }
    
    const text = `${article.title} ${article.description || ''}`;
    
    // Create system prompt for keyword extraction
    const systemPrompt = `You are a keyword extraction tool. Extract the most important keywords from the following news text.
    Return a JSON array of up to 5 keywords.`;
    
    // Call Azure OpenAI API
    const response = await createChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ], {
      temperature: 0.3,
      maxTokens: 100
    });
    
    // Parse the response
    const content = response.choices[0].message.content;
    let keywords;
    try {
      keywords = JSON.parse(content);
    } catch (error) {
      logger.error(`Error parsing keywords: ${error.message}`);
      return [];
    }
    
    // Update article in database
    await NewsItem.findByIdAndUpdate(article._id, {
      tags: keywords,
      lastAnalyzedAt: new Date()
    });
    
    return keywords;
  } catch (error) {
    logger.error(`Error extracting keywords: ${error.message}`);
    return [];
  }
}

module.exports = {
  analyzeAndRankNews,
  identifyBreakingNews,
  groupArticlesByCategory,
  extractTrendingTopics,
  analyzeSentiment,
  extractKeywords,
  rankArticles
};
