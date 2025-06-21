/**
 * Storage Helper Utility
 * Provides consistent methods for working with browser storage
 */

/**
 * Saves data to localStorage with error handling
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified)
 * @returns {boolean} Success status
 */
export const saveToStorage = (key, value) => {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage (key: ${key}):`, error);
    return false;
  }
};

/**
 * Retrieves data from localStorage with error handling
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key doesn't exist or error occurs
 * @returns {any} Retrieved value or default value
 */
export const getFromStorage = (key, defaultValue = null) => {
  try {
    const serializedValue = localStorage.getItem(key);
    if (serializedValue === null) {
      return defaultValue;
    }
    return JSON.parse(serializedValue);
  } catch (error) {
    console.error(`Error retrieving from localStorage (key: ${key}):`, error);
    return defaultValue;
  }
};

/**
 * Removes an item from localStorage
 * @param {string} key - Storage key to remove
 * @returns {boolean} Success status
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (key: ${key}):`, error);
    return false;
  }
};

/**
 * Clears all items from localStorage
 * @returns {boolean} Success status
 */
export const clearStorage = () => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

/**
 * Checks if a key exists in localStorage
 * @param {string} key - Storage key to check
 * @returns {boolean} True if key exists
 */
export const hasStorageItem = (key) => {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error(`Error checking localStorage (key: ${key}):`, error);
    return false;
  }
};

/**
 * Updates a specific property in a stored object
 * @param {string} key - Storage key
 * @param {string} property - Property name to update
 * @param {any} value - New value for the property
 * @returns {boolean} Success status
 */
export const updateStorageProperty = (key, property, value) => {
  try {
    const data = getFromStorage(key, {});
    data[property] = value;
    return saveToStorage(key, data);
  } catch (error) {
    console.error(`Error updating localStorage property (key: ${key}, property: ${property}):`, error);
    return false;
  }
};

/**
 * Gets the size of all data in localStorage
 * @returns {number} Size in bytes
 */
export const getStorageSize = () => {
  try {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      totalSize += (key.length + value.length) * 2; // UTF-16 uses 2 bytes per character
    }
    return totalSize;
  } catch (error) {
    console.error('Error calculating localStorage size:', error);
    return 0;
  }
};

/**
 * Saves data with expiration
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @param {number} expirationMinutes - Minutes until expiration
 * @returns {boolean} Success status
 */
export const saveWithExpiration = (key, value, expirationMinutes) => {
  try {
    const expirationMs = expirationMinutes * 60 * 1000;
    const expirationTime = new Date().getTime() + expirationMs;
    
    const dataWithExpiration = {
      value,
      expiration: expirationTime
    };
    
    return saveToStorage(key, dataWithExpiration);
  } catch (error) {
    console.error(`Error saving to localStorage with expiration (key: ${key}):`, error);
    return false;
  }
};

/**
 * Gets data with expiration check
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if expired or not found
 * @returns {any} Retrieved value or default value
 */
export const getWithExpiration = (key, defaultValue = null) => {
  try {
    const dataWithExpiration = getFromStorage(key);
    
    if (!dataWithExpiration) {
      return defaultValue;
    }
    
    const { value, expiration } = dataWithExpiration;
    const now = new Date().getTime();
    
    if (now > expiration) {
      // Expired, remove it and return default
      removeFromStorage(key);
      return defaultValue;
    }
    
    return value;
  } catch (error) {
    console.error(`Error retrieving from localStorage with expiration (key: ${key}):`, error);
    return defaultValue;
  }
};

export default {
  saveToStorage,
  getFromStorage,
  removeFromStorage,
  clearStorage,
  hasStorageItem,
  updateStorageProperty,
  getStorageSize,
  saveWithExpiration,
  getWithExpiration
};
