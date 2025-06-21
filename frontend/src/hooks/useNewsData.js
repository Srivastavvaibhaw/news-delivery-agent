import { useState, useEffect, useCallback } from 'react';
import newsApi from '../services/newsApi';  // Default import
import newsAnalyzer from '../services/newsAnalyzer';  // Default import
import { useUser } from '../contexts/UserContext';

/**
 * Custom hook for fetching and managing news data
 * @param {Object} options - Configuration options
 * @returns {Object} News data and functions
 */
const useNewsData = (options = {}) => {
  // Default options
  const {
    initialCategory = 'all',
    articlesPerPage = 15,
    autoRefresh = true,
    refreshInterval = 30 // minutes
  } = options;

  // State variables
  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [breakingNews, setBreakingNews] = useState([]);
  const [categorizedNews, setCategorizedNews] = useState({});
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);

  // Get user preferences and methods from context
  const { preferences, addArticleToHistory } = useUser();

  /**
   * Fetch news data based on current state
   * @param {boolean} isLoadMore - Whether this is a load more request
   */
  const fetchNews = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setIsFetchingMore(true);
    } else {
      setLoading(true);
      setPage(1); // Reset page for new searches/categories
    }
    
    setError(null);
    
    try {
      const currentPage = isLoadMore ? page + 1 : 1;
      let articles;
      
      // If search query exists, search for news
      if (searchQuery) {
        articles = await newsApi.searchNews(searchQuery, {
          maxArticles: articlesPerPage,
          page: currentPage,
          ...preferences
        });
      } 
      // If category is selected, fetch that category
      else if (category !== 'all') {
        articles = await newsApi.fetchTopHeadlines({
          categories: [category],
          maxArticles: articlesPerPage,
          page: currentPage,
          ...preferences
        });
      } 
      // Otherwise fetch based on user preferences
      else {
        articles = await newsApi.fetchTopHeadlines({
          maxArticles: articlesPerPage,
          page: currentPage,
          ...preferences
        });
      }
      
      // Check if we've reached the end of available results
      if (articles.length < articlesPerPage) {
        setHasMoreResults(false);
      } else {
        setHasMoreResults(true);
        if (isLoadMore) {
          setPage(currentPage);
        }
      }
      
      // Analyze and rank the articles
      const analyzedArticles = newsAnalyzer.analyzeAndRankNews(
        articles,
        preferences || {}
      );
      
      // Detect breaking news
      const articlesWithBreakingFlag = newsAnalyzer.detectBreakingNews(analyzedArticles);
      
      // Check if any articles are in user's reading history
      const articlesWithReadStatus = articlesWithBreakingFlag.map(article => {
        const isRead = preferences?.readingHistory?.some(
          historyItem => historyItem.url === article.url
        );
        return { ...article, isRead };
      });
      
      // Check if any articles are in user's saved articles
      const articlesWithSavedStatus = articlesWithReadStatus.map(article => {
        const isSaved = preferences?.savedArticles?.some(
          savedItem => savedItem.url === article.url
        );
        return { ...article, isSaved };
      });
      
      // Group articles by category
      const groupedArticles = newsAnalyzer.groupArticlesByCategory(articlesWithSavedStatus);
      
      // Extract breaking news articles
      const breakingNewsArticles = articlesWithSavedStatus.filter(
        article => article.isBreakingNews
      );
      
      // Update state - either replace or append articles
      if (isLoadMore) {
        setNewsData(prevData => [...prevData, ...articlesWithSavedStatus]);
      } else {
        setNewsData(articlesWithSavedStatus);
      }
      
      setBreakingNews(breakingNewsArticles);
      setCategorizedNews(groupedArticles);
      setLastUpdated(new Date());
      
      // Update loading states
      if (isLoadMore) {
        setIsFetchingMore(false);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to load news. Please try again later.');
      setLoading(false);
      setIsFetchingMore(false);
    }
  }, [searchQuery, category, preferences, articlesPerPage, page]);

  // Fetch news on initial load and when dependencies change
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Set up auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    // Convert minutes to milliseconds
    const intervalMs = refreshInterval * 60 * 1000;
    
    const refreshTimer = setInterval(() => {
      fetchNews();
    }, intervalMs);
    
    // Clean up timer on unmount
    return () => clearInterval(refreshTimer);
  }, [autoRefresh, refreshInterval, fetchNews]);

  /**
   * Change the current category
   * @param {string} newCategory - New category to fetch
   */
  const changeCategory = (newCategory) => {
    setCategory(newCategory);
    // fetchNews will be triggered by the dependency change
  };

  /**
   * Search for news
   * @param {string} query - Search query
   */
  const searchForNews = (query) => {
    setSearchQuery(query);
    // fetchNews will be triggered by the dependency change
  };

  /**
   * Clear search and return to browsing
   */
  const clearSearch = () => {
    setSearchQuery('');
    // fetchNews will be triggered by the dependency change
  };

  /**
   * Manually refresh news data
   */
  const refreshNews = () => {
    fetchNews();
  };

  /**
   * Load more news articles (pagination)
   */
  const loadMoreNews = () => {
    if (isFetchingMore || !hasMoreResults) return;
    fetchNews(true);
  };

  /**
   * Mark an article as read and save to reading history
   * @param {Object} article - The article to mark as read
   */
  const markArticleAsRead = useCallback((article) => {
    // Add to reading history in UserContext
    addArticleToHistory(article);
    
    // Update local state to mark as read
    setNewsData(prevData => 
      prevData.map(item => 
        item.url === article.url ? { ...item, isRead: true } : item
      )
    );
  }, [addArticleToHistory]);

  /**
   * Filter news by source
   * @param {string} source - Source to filter by
   * @returns {Array} Filtered news articles
   */
  const filterBySource = (source) => {
    if (!source) return newsData;
    return newsData.filter(article => 
      article.source?.name?.toLowerCase().includes(source.toLowerCase())
    );
  };

  /**
   * Get top news from a specific category
   * @param {string} categoryName - Category name
   * @param {number} count - Number of articles to return
   * @returns {Array} Top news articles from category
   */
  const getTopNewsFromCategory = (categoryName, count = 5) => {
    if (!categorizedNews[categoryName]) return [];
    return categorizedNews[categoryName].slice(0, count);
  };

  /**
   * Get recommended articles based on user reading history
   * @param {number} count - Number of articles to return
   * @returns {Array} Recommended articles
   */
  const getRecommendedArticles = useCallback((count = 5) => {
    if (!preferences?.readingHistory || preferences.readingHistory.length === 0) {
      // If no reading history, return top ranked articles
      return newsData.slice(0, count);
    }
    
    // Extract topics from reading history
    const userInterests = newsAnalyzer.extractTopicsFromHistory(preferences.readingHistory);
    
    // Score articles based on these interests
    const scoredArticles = newsData.map(article => {
      const relevanceScore = newsAnalyzer.calculateRelevanceToInterests(article, userInterests);
      return { ...article, relevanceScore };
    });
    
    // Sort by relevance score and return top results
    return scoredArticles
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, count);
  }, [newsData, preferences]);

  return {
    newsData,
    loading,
    error,
    category,
    searchQuery,
    lastUpdated,
    breakingNews,
    categorizedNews,
    isFetchingMore,
    hasMoreResults,
    changeCategory,
    searchForNews,
    clearSearch,
    refreshNews,
    loadMoreNews,
    markArticleAsRead,
    filterBySource,
    getTopNewsFromCategory,
    getRecommendedArticles
  };
};

export default useNewsData;
