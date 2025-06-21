/**
 * User Preference Service
 * Manages user preferences for news personalization
 */

// Local storage key for user preferences
const PREFERENCES_STORAGE_KEY = 'news_delivery_user_preferences';

// Default user preferences
const DEFAULT_PREFERENCES = {
  categories: ['technology', 'business', 'world'],
  sources: ['BBC', 'Reuters', 'Associated Press'],
  refreshInterval: 30, // minutes
  maxArticles: 15,
  notificationsEnabled: true,
  theme: 'light',
  readingHistory: [],
  savedArticles: []
};

/**
 * Loads user preferences from local storage
 * @returns {Object} User preferences
 */
export const loadUserPreferences = () => {
  try {
    const storedPreferences = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!storedPreferences) {
      return DEFAULT_PREFERENCES;
    }
    
    const parsedPreferences = JSON.parse(storedPreferences);
    
    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_PREFERENCES,
      ...parsedPreferences
    };
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Saves user preferences to local storage
 * @param {Object} preferences - User preferences to save
 * @returns {boolean} Success status
 */
export const saveUserPreferences = (preferences) => {
  try {
    const preferencesToSave = {
      ...loadUserPreferences(), // Get existing preferences
      ...preferences, // Merge with new preferences
    };
    
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferencesToSave));
    return true;
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return false;
  }
};

/**
 * Updates a specific preference field
 * @param {string} key - Preference key to update
 * @param {any} value - New value
 * @returns {boolean} Success status
 */
export const updatePreference = (key, value) => {
  try {
    const currentPreferences = loadUserPreferences();
    currentPreferences[key] = value;
    return saveUserPreferences(currentPreferences);
  } catch (error) {
    console.error(`Error updating preference ${key}:`, error);
    return false;
  }
};

/**
 * Resets preferences to default values
 * @returns {boolean} Success status
 */
export const resetPreferences = () => {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    return true;
  } catch (error) {
    console.error('Error resetting preferences:', error);
    return false;
  }
};

/**
 * Adds an article to reading history
 * @param {Object} article - Article to add to history
 * @returns {boolean} Success status
 */
export const addToReadingHistory = (article) => {
  try {
    const preferences = loadUserPreferences();
    const history = preferences.readingHistory || [];
    
    // Add article with timestamp
    const articleWithTimestamp = {
      ...article,
      readAt: new Date().toISOString()
    };
    
    // Add to beginning of array (most recent first)
    history.unshift(articleWithTimestamp);
    
    // Keep only the last 50 articles
    const trimmedHistory = history.slice(0, 50);
    
    // Save updated history
    return updatePreference('readingHistory', trimmedHistory);
  } catch (error) {
    console.error('Error adding to reading history:', error);
    return false;
  }
};

/**
 * Saves an article to user's saved articles
 * @param {Object} article - Article to save
 * @returns {boolean} Success status
 */
export const saveArticle = (article) => {
  try {
    const preferences = loadUserPreferences();
    const savedArticles = preferences.savedArticles || [];
    
    // Check if article is already saved (avoid duplicates)
    const isDuplicate = savedArticles.some(saved => saved.url === article.url);
    
    if (isDuplicate) {
      return true; // Already saved
    }
    
    // Add article with timestamp
    const articleWithTimestamp = {
      ...article,
      savedAt: new Date().toISOString()
    };
    
    // Add to saved articles
    savedArticles.push(articleWithTimestamp);
    
    // Save updated list
    return updatePreference('savedArticles', savedArticles);
  } catch (error) {
    console.error('Error saving article:', error);
    return false;
  }
};

/**
 * Removes an article from saved articles
 * @param {string} articleUrl - URL of article to remove
 * @returns {boolean} Success status
 */
export const removeSavedArticle = (articleUrl) => {
  try {
    const preferences = loadUserPreferences();
    const savedArticles = preferences.savedArticles || [];
    
    // Filter out the article with matching URL
    const updatedSavedArticles = savedArticles.filter(
      article => article.url !== articleUrl
    );
    
    // Save updated list
    return updatePreference('savedArticles', updatedSavedArticles);
  } catch (error) {
    console.error('Error removing saved article:', error);
    return false;
  }
};

/**
 * Gets personalized news recommendations based on user history and preferences
 * @returns {Object} Personalization data for news filtering
 */
export const getPersonalizationData = () => {
  const preferences = loadUserPreferences();
  const { readingHistory = [] } = preferences;
  
  // Extract topics from reading history
  const historyTopics = readingHistory
    .flatMap(article => {
      // Extract potential topics from title and description
      const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
      
      // Simple keyword extraction (in a real app, use NLP for better results)
      const extractedKeywords = extractKeywordsFromText(text);
      return extractedKeywords;
    })
    .reduce((counts, topic) => {
      counts[topic] = (counts[topic] || 0) + 1;
      return counts;
    }, {});
  
  // Get top topics
  const topTopics = Object.entries(historyTopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
  
  return {
    interests: [...preferences.categories, ...topTopics],
    preferredSources: preferences.sources,
    topicsToAvoid: preferences.topicsToAvoid || []
  };
};

/**
 * Simple keyword extraction helper (placeholder for more sophisticated NLP)
 * @param {string} text - Text to extract keywords from
 * @returns {Array} Extracted keywords
 */
const extractKeywordsFromText = (text) => {
  // In a real app, use a proper NLP library
  // This is a very simplified version
  
  // List of common topics to look for
  const topicKeywords = [
    'technology', 'ai', 'software', 'hardware', 'app', 
    'business', 'economy', 'market', 'stock', 'finance',
    'politics', 'government', 'election', 'president',
    'health', 'covid', 'medicine', 'vaccine',
    'climate', 'environment', 'weather',
    'sports', 'football', 'basketball', 'tennis',
    'entertainment', 'movie', 'music', 'celebrity'
  ];
  
  return topicKeywords.filter(keyword => text.includes(keyword));
};

export default {
  loadUserPreferences,
  saveUserPreferences,
  updatePreference,
  resetPreferences,
  addToReadingHistory,
  saveArticle,
  removeSavedArticle,
  getPersonalizationData
};
