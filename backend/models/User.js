/**
 * User Model
 * Represents a user with authentication details, preferences, and reading behavior
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/config');

// User preferences schema
const PreferencesSchema = new mongoose.Schema({
  categories: {
    type: [String],
    default: ['general', 'technology']
  },
  sources: {
    type: [String],
    default: []
  },
  country: {
    type: String,
    default: 'us'
  },
  language: {
    type: String,
    default: 'en'
  },
  maxArticles: {
    type: Number,
    default: 15,
    min: 5,
    max: 50
  },
  refreshInterval: {
    type: Number,
    default: 30, // minutes
    min: 15,
    max: 120
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  },
  topicsToAvoid: {
    type: [String],
    default: []
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'system'
  }
});

// Reading history item schema (embedded document)
const ReadingHistoryItemSchema = new mongoose.Schema({
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NewsItem',
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  },
  readTime: {
    type: Number, // time spent reading in seconds
    default: 0
  },
  completedReading: {
    type: Boolean,
    default: false
  }
});

// User schema
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ],
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in query results by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  preferences: {
    type: PreferencesSchema,
    default: () => ({})
  },
  interests: {
    type: [String],
    default: []
  },
  readingHistory: {
    type: [ReadingHistoryItemSchema],
    default: []
  },
  savedArticles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NewsItem'
  }],
  lastLogin: {
    type: Date,
    default: Date.now
  },
  lastFeedAccess: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(config.AUTH.SALT_ROUNDS);
    
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

// Method to get user's reading patterns
UserSchema.methods.getReadingPatterns = function() {
  // Calculate reading patterns from history
  const history = this.readingHistory || [];
  
  if (history.length === 0) {
    return {
      categoriesRead: [],
      sourcesRead: [],
      avgReadTime: 0,
      readingFrequency: 'new'
    };
  }
  
  // Extract data for analysis
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentHistory = history.filter(item => item.readAt > oneWeekAgo);
  
  // Calculate reading frequency
  let readingFrequency = 'low';
  if (recentHistory.length >= 30) {
    readingFrequency = 'high';
  } else if (recentHistory.length >= 10) {
    readingFrequency = 'medium';
  }
  
  return {
    categoriesRead: this.getTopCategories(),
    sourcesRead: this.getTopSources(),
    avgReadTime: this.getAverageReadTime(),
    readingFrequency
  };
};

// Helper method to get top read categories
UserSchema.methods.getTopCategories = function() {
  const categoryCounts = {};
  
  this.readingHistory.forEach(item => {
    if (item.article && item.article.category) {
      const category = item.article.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }
  });
  
  return Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category]) => category);
};

// Helper method to get top read sources
UserSchema.methods.getTopSources = function() {
  const sourceCounts = {};
  
  this.readingHistory.forEach(item => {
    if (item.article && item.article.source && item.article.source.name) {
      const source = item.article.source.name;
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    }
  });
  
  return Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source]) => source);
};

// Helper method to get average read time
UserSchema.methods.getAverageReadTime = function() {
  if (this.readingHistory.length === 0) {
    return 0;
  }
  
  const totalReadTime = this.readingHistory.reduce(
    (total, item) => total + (item.readTime || 0), 
    0
  );
  
  return Math.round(totalReadTime / this.readingHistory.length);
};

module.exports = mongoose.model('User', UserSchema);
