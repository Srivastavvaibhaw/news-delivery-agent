import React from 'react';
import './NewsCard.css';

const NewsCard = ({ news }) => {
  const { title, description, source, publishedAt, imageUrl, category } = news;
  
  // Format the date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  // Truncate text if too long
  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="news-card">
      <div className="news-image-container">
        <img src={imageUrl} alt={title} className="news-image" />
        <span className="news-category">{category}</span>
      </div>
      <div className="news-content">
        <h3 className="news-title">{truncateText(title, 70)}</h3>
        <p className="news-description">{truncateText(description, 120)}</p>
        <div className="news-footer">
          <span className="news-source">{source}</span>
          <span className="news-date">{formatDate(publishedAt)}</span>
        </div>
        <button className="read-more-btn">Read More</button>
      </div>
    </div>
  );
};

export default NewsCard;
