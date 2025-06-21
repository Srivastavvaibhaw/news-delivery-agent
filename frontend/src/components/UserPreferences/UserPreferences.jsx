import React, { useState } from 'react';
import './UserPreferences.css';

const UserPreferences = ({ onSave, initialPreferences }) => {
  const [preferences, setPreferences] = useState(initialPreferences || {
    categories: ['technology', 'business'],
    sources: ['BBC', 'CNN', 'Reuters'],
    refreshInterval: 30,
    maxArticles: 15,
    notificationsEnabled: true
  });

  const handleCategoryToggle = (category) => {
    setPreferences(prev => {
      const categories = [...prev.categories];
      if (categories.includes(category)) {
        return { ...prev, categories: categories.filter(c => c !== category) };
      } else {
        return { ...prev, categories: [...categories, category] };
      }
    });
  };

  const handleSourceToggle = (source) => {
    setPreferences(prev => {
      const sources = [...prev.sources];
      if (sources.includes(source)) {
        return { ...prev, sources: sources.filter(s => s !== source) };
      } else {
        return { ...prev, sources: [...sources, source] };
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(preferences);
  };

  const allCategories = [
    'technology', 'business', 'science', 'health', 
    'entertainment', 'sports', 'politics', 'world'
  ];

  const allSources = [
    'BBC', 'CNN', 'Reuters', 'Associated Press', 'The Guardian',
    'The New York Times', 'Washington Post', 'Al Jazeera'
  ];

  return (
    <div className="preferences-container">
      <h2 className="preferences-title">Customize Your News Feed</h2>
      <form className="preferences-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>News Categories</h3>
          <div className="checkbox-grid">
            {allCategories.map(category => (
              <div className="checkbox-item" key={category}>
                <input
                  type="checkbox"
                  id={`category-${category}`}
                  checked={preferences.categories.includes(category)}
                  onChange={() => handleCategoryToggle(category)}
                />
                <label htmlFor={`category-${category}`}>{category.charAt(0).toUpperCase() + category.slice(1)}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3>News Sources</h3>
          <div className="checkbox-grid">
            {allSources.map(source => (
              <div className="checkbox-item" key={source}>
                <input
                  type="checkbox"
                  id={`source-${source}`}
                  checked={preferences.sources.includes(source)}
                  onChange={() => handleSourceToggle(source)}
                />
                <label htmlFor={`source-${source}`}>{source}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3>Display Settings</h3>
          <div className="form-group">
            <label htmlFor="maxArticles">Maximum articles to display:</label>
            <select
              id="maxArticles"
              name="maxArticles"
              value={preferences.maxArticles}
              onChange={handleInputChange}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="20">20</option>
              <option value="25">25</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="refreshInterval">Refresh interval (minutes):</label>
            <input
              type="range"
              id="refreshInterval"
              name="refreshInterval"
              min="15"
              max="120"
              step="15"
              value={preferences.refreshInterval}
              onChange={handleInputChange}
            />
            <span className="range-value">{preferences.refreshInterval} minutes</span>
          </div>

          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="notificationsEnabled"
              name="notificationsEnabled"
              checked={preferences.notificationsEnabled}
              onChange={handleInputChange}
            />
            <label htmlFor="notificationsEnabled">Enable breaking news notifications</label>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-btn">Save Preferences</button>
          <button type="button" className="reset-btn">Reset to Default</button>
        </div>
      </form>
    </div>
  );
};

export default UserPreferences;
