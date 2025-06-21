/**
 * User History Model
 * Tracks user reading history for analytics and personalization
 */

const mongoose = require('mongoose');

const UserHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NewsItem',
    required: true,
    index: true
  },
  readAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  readTime: {
    type: Number, // Time spent reading in seconds
    default: 0
  },
  completedReading: {
    type: Boolean,
    default: false
  },
  deviceInfo: {
    type: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'unknown'],
      default: 'unknown'
    },
    browser: String,
    os: String
  },
  userAction: {
    liked: {
      type: Boolean,
      default: false
    },
    shared: {
      type: Boolean,
      default: false
    },
    saved: {
      type: Boolean,
      default: false
    },
    clicked: {
      type: Boolean,
      default: true
    }
  },
  referrer: {
    type: String,
    enum: ['feed', 'search', 'recommended', 'trending', 'category', 'other'],
    default: 'feed'
  },
  feedPosition: {
    type: Number // Position in the feed when clicked
  },
  sessionId: {
    type: String // To group actions within a session
  }
}, {
  timestamps: true
});

// Create compound index for user+article (for quick lookups and ensuring uniqueness)
UserHistorySchema.index({ user: 1, article: 1, readAt: -1 });

// Static method to get reading history for a user
UserHistorySchema.statics.getUserReadingHistory = async function(userId, limit = 20, page = 1) {
  const skip = (page - 1) * limit;
  
  try {
    const history = await this.find({ user: userId })
      .sort({ readAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('article', 'title description url publishedAt source category');
    
    const total = await this.countDocuments({ user: userId });
    
    return {
      history,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user reading history:', error);
    throw error;
  }
};

// Static method to get reading statistics for a user
UserHistorySchema.statics.getUserReadingStats = async function(userId) {
  try {
    // Get total articles read
    const totalRead = await this.countDocuments({ user: userId });
    
    // Get articles read in the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentRead = await this.countDocuments({
      user: userId,
      readAt: { $gte: oneWeekAgo }
    });
    
    // Get category distribution
    const categoryDistribution = await this.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      { $lookup: {
          from: 'newsitems',
          localField: 'article',
          foreignField: '_id',
          as: 'articleData'
        }
      },
      { $unwind: '$articleData' },
      { $group: {
          _id: '$articleData.category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get source distribution
    const sourceDistribution = await this.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      { $lookup: {
          from: 'newsitems',
          localField: 'article',
          foreignField: '_id',
          as: 'articleData'
        }
      },
      { $unwind: '$articleData' },
      { $group: {
          _id: '$articleData.source.name',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Get average read time
    const readTimeResult = await this.aggregate([
      { $match: { 
          user: mongoose.Types.ObjectId(userId),
          readTime: { $gt: 0 }
        }
      },
      { $group: {
          _id: null,
          averageReadTime: { $avg: '$readTime' }
        }
      }
    ]);
    
    const averageReadTime = readTimeResult.length > 0 
      ? Math.round(readTimeResult[0].averageReadTime) 
      : 0;
    
    return {
      totalRead,
      recentRead,
      categoryDistribution,
      sourceDistribution,
      averageReadTime
    };
  } catch (error) {
    console.error('Error getting user reading stats:', error);
    throw error;
  }
};

// Static method to record an article read
UserHistorySchema.statics.recordRead = async function(userId, articleId, data = {}) {
  try {
    const historyEntry = new this({
      user: userId,
      article: articleId,
      readTime: data.readTime || 0,
      completedReading: data.completedReading || false,
      deviceInfo: data.deviceInfo || { type: 'unknown' },
      userAction: data.userAction || {},
      referrer: data.referrer || 'feed',
      feedPosition: data.feedPosition,
      sessionId: data.sessionId
    });
    
    await historyEntry.save();
    
    // Update read count on the article
    const NewsItem = mongoose.model('NewsItem');
    await NewsItem.findByIdAndUpdate(articleId, {
      $inc: { readCount: 1 }
    });
    
    return historyEntry;
  } catch (error) {
    console.error('Error recording article read:', error);
    throw error;
  }
};

module.exports = mongoose.model('UserHistory', UserHistorySchema);
