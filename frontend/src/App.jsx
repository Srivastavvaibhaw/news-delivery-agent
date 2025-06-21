import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import Home from './pages/Home/Home';
import Preferences from './pages/Preferences/Preferences';
import About from './pages/About/About';
import './App.css';
import axios from 'axios'; // Import Axios

const App = () => {
  const [apiBaseUrl, setApiBaseUrl] = useState(''); // State for API base URL
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApiBaseUrl = async () => {
      try {
        // Fetch the API base URL from the backend
        const response = await axios.get('/api/config/base-url');
        setApiBaseUrl(response.data.baseUrl);
        setLoading(false);
      } catch (err) {
        // Log the error to the console
        console.error('Failed to fetch API base URL:', err);
        setError('Failed to load configuration. Please check your backend.');
        setLoading(false);
      }
    };

    fetchApiBaseUrl();
  }, []);

  if (loading) {
    return <div>Loading configuration...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <UserProvider apiBaseUrl={apiBaseUrl}> {/* Pass apiBaseUrl to UserProvider */}
      <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </UserProvider>
  );
};

// Simple 404 Not Found page
const NotFound = () => {
  return (
    <div className="not-found">
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for doesn't exist or has been moved.</p>
      <a href="/" className="home-link">Return to Home</a>
    </div>
  );
};

export default App;
