import React, { createContext, useState, useEffect, useContext } from 'react';
import * as userPreferenceService from '../services/userPreferenceService';
import axios from 'axios';

// Create context
const UserContext = createContext();

/**
 * UserProvider component to wrap application and provide user context
 * @param {Object} props - Component props
 * @returns {JSX.Element} Provider component
 */
export const UserProvider = ({ children, apiBaseUrl }) => {  // Receive apiBaseUrl

  // User preferences state
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user preferences on initial render
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        // Load user preferences from storage
        const userPreferences = userPreferenceService.loadUserPreferences();
        setPreferences(userPreferences);
        setError(null);
      } catch (err) {
        console.error('Error loading user preferences:', err);
        setError('Failed to load user preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  /**
   * Update user preferences
   * @param {Object} newPreferences - New preferences object or partial update
   * @returns {Promise<boolean>} Success status
   */
  const updatePreferences = async (newPreferences) => {
    try {
      // If partial update, merge with existing preferences
      const updatedPreferences = {
        ...(preferences || {}),
        ...newPreferences
      };

      // Save to storage
      const success = userPreferenceService.saveUserPreferences(updatedPreferences);

      if (success) {
        // Update state if save was successful
        setPreferences(updatedPreferences);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError('Failed to update preferences');
      return false;
    }
  };

  /**
   * Update a single preference
   * @param {string} key - Preference key
   * @param {any} value - New value
   * @returns {Promise<boolean>} Success status
   */
  const updateSinglePreference = async (key, value) => {
    try {
      // Save to storage
      const success = userPreferenceService.updatePreference(key, value);

      if (success) {
        // Update state if save was successful
        setPreferences(prev => ({
          ...prev,
          [key]: value
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error(`Error updating preference ${key}:`, err);
      setError(`Failed to update preference: ${key}`);
      return false;
    }
  };

  /**
   * Reset preferences to default values
   * @returns {Promise<boolean>} Success status
   */
  const resetPreferencesToDefault = async () => {
    try {
      const success = userPreferenceService.resetPreferences();

      if (success) {
        // Reload default preferences
        const defaultPreferences = userPreferenceService.loadUserPreferences();
        setPreferences(defaultPreferences);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error resetting preferences:', err);
      setError('Failed to reset preferences');
      return false;
    }
  };

  /**
   * Add an article to reading history
   * @param {Object} article - Article to add
   * @returns {Promise<boolean>} Success status
   */
  const addArticleToHistory = async (article) => {
    try {
      const success = userPreferenceService.addToReadingHistory(article);

      if (success && preferences) {
        // Update local state with new reading history
        const updatedPreferences = userPreferenceService.loadUserPreferences();
        setPreferences(updatedPreferences);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error adding article to history:', err);
      return false;
    }
  };

  /**
   * Save article to user's saved articles
   * @param {Object} article - Article to save
   * @returns {Promise<boolean>} Success status
   */
  const saveArticle = async (article) => {
    try {
      const success = userPreferenceService.saveArticle(article);

      if (success && preferences) {
        // Update local state with new saved articles
        const updatedPreferences = userPreferenceService.loadUserPreferences();
        setPreferences(updatedPreferences);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving article:', err);
      return false;
    }
  };

  /**
   * Remove article from saved articles
   * @param {string} articleUrl - URL of article to remove
   * @returns {Promise<boolean>} Success status
   */
  const removeSavedArticle = async (articleUrl) => {
    try {
      const success = userPreferenceService.removeSavedArticle(articleUrl);

      if (success && preferences) {
        // Update local state with new saved articles
        const updatedPreferences = userPreferenceService.loadUserPreferences();
        setPreferences(updatedPreferences);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error removing saved article:', err);
      return false;
    }
  };

  // Context value
  const value = {
    preferences,
    loading,
    error,
    updatePreferences,
    updateSinglePreference,
    resetPreferencesToDefault,
    addArticleToHistory,
    saveArticle,
    removeSavedArticle,
    isAuthenticated: Boolean(preferences), // Simple check if preferences exist
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

/**
 * Custom hook to use the user context
 * @returns {Object} User context
 */
export const useUser = () => {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return context;
};

export default UserContext;
