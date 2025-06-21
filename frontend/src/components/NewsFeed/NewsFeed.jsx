import React, { useState, useEffect } from 'react';
import NewsCard from '../NewsCard/NewsCard';
import Loading from '../Loading/Loading';
import './NewsFeed.css';

const NewsFeed = ({ userPreferences }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All News' },
    { id: 'technology', name: 'Technology' },
    { id: 'business', name: 'Business' },
    { id: 'science', name: 'Science' },
    { id: 'health', name: 'Health' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'sports', name: 'Sports' }
  ];

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        // Simulate API call with timeout
        setTimeout(() => {
          // Mock data - in real app, this would be fetched from an API
          const mockNews = Array.from({ length: 15 }, (_, i) => ({
            id: i,
            title: `News Article ${i + 1}`,
            description: `This is a sample description for news article ${i + 1}. It contains relevant information about the topic.`,
            source: `Source ${i % 5 + 1}`,
            publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
            imageUrl: `https://source.unsplash.com/random/300x200?news&sig=${i}`,
            category: categories[i % categories.length].id
          }));
          setNews(mockNews);
          setLoading(false);
        }, 1500);
      } catch (err) {
        setError('Failed to fetch news. Please try again later.');
        setLoading(false);
      }
    };

    fetchNews();
  }, [userPreferences]);

  const filteredNews = activeCategory === 'all' 
    ? news 
    : news.filter(item => item.category === activeCategory);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="news-feed-container">
      <div className="categories-filter">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="news-grid">
          {filteredNews.map(newsItem => (
            <NewsCard key={newsItem.id} news={newsItem} />
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
