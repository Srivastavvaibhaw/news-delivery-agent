/**
 * Database Seeding Script
 * Initializes the database with default data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const config = require('../config/config');
const User = require('../models/User');
const NewsItem = require('../models/NewsItem');
const logger = require('../utils/logger');

// Connect to MongoDB
mongoose.connect(config.DATABASE.URI, config.DATABASE.OPTIONS)
  .then(() => {
    logger.info('Connected to MongoDB for seeding');
    runSeed();
  })
  .catch(err => {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  });

/**
 * Main seeding function
 */
async function runSeed() {
  try {
    logger.info('Starting database seed process');
    
    // Load data files
    const sourcesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/sources.json'), 'utf8')
    );
    const categoriesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/categories.json'), 'utf8')
    );
    
    // Seed admin user
    await seedAdminUser();
    
    // Seed demo users
    await seedDemoUsers();
    
    // Seed news sources (metadata in database if needed)
    await seedNewsSources(sourcesData.trusted_sources);
    
    logger.info('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error(`Error seeding database: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Seed admin user
 */
async function seedAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@newsdelivery.com' });
    
    if (existingAdmin) {
      logger.info('Admin user already exists, skipping');
      return;
    }
    
    // Create admin user
    const adminUser = new User({
      name: 'Admin',
      email: 'admin@newsdelivery.com',
      password: 'Admin123!', // Will be hashed by pre-save hook
      role: 'admin',
      preferences: {
        categories: ['general', 'technology', 'business', 'politics'],
        sources: ['bbc-news', 'reuters', 'associated-press'],
        maxArticles: 20,
        refreshInterval: 30,
        notificationsEnabled: true
      },
      interests: ['technology', 'artificial intelligence', 'global news', 'politics'],
      isActive: true
    });
    
    await adminUser.save();
    logger.info('Admin user created successfully');
  } catch (error) {
    logger.error(`Error creating admin user: ${error.message}`);
    throw error;
  }
}

/**
 * Seed demo users
 */
async function seedDemoUsers() {
  try {
    const demoUsers = [
      {
        name: 'Tech Enthusiast',
        email: 'tech@example.com',
        password: 'Password123',
        preferences: {
          categories: ['technology', 'science'],
          sources: ['wired', 'techcrunch', 'ars-technica'],
          maxArticles: 15,
          refreshInterval: 60,
          notificationsEnabled: true
        },
        interests: ['artificial intelligence', 'machine learning', 'robotics', 'software development', 'cybersecurity']
      },
      {
        name: 'Business Analyst',
        email: 'business@example.com',
        password: 'Password123',
        preferences: {
          categories: ['business', 'economy'],
          sources: ['financial-times', 'bloomberg', 'the-wall-street-journal'],
          maxArticles: 10,
          refreshInterval: 30,
          notificationsEnabled: true
        },
        interests: ['finance', 'markets', 'economy', 'startups', 'venture capital']
      },
      {
        name: 'News Junkie',
        email: 'news@example.com',
        password: 'Password123',
        preferences: {
          categories: ['general', 'politics', 'world'],
          sources: ['bbc-news', 'reuters', 'associated-press', 'the-washington-post'],
          maxArticles: 25,
          refreshInterval: 15,
          notificationsEnabled: true
        },
        interests: ['politics', 'international relations', 'current events', 'breaking news']
      }
    ];
    
    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        logger.info(`User ${userData.email} already exists, skipping`);
        continue;
      }
      
      // Create new user
      const user = new User(userData);
      await user.save();
      logger.info(`Demo user ${userData.email} created successfully`);
    }
  } catch (error) {
    logger.error(`Error creating demo users: ${error.message}`);
    throw error;
  }
}

/**
 * Seed news sources metadata
 * @param {Array} sources - List of news sources
 */
async function seedNewsSources(sources) {
  try {
    // In this implementation, we're not storing sources directly in the database
    // Instead, we're using the sources.json file as a reference
    // This function is a placeholder in case you want to store source metadata in the database
    
    logger.info(`Loaded ${sources.length} trusted news sources`);
  } catch (error) {
    logger.error(`Error seeding news sources: ${error.message}`);
    throw error;
  }
}

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed due to app termination');
    process.exit(0);
  });
});
