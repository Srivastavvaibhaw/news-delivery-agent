import React, { useState, useEffect } from 'react';
import Header from '../../components/Header/Header';
import UserPreferences from '../../components/UserPreferences/UserPreferences';
import { useUser } from '../../contexts/UserContext';
import './Preferences.css';

const Preferences = () => {
  const { 
    preferences, 
    updatePreferences, 
    resetPreferencesToDefault,
    removeSavedArticle, // Added this line to get the function at the top level
    loading, 
    error: userContextError 
  } = useUser();
  
  const [saveStatus, setSaveStatus] = useState({ success: false, message: '' });
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [savedArticles, setSavedArticles] = useState([]);
  const [readingHistory, setReadingHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('preferences');

  // Load user data when component mounts or preferences change
  useEffect(() => {
    if (preferences) {
      setSavedArticles(preferences.savedArticles || []);
      setReadingHistory(preferences.readingHistory || []);
    }
  }, [preferences]);

  // Display error from UserContext if it exists
  useEffect(() => {
    if (userContextError) {
      setSaveStatus({
        success: false,
        message: `Error: ${userContextError}`
      });
    }
  }, [userContextError]);

  const handleSavePreferences = async (updatedPreferences) => {
    setSaveStatus({ success: false, message: 'Saving preferences...' });
    
    try {
      const result = await updatePreferences(updatedPreferences);
      
      if (result) {
        setSaveStatus({
          success: true,
          message: 'Preferences saved successfully!'
        });
        
        // Clear message after a delay
        setTimeout(() => {
          setSaveStatus({ success: false, message: '' });
        }, 3000);
      } else {
        setSaveStatus({
          success: false,
          message: 'Failed to save preferences. Please try again.'
        });
      }
    } catch (error) {
      setSaveStatus({
        success: false,
        message: `Error: ${error.message || 'Something went wrong'}`
      });
    }
  };

  const handleResetPreferences = async () => {
    setSaveStatus({ success: false, message: 'Resetting preferences...' });
    
    try {
      const result = await resetPreferencesToDefault();
      
      if (result) {
        setSaveStatus({
          success: true,
          message: 'Preferences reset to default!'
        });
        setShowConfirmReset(false);
        
        // Clear message after a delay
        setTimeout(() => {
          setSaveStatus({ success: false, message: '' });
        }, 3000);
      } else {
        setSaveStatus({
          success: false,
          message: 'Failed to reset preferences. Please try again.'
        });
      }
    } catch (error) {
      setSaveStatus({
        success: false,
        message: `Error: ${error.message || 'Something went wrong'}`
      });
    }
  };

  // Handle removing a saved article - FIXED
  const handleRemoveSavedArticle = async (articleUrl) => {
    try {
      // Use removeSavedArticle from the top-level hook call
      const result = await removeSavedArticle(articleUrl);
      
      if (result) {
        // Update local state to reflect the change immediately
        setSavedArticles(prev => prev.filter(article => article.url !== articleUrl));
        
        setSaveStatus({
          success: true,
          message: 'Article removed from saved items'
        });
        
        setTimeout(() => {
          setSaveStatus({ success: false, message: '' });
        }, 3000);
      }
    } catch (error) {
      setSaveStatus({
        success: false,
        message: `Error removing article: ${error.message || 'Something went wrong'}`
      });
    }
  };

  return (
    <div className="preferences-page">
      <Header />
      
      <div className="preferences-container">
        <div className="preferences-header">
          <h1>Your News Settings</h1>
          <p>Customize your news experience by adjusting the settings below.</p>
        </div>
        
        <div className="preferences-tabs">
          <button 
            className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <i className="fas fa-cog"></i> Preferences
          </button>
          <button 
            className={`tab-button ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <i className="fas fa-bookmark"></i> Saved Articles 
            {savedArticles.length > 0 && <span className="badge">{savedArticles.length}</span>}
          </button>
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <i className="fas fa-history"></i> Reading History
          </button>
        </div>
        
        {loading ? (
          <div className="preferences-loading">
            <div className="loading-spinner"></div>
            <p>Loading your preferences...</p>
          </div>
        ) : (
          <>
            {activeTab === 'preferences' && (
              <UserPreferences 
                initialPreferences={preferences} 
                onSave={handleSavePreferences}
                onReset={() => setShowConfirmReset(true)}
              />
            )}
            
            {activeTab === 'saved' && (
              <div className="saved-articles-container">
                <h2>Saved Articles</h2>
                {savedArticles.length === 0 ? (
                  <div className="empty-state">
                    <i className="far fa-bookmark empty-icon"></i>
                    <p>You haven't saved any articles yet.</p>
                    <p className="empty-state-hint">
                      When you find interesting articles, click the bookmark icon to save them for later.
                    </p>
                  </div>
                ) : (
                  <div className="articles-list">
                    {savedArticles.map((article, index) => (
                      <div key={`saved-${index}`} className="article-item">
                        <div className="article-content">
                          <h3>{article.title}</h3>
                          <p>{article.description?.substring(0, 120)}...</p>
                          <div className="article-meta">
                            <span className="article-source">{article.source?.name}</span>
                            <span className="article-date">
                              Saved on: {new Date(article.savedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="article-actions">
                          <a 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="read-button"
                          >
                            Read
                          </a>
                          <button 
                            className="remove-button"
                            onClick={() => handleRemoveSavedArticle(article.url)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'history' && (
              <div className="reading-history-container">
                <h2>Reading History</h2>
                {readingHistory.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-history empty-icon"></i>
                    <p>No reading history yet.</p>
                    <p className="empty-state-hint">
                      Articles you read will appear here so you can easily find them again.
                    </p>
                  </div>
                ) : (
                  <div className="articles-list">
                    {readingHistory.map((article, index) => (
                      <div key={`history-${index}`} className="article-item">
                        <div className="article-content">
                          <h3>{article.title}</h3>
                          <p>{article.description?.substring(0, 120)}...</p>
                          <div className="article-meta">
                            <span className="article-source">{article.source?.name}</span>
                            <span className="article-date">
                              Read on: {new Date(article.readAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="article-actions">
                          <a 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="read-button"
                          >
                            Read Again
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {saveStatus.message && (
              <div className={`save-status ${saveStatus.success ? 'success' : 'error'}`}>
                {saveStatus.message}
              </div>
            )}
          </>
        )}
        
        {showConfirmReset && (
          <div className="confirm-reset-modal">
            <div className="confirm-reset-content">
              <h3>Reset Preferences?</h3>
              <p>This will reset all your preferences to default values. This action cannot be undone.</p>
              <div className="confirm-reset-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setShowConfirmReset(false)}
                >
                  Cancel
                </button>
                <button 
                  className="reset-button"
                  onClick={handleResetPreferences}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="preferences-help">
        <h3>About Your Preferences</h3>
        <div className="help-grid">
          <div className="help-item">
            <h4>Categories</h4>
            <p>Select the news categories you're interested in. This helps us prioritize the most relevant content for you.</p>
          </div>
          <div className="help-item">
            <h4>Sources</h4>
            <p>Choose your preferred news sources. We'll prioritize articles from these sources in your feed.</p>
          </div>
          <div className="help-item">
            <h4>Refresh Interval</h4>
            <p>Set how often you want your news feed to automatically refresh with new content.</p>
          </div>
          <div className="help-item">
            <h4>Notifications</h4>
            <p>Enable or disable breaking news notifications to stay informed about important events.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preferences;
