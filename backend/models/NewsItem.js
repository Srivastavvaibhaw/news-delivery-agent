/**
 * News Item Model
 * Represents a news article with metadata and analytics
 */

const mongoose = require('mongoose');

const NewsItemSchema = new mongoose.Schema({
  // Basic article information
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    trim: true
  },
  url: {
    type: String,
    required: true,
    unique: true
  },
  urlToImage: {
    type: String
  },
  publishedAt: {
    type: Date,
    required: true,
    index: true
  },
  author: {
    type: String,
    trim: true
  },
  source: {
    id: String,
    name: {
      type: String,
      required: true,
      index: true
    }
  },
  
  // Classification and categorization
  category: {
    type: String,
    enum: [
      'general', 'business', 'technology', 'science', 'health', 
      'entertainment', 'sports', 'politics', 'world', 'other'
    ],
    default: 'general',
    index: true
  },
  tags: {
    type: [String],
    default: [],
    index: true
  },
  
  // Analysis results
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'unknown'],
    default: 'unknown'
  },
  sentimentScore: {
    type: Number,
    min: -1,
    max: 1,
    default: 0
  },
  relevanceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  isBreakingNews: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Analytics
  readCount: {
    type: Number,
    default: 0
  },
  saveCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  
  // Metadata
  fetchedAt: {
    type: Date,
    default: Date.now
  },
  lastAnalyzedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    index: { expires: '30d' } // TTL index to auto-delete after 30 days
  }
}, {
  timestamps: true
});

// Create text index for search
NewsItemSchema.index({ 
  title: 'text', 
  description: 'text', 
  content: 'text' 
}, {
  weights: {
    title: 10,
    description: 5,
    content: 1
  },
  name: 'TextSearchIndex'
});

// Virtual for article age in hours
NewsItemSchema.virtual('ageInHours').get(function() {
  const now = new Date();
  const publishDate = new Date(this.publishedAt);
  return (now - publishDate) / (1000 * 60 * 60);
});

// Method to check if article is recent (less than 24 hours old)
NewsItemSchema.methods.isRecent = function() {
  return this.ageInHours < 24;
};

// Method to get related articles (to be implemented with the actual query)
NewsItemSchema.statics.getRelatedArticles = async function(articleId, limit = 5) {
  try {
    const article = await this.findById(articleId);
    if (!article) return [];
    
    // Find articles with similar tags or category
    const relatedArticles = await this.find({
      _id: { $ne: articleId },
      $or: [
        { category: article.category },
        { tags: { $in: article.tags } }
      ]
    })
    .sort({ publishedAt: -1 })
    .limit(limit);
    
    return relatedArticles;
  } catch (error) {
    console.error('Error getting related articles:', error);
    return [];
  }
};

// Pre-save hook to set expiresAt date
NewsItemSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Set expiration date to 30 days from now
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    this.expiresAt = thirtyDaysFromNow;
  }
  next();
});

module.exports = mongoose.model('NewsItem', NewsItemSchema);
