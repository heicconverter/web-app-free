/**
 * Format Helper Utilities
 * Provides formatting functions for file sizes, time, and other display values
 */

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted size string
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format milliseconds to human-readable time
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
export function formatTime(ms) {
  if (!ms || ms < 0) return '0s';
  
  if (ms < 1000) return 'less than a second';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format percentage with specified precision
 * @param {number} value - Value to format
 * @param {number} precision - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage
 */
export function formatPercentage(value, precision = 1) {
  if (typeof value !== 'number' || isNaN(value)) return '0%';
  return `${value.toFixed(precision)}%`;
}

/**
 * Format file name with extension
 * @param {string} fileName - Original file name
 * @param {string} newExtension - New extension to apply
 * @returns {string} File name with new extension
 */
export function formatFileName(fileName, newExtension) {
  if (!fileName) return '';
  
  const lastDotIndex = fileName.lastIndexOf('.');
  const nameWithoutExt = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  
  return `${nameWithoutExt}.${newExtension.toLowerCase()}`;
}

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (typeof num !== 'number') return '0';
  return num.toLocaleString();
}

/**
 * Get file extension from file name
 * @param {string} fileName - File name
 * @returns {string} File extension without dot
 */
export function getFileExtension(fileName) {
  if (!fileName) return '';
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex > 0 ? fileName.slice(lastDotIndex + 1).toLowerCase() : '';
}

/**
 * Truncate file name if too long
 * @param {string} fileName - File name to truncate
 * @param {number} maxLength - Maximum length (default: 30)
 * @returns {string} Truncated file name
 */
export function truncateFileName(fileName, maxLength = 30) {
  if (!fileName || fileName.length <= maxLength) return fileName;
  
  const extension = getFileExtension(fileName);
  const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.'));
  
  if (nameWithoutExt.length <= maxLength - extension.length - 1) {
    return fileName;
  }
  
  const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 4) + '...';
  return `${truncatedName}.${extension}`;
}

/**
 * Format compression ratio
 * @param {number} originalSize - Original file size in bytes
 * @param {number} compressedSize - Compressed file size in bytes
 * @returns {string} Formatted compression ratio
 */
export function formatCompressionRatio(originalSize, compressedSize) {
  if (!originalSize || originalSize <= 0) return '0%';
  
  const ratio = ((originalSize - compressedSize) / originalSize) * 100;
  return `${ratio.toFixed(1)}%`;
}

/**
 * Format date to readable string
 * @param {Date|number} date - Date object or timestamp
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) return 'Invalid date';
  
  const now = new Date();
  const diff = now - d;
  
  // Less than a minute
  if (diff < 60000) return 'Just now';
  
  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  // Less than a week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  
  // Default to locale date string
  return d.toLocaleDateString();
}

/**
 * Parse file size string to bytes
 * @param {string} sizeStr - Size string (e.g., "10MB", "1.5GB")
 * @returns {number} Size in bytes
 */
export function parseFileSize(sizeStr) {
  if (!sizeStr || typeof sizeStr !== 'string') return 0;
  
  const units = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024
  };
  
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B)?$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  
  return Math.floor(value * (units[unit] || 1));
}

/**
 * Calculate ETA based on progress
 * @param {number} progress - Current progress (0-100)
 * @param {number} elapsedTime - Elapsed time in milliseconds
 * @returns {number} Estimated time remaining in milliseconds
 */
export function calculateETA(progress, elapsedTime) {
  if (!progress || progress <= 0 || progress >= 100) return 0;
  
  const estimatedTotal = (elapsedTime / progress) * 100;
  const remaining = estimatedTotal - elapsedTime;
  
  return Math.max(0, Math.round(remaining));
}

// Export all helpers as default object as well
export default {
  formatBytes,
  formatTime,
  formatPercentage,
  formatFileName,
  formatNumber,
  getFileExtension,
  truncateFileName,
  formatCompressionRatio,
  formatDate,
  parseFileSize,
  calculateETA
};