/**
 * Date Formatter Utility
 * Provides consistent date formatting functions throughout the application
 */

/**
 * Formats a date to a readable string format
 * @param {string|Date} dateInput - Date string or Date object
 * @param {string} format - Format type ('full', 'short', 'relative', 'time')
 * @returns {string} Formatted date string
 */
export const formatDate = (dateInput, format = 'full') => {
  if (!dateInput) return '';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    switch (format) {
      case 'full':
        // e.g., "January 15, 2023 at 2:30 PM"
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
      case 'short':
        // e.g., "Jan 15, 2023"
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
      case 'time':
        // e.g., "2:30 PM"
        return date.toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
      case 'relative':
        return getRelativeTimeString(date);
        
      default:
        return date.toLocaleString();
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Converts a date to a human-readable relative time string
 * @param {Date} date - Date to convert
 * @returns {string} Relative time string (e.g., "2 hours ago")
 */
export const getRelativeTimeString = (date) => {
  const now = new Date();
  const diffInMs = now - date;
  const diffInSecs = Math.floor(diffInMs / 1000);
  const diffInMins = Math.floor(diffInSecs / 60);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInSecs < 5) {
    return 'just now';
  }
  
  if (diffInSecs < 60) {
    return `${diffInSecs} second${diffInSecs !== 1 ? 's' : ''} ago`;
  }
  
  if (diffInMins < 60) {
    return `${diffInMins} minute${diffInMins !== 1 ? 's' : ''} ago`;
  }
  
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }
  
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
  
  // For older dates, return the short format
  return formatDate(date, 'short');
};

/**
 * Checks if a date is today
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

/**
 * Formats a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {string} Formatted date range
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  // If same day
  if (start.toDateString() === end.toDateString()) {
    return `${formatDate(start, 'short')} ${formatDate(start, 'time')} - ${formatDate(end, 'time')}`;
  }
  
  // Different days
  return `${formatDate(start, 'short')} - ${formatDate(end, 'short')}`;
};

/**
 * Gets the day of week name
 * @param {Date} date - Date object
 * @param {boolean} short - Whether to return short name (e.g., "Mon" vs "Monday")
 * @returns {string} Day of week name
 */
export const getDayOfWeek = (date, short = false) => {
  if (!date) return '';
  
  const options = {
    weekday: short ? 'short' : 'long'
  };
  
  return date.toLocaleDateString('en-US', options);
};

/**
 * Formats a timestamp for news articles
 * @param {string|Date} dateInput - Date to format
 * @returns {string} Formatted date for news display
 */
export const formatNewsTimestamp = (dateInput) => {
  if (!dateInput) return '';
  
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  // If within last 24 hours, show relative time
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return getRelativeTimeString(date);
  }
  
  // If within current year, show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Otherwise show month, day, year
  return formatDate(date, 'short');
};

export default {
  formatDate,
  getRelativeTimeString,
  isToday,
  formatDateRange,
  getDayOfWeek,
  formatNewsTimestamp
};
