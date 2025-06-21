import React from 'react';
import Header from '../../components/Header/Header';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      <Header />
      
      <div className="about-container">
        <div className="about-header">
          <h1>About News Delivery Agent</h1>
          <div className="divider"></div>
        </div>
        
        <section className="about-section">
          <h2>Our Mission</h2>
          <p>
            News Delivery Agent is an autonomous AI-powered platform designed to keep you informed with the most relevant news tailored to your interests. Our mission is to cut through the noise and deliver only the news that matters to you, saving you time and helping you stay informed without information overload.
          </p>
        </section>
        
        <section className="about-section">
          <h2>How It Works</h2>
          <div className="how-it-works-grid">
            <div className="how-it-works-item">
              <div className="step-number">1</div>
              <h3>Automated News Collection</h3>
              <p>Our system continuously scans trusted news sources from around the web, collecting the latest stories as they're published.</p>
            </div>
            
            <div className="how-it-works-item">
              <div className="step-number">2</div>
              <h3>AI-Powered Analysis</h3>
              <p>Advanced algorithms analyze each story for relevance, credibility, importance, and match with your interests.</p>
            </div>
            
            <div className="how-it-works-item">
              <div className="step-number">3</div>
              <h3>Smart Ranking</h3>
              <p>Stories are ranked based on multiple factors including timeliness, source reliability, and alignment with your preferences.</p>
            </div>
            
            <div className="how-it-works-item">
              <div className="step-number">4</div>
              <h3>Personalized Delivery</h3>
              <p>The top 10-15 most important and relevant stories are delivered to your feed, automatically refreshed at your preferred interval.</p>
            </div>
          </div>
        </section>
        
        <section className="about-section">
          <h2>Key Features</h2>
          <ul className="features-list">
            <li>
              <h3>Autonomous Operation</h3>
              <p>No prompts or manual curation needed - the system works continuously in the background.</p>
            </li>
            <li>
              <h3>Personalized News Feed</h3>
              <p>News tailored to your interests based on your preferences and reading history.</p>
            </li>
            <li>
              <h3>Breaking News Alerts</h3>
              <p>Important breaking news delivered promptly, even outside your typical interest areas.</p>
            </li>
            <li>
              <h3>Source Diversity</h3>
              <p>News from a wide range of reputable sources to provide balanced coverage.</p>
            </li>
            <li>
              <h3>Customizable Preferences</h3>
              <p>Fine-tune your news feed by adjusting categories, sources, and update frequency.</p>
            </li>
          </ul>
        </section>
        
        <section className="about-section">
          <h2>Our Technology</h2>
          <p>
            News Delivery Agent uses cutting-edge AI and machine learning technologies to power its autonomous news curation system. Our platform combines natural language processing, content analysis, and personalization algorithms to deliver a truly tailored news experience.
          </p>
          <div className="tech-stack">
            <div className="tech-item">
              <h4>Frontend</h4>
              <p>React, CSS3, Modern JavaScript</p>
            </div>
            <div className="tech-item">
              <h4>Backend</h4>
              <p>Node.js, Express, AI/ML Services</p>
            </div>
            <div className="tech-item">
              <h4>Data Analysis</h4>
              <p>Natural Language Processing, Content Classification</p>
            </div>
            <div className="tech-item">
              <h4>News Sources</h4>
              <p>Integration with multiple reputable news APIs</p>
            </div>
          </div>
        </section>
        
        <section className="about-section">
          <h2>Privacy & Data</h2>
          <p>
            We take your privacy seriously. Your preferences and reading history are stored locally on your device and are only used to personalize your news feed. We don't sell your data or track your browsing habits across other websites.
          </p>
          <a href="/privacy" className="privacy-link">Read our full privacy policy</a>
        </section>
        
        <section className="about-section contact-section">
          <h2>Contact Us</h2>
          <p>
            Have questions, feedback, or suggestions? We'd love to hear from you!
          </p>
          <div className="contact-methods">
            <a href="mailto:support@newsdeliveryagent.com" className="contact-button email">
              <i className="fas fa-envelope"></i> Email Us
            </a>
            <a href="https://twitter.com/newsdeliveryai" target="_blank" rel="noopener noreferrer" className="contact-button twitter">
              <i className="fab fa-twitter"></i> Twitter
            </a>
            <a href="https://github.com/newsdeliveryagent" target="_blank" rel="noopener noreferrer" className="contact-button github">
              <i className="fab fa-github"></i> GitHub
            </a>
          </div>
        </section>
      </div>
      
      <footer className="about-footer">
        <div className="footer-content">
          <p>© {new Date().getFullYear()} News Delivery Agent</p>
          <div className="footer-links">
            <a href="/">Home</a>
            <a href="/preferences">Preferences</a>
            <a href="/privacy">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;
