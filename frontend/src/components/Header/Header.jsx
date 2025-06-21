import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const Header = ({ onRefresh }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Close mobile menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);
  
  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        <div className="logo-container">
          <Link to="/" className="logo-link">
            <img src="/news-icon.svg" alt="" className="logo-icon" />
            <h1 className="logo-text">News<span>Delivery</span></h1>
          </Link>
        </div>
        
        <button 
          className={`mobile-menu-toggle ${menuOpen ? 'active' : ''}`} 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        
        <nav className={`nav-menu ${menuOpen ? 'open' : ''}`}>
          <ul>
            <li>
              <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
                <i className="fas fa-home"></i>
                <span>Home</span>
              </Link>
            </li>
            <li>
              <Link to="/preferences" className={location.pathname === '/preferences' ? 'active' : ''}>
                <i className="fas fa-cog"></i>
                <span>Preferences</span>
              </Link>
            </li>
            <li>
              <Link to="/about" className={location.pathname === '/about' ? 'active' : ''}>
                <i className="fas fa-info-circle"></i>
                <span>About</span>
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="user-controls">
          <button 
            className="refresh-btn" 
            onClick={onRefresh}
            title="Refresh news feed"
          >
            <i className="fas fa-sync-alt"></i>
            <span>Refresh</span>
          </button>
          
          <div className="theme-toggle">
            <input 
              type="checkbox" 
              id="theme-switch" 
              className="theme-switch" 
              onChange={(e) => document.body.classList.toggle('dark-mode', e.target.checked)}
            />
            <label htmlFor="theme-switch" title="Toggle dark mode">
              <i className="fas fa-moon"></i>
              <i className="fas fa-sun"></i>
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
