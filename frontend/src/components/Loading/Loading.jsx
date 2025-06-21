import React from 'react';
import './Loading.css';

const Loading = () => {
  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner-circle"></div>
        <div className="spinner-circle inner"></div>
      </div>
      <p className="loading-text">Fetching your personalized news...</p>
    </div>
  );
};

export default Loading;
