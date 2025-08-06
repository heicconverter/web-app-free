/**
 * Memory Manager for HEIC Conversion
 * Handles memory optimization, garbage collection, and resource management
 */

class MemoryManager {
  constructor() {
    this.activeBlobs = new Set();
    this.objectURLs = new Set();
    this.maxMemoryUsage = this.calculateMaxMemory();
    this.currentMemoryEstimate = 0;
    this.gcThreshold = 0.8; // Trigger cleanup at 80% memory usage
    this.conversionQueue = [];
    this.isProcessing = false;
  }

  /**
   * Calculate maximum safe memory usage based on available memory
   * @returns {number} - Maximum memory in bytes
   */
  calculateMaxMemory() {
    // Use performance.memory if available (Chrome/Edge)
    if (typeof performance !== 'undefined' && performance.memory) {
      // Use 70% of JS heap size limit for safety
      return Math.floor(performance.memory.jsHeapSizeLimit * 0.7);
    }

    // Fallback: Use conservative estimate based on device
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // Mobile: 256MB, Desktop: 1GB
    return isMobile ? 256 * 1024 * 1024 : 1024 * 1024 * 1024;
  }

  /**
   * Get current memory usage
   * @returns {number} - Current memory usage in bytes
   */
  getCurrentMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return this.currentMemoryEstimate;
  }

  /**
   * Check if there's enough memory for an operation
   * @param {number} requiredMemory - Required memory in bytes
   * @returns {boolean} - True if memory is available
   */
  hasAvailableMemory(requiredMemory) {
    const currentUsage = this.getCurrentMemoryUsage();
    const projected = currentUsage + requiredMemory;

    if (projected > this.maxMemoryUsage * this.gcThreshold) {
      this.triggerCleanup();
    }

    return projected < this.maxMemoryUsage;
  }

  /**
   * Estimate memory requirement for a file
   * @param {File|Blob|ArrayBuffer} file - Input file
   * @returns {number} - Estimated memory requirement in bytes
   */
  estimateMemoryRequirement(file) {
    let fileSize;

    if (file instanceof File || file instanceof Blob) {
      fileSize = file.size;
    } else if (file instanceof ArrayBuffer) {
      fileSize = file.byteLength;
    } else {
      fileSize = 0;
    }

    // Estimate: original + decoded (4x for RGBA) + output (0.5x for JPEG)
    // Total: ~5.5x original file size
    return Math.ceil(fileSize * 5.5);
  }

  /**
   * Register a blob for tracking
   * @param {Blob} blob - Blob to track
   */
  registerBlob(blob) {
    if (blob instanceof Blob) {
      this.activeBlobs.add(blob);
      this.currentMemoryEstimate += blob.size;
    }
  }

  /**
   * Unregister and clean up a blob
   * @param {Blob} blob - Blob to clean up
   */
  unregisterBlob(blob) {
    if (this.activeBlobs.has(blob)) {
      this.activeBlobs.delete(blob);
      this.currentMemoryEstimate -= blob.size;
    }
  }

  /**
   * Create and track an object URL
   * @param {Blob} blob - Blob to create URL for
   * @returns {string} - Object URL
   */
  createObjectURL(blob) {
    const url = URL.createObjectURL(blob);
    this.objectURLs.add(url);
    this.registerBlob(blob);
    return url;
  }

  /**
   * Revoke and clean up an object URL
   * @param {string} url - Object URL to revoke
   */
  revokeObjectURL(url) {
    if (this.objectURLs.has(url)) {
      URL.revokeObjectURL(url);
      this.objectURLs.delete(url);
    }
  }

  /**
   * Clean up all tracked resources
   */
  cleanup() {
    // Revoke all object URLs
    this.objectURLs.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this.objectURLs.clear();

    // Clear blob references
    this.activeBlobs.clear();
    this.currentMemoryEstimate = 0;

    // Request garbage collection if available
    this.requestGarbageCollection();
  }

  /**
   * Trigger cleanup when memory threshold is reached
   */
  triggerCleanup() {
    console.log('Memory threshold reached, triggering cleanup...');

    // Clean up old blobs
    const blobsToRemove = [];
    const keepCount = Math.floor(this.activeBlobs.size * 0.3); // Keep 30% newest
    let count = 0;

    for (const blob of this.activeBlobs) {
      if (count >= keepCount) {
        blobsToRemove.push(blob);
      }
      count++;
    }

    blobsToRemove.forEach((blob) => this.unregisterBlob(blob));

    // Clean up orphaned object URLs
    const urlsToRevoke = [];
    this.objectURLs.forEach((url) => {
      // Check if URL is still in use
      const img = document.querySelector(`img[src="${url}"]`);
      if (!img) {
        urlsToRevoke.push(url);
      }
    });

    urlsToRevoke.forEach((url) => this.revokeObjectURL(url));

    // Request garbage collection
    this.requestGarbageCollection();
  }

  /**
   * Request browser garbage collection (if available)
   */
  requestGarbageCollection() {
    if (typeof window !== 'undefined' && window.gc) {
      // Chrome with --js-flags="--expose-gc"
      window.gc();
    }
    // For other browsers, we rely on automatic GC
  }

  /**
   * Queue conversion with memory management
   * @param {Function} conversionTask - Conversion task to queue
   * @param {number} estimatedMemory - Estimated memory requirement
   * @returns {Promise} - Promise that resolves when conversion completes
   */
  async queueConversion(conversionTask, estimatedMemory) {
    return new Promise((resolve, reject) => {
      this.conversionQueue.push({
        task: conversionTask,
        estimatedMemory,
        resolve,
        reject,
      });

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process conversion queue with memory management
   */
  async processQueue() {
    if (this.conversionQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const item = this.conversionQueue[0];

    // Wait for memory if needed
    while (!this.hasAvailableMemory(item.estimatedMemory)) {
      await this.delay(100);
      this.triggerCleanup();
    }

    try {
      // Process conversion
      const result = await item.task();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.conversionQueue.shift();

      // Continue processing queue
      if (this.conversionQueue.length > 0) {
        // Small delay to allow UI updates
        await this.delay(10);
        this.processQueue();
      } else {
        this.isProcessing = false;
      }
    }
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Promise that resolves after delay
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get memory status
   * @returns {Object} - Memory status information
   */
  getMemoryStatus() {
    const current = this.getCurrentMemoryUsage();
    const max = this.maxMemoryUsage;
    const percentage = (current / max) * 100;

    return {
      current,
      max,
      percentage: percentage.toFixed(2),
      available: max - current,
      activeBlobCount: this.activeBlobs.size,
      activeURLCount: this.objectURLs.size,
      queueLength: this.conversionQueue.length,
      isHealthy: percentage < this.gcThreshold * 100,
    };
  }

  /**
   * Monitor memory usage and log warnings
   */
  startMonitoring(interval = 5000) {
    this.monitoringInterval = setInterval(() => {
      const status = this.getMemoryStatus();

      if (status.percentage > 90) {
        console.warn('Critical memory usage:', status);
        this.triggerCleanup();
      } else if (status.percentage > 70) {
        console.log('High memory usage:', status);
      }
    }, interval);
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Clean up and reset memory manager
   */
  dispose() {
    this.stopMonitoring();
    this.cleanup();
    this.conversionQueue = [];
    this.isProcessing = false;
  }
}

// Create singleton instance
let memoryManagerInstance = null;

/**
 * Get or create memory manager instance
 * @returns {MemoryManager} - Memory manager instance
 */
export function getMemoryManager() {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new MemoryManager();
  }
  return memoryManagerInstance;
}

// Export for different module systems
export default MemoryManager;
export { MemoryManager };
