import React, { useState, useEffect } from 'react';
import Header from '../../components/Header/Header';
import NewsFeed from '../../components/NewsFeed/NewsFeed';
import Loading from '../../components/Loading/Loading';
import useNewsData from '../../hooks/useNewsData';
import { useUser } from '../../contexts/UserContext';
import { formatDate } from '../../utils/dateFormatter';
import './Home.css';

const Home = () => {
  const { preferences, addArticleToHistory, saveArticle } = useUser();
  const [searchTerm, setSearchTerm] = useState('');

  const {
    newsData,
    loading,
    error,
    lastUpdated,
    breakingNews,
    refreshNews,
    searchForNews,
    clearSearch,
    searchQuery
  } = useNewsData({
    articlesPerPage: preferences?.maxArticles || 15,
    refreshInterval: preferences?.refreshInterval || 30
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      searchForNews(searchTerm);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    clearSearch();
  };

  const handleReadArticle = (article) => {
    // Add to reading history when user clicks to read an article
    addArticleToHistory(article);
    // Open article in new tab
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveArticle = (article) => {
    saveArticle(article);
    // Show a small confirmation message or update UI
    // This could be implemented with a small toast notification
  };

  return (
    <div className="home-page">
      <Header onRefresh={refreshNews} />

      <div className="home-content">
        <div className="search-section">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for news..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">Search</button>
            {searchQuery && (
              <button
                type="button"
                className="clear-search-button"
                onClick={handleClearSearch}
              >
                Clear
              </button>
            )}
          </form>

          <div className="refresh-info">
            {lastUpdated && (
              <span>Last updated: {formatDate(lastUpdated, 'relative')}</span>
            )}
          </div>
        </div>

        {breakingNews.length > 0 && (
          <div className="breaking-news-section">
            <h2 className="breaking-news-title">Breaking News</h2>
            <div className="breaking-news-container">
              {breakingNews.map((news, index) => (
                <div key={`breaking-${index}`} className="breaking-news-item">
                  <span className="breaking-label">Breaking</span>
                  <h3>{news.title}</h3>
                  <p>{news.description?.substring(0, 120)}...</p>
                  <div className="breaking-news-actions">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleReadArticle(news);
                      }}
                    >
                      Read More
                    </a>
                    <button
                      className="save-article-button"
                      onClick={() => handleSaveArticle(news)}
                      title="Save this article"
                    >
                      <i className="far fa-bookmark"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchQuery && (
          <div className="search-results-header">
            <h2>Search Results for: <span>{searchQuery}</span></h2>
          </div>
        )}

        {error ? (
          <div className="error-container">
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button onClick={refreshNews} className="retry-button">
              Try Again
            </button>
          </div>
        ) : loading ? (
          <Loading />
        ) : (
          <NewsFeed
            userPreferences={preferences}
            news={newsData}
            onReadArticle={handleReadArticle}
            onSaveArticle={handleSaveArticle}
          />
        )}
      </div>

      <footer className="home-footer">
        <div className="footer-content">
          <p>© {new Date().getFullYear()} News Delivery Agent</p>
          <div className="footer-links">
            <a href="/about">About</a>
            <a href="/preferences">Preferences</a>
            <a href="/privacy">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
