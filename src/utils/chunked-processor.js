/**
 * Chunked Processor for HEIC Conversion
 * Handles large file processing and batch operations in manageable chunks
 */

import { getMemoryManager } from './memory-manager.js';

class ChunkedProcessor {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 5; // Process 5 files at a time
    this.chunkDelay = options.chunkDelay || 50; // 50ms delay between chunks
    this.maxConcurrent = options.maxConcurrent || 3; // Max concurrent operations
    this.memoryManager = getMemoryManager();
    this.activeOperations = 0;
    this.processingQueue = [];
    this.isProcessing = false;
  }

  /**
   * Process an array of items in chunks
   * @param {Array} items - Items to process
   * @param {Function} processor - Function to process each item
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} - Array of results
   */
  async processInChunks(items, processor, options = {}) {
    const {
      onProgress = () => {},
      onChunkComplete = () => {},
      onError = (error, item, index) =>
        console.error('Processing error:', error),
      stopOnError = false,
      preserveOrder = true,
    } = options;

    const results = preserveOrder ? new Array(items.length) : [];
    const errors = [];
    let completed = 0;

    // Create chunks
    const chunks = this.createChunks(items);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      // Process chunk with concurrency control
      const chunkResults = await this.processChunk(
        chunk,
        processor,
        chunkIndex * this.chunkSize,
        {
          onItemComplete: (result, error, originalIndex) => {
            completed++;

            if (error) {
              errors.push({
                error,
                index: originalIndex,
                item: items[originalIndex],
              });
              onError(error, items[originalIndex], originalIndex);

              if (stopOnError) {
                throw error;
              }
            } else if (preserveOrder) {
              results[originalIndex] = result;
            } else {
              results.push(result);
            }

            // Report progress
            onProgress({
              completed,
              total: items.length,
              percentage: (completed / items.length) * 100,
              errors: errors.length,
              currentChunk: chunkIndex + 1,
              totalChunks: chunks.length,
            });
          },
        }
      );

      // Chunk completed
      onChunkComplete({
        chunkIndex: chunkIndex + 1,
        totalChunks: chunks.length,
        chunkResults,
        completed,
        total: items.length,
      });

      // Delay between chunks to prevent UI blocking
      if (chunkIndex < chunks.length - 1) {
        await this.delay(this.chunkDelay);
      }
    }

    return {
      results: preserveOrder ? results.filter((r) => r !== undefined) : results,
      errors,
      completed,
      total: items.length,
    };
  }

  /**
   * Create chunks from array
   * @param {Array} items - Items to chunk
   * @returns {Array} - Array of chunks
   */
  createChunks(items) {
    const chunks = [];
    for (let i = 0; i < items.length; i += this.chunkSize) {
      chunks.push(items.slice(i, i + this.chunkSize));
    }
    return chunks;
  }

  /**
   * Process a single chunk with concurrency control
   * @param {Array} chunk - Chunk items
   * @param {Function} processor - Processor function
   * @param {number} baseIndex - Base index for this chunk
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} - Chunk results
   */
  async processChunk(chunk, processor, baseIndex, options = {}) {
    const { onItemComplete = () => {} } = options;
    const promises = [];

    for (let i = 0; i < chunk.length; i++) {
      const item = chunk[i];
      const originalIndex = baseIndex + i;

      // Control concurrency
      while (this.activeOperations >= this.maxConcurrent) {
        await this.delay(10);
      }

      const promise = this.processItem(item, processor, originalIndex)
        .then((result) => {
          onItemComplete(result, null, originalIndex);
          return result;
        })
        .catch((error) => {
          onItemComplete(null, error, originalIndex);
          return { error, index: originalIndex };
        });

      promises.push(promise);
    }

    return Promise.allSettled(promises);
  }

  /**
   * Process a single item with memory management
   * @param {*} item - Item to process
   * @param {Function} processor - Processor function
   * @param {number} index - Item index
   * @returns {Promise} - Processing result
   */
  async processItem(item, processor, index) {
    this.activeOperations++;

    try {
      // Check memory before processing
      const memoryRequired = this.estimateItemMemory(item);

      if (!this.memoryManager.hasAvailableMemory(memoryRequired)) {
        // Wait for memory to be available
        await this.waitForMemory(memoryRequired);
      }

      // Process the item
      const result = await processor(item, index);

      // Register result in memory manager if it's a blob
      if (result instanceof Blob) {
        this.memoryManager.registerBlob(result);
      }

      return result;
    } finally {
      this.activeOperations--;
    }
  }

  /**
   * Estimate memory requirement for an item
   * @param {*} item - Item to estimate
   * @returns {number} - Estimated memory in bytes
   */
  estimateItemMemory(item) {
    if (item instanceof File || item instanceof Blob) {
      return this.memoryManager.estimateMemoryRequirement(item);
    } else if (item instanceof ArrayBuffer) {
      return this.memoryManager.estimateMemoryRequirement(item);
    }
    // Default estimate for unknown items
    return 10 * 1024 * 1024; // 10MB
  }

  /**
   * Wait for memory to be available
   * @param {number} required - Required memory in bytes
   * @param {number} maxWait - Maximum wait time in ms
   */
  async waitForMemory(required, maxWait = 30000) {
    const startTime = Date.now();

    while (!this.memoryManager.hasAvailableMemory(required)) {
      if (Date.now() - startTime > maxWait) {
        throw new Error('Timeout waiting for available memory');
      }

      // Trigger cleanup and wait
      this.memoryManager.triggerCleanup();
      await this.delay(100);
    }
  }

  /**
   * Process files with automatic chunking based on file sizes
   * @param {Array} files - Files to process
   * @param {Function} processor - File processor function
   * @param {Object} options - Processing options
   * @returns {Promise} - Processing results
   */
  async processFiles(files, processor, options = {}) {
    // Sort files by size (smallest first for memory efficiency)
    const sortedFiles = [...files].sort((a, b) => {
      const sizeA = a instanceof File ? a.size : 0;
      const sizeB = b instanceof File ? b.size : 0;
      return sizeA - sizeB;
    });

    // Adjust chunk size based on file sizes
    const totalSize = sortedFiles.reduce((sum, file) => {
      return sum + (file instanceof File ? file.size : 0);
    }, 0);

    const avgFileSize = totalSize / sortedFiles.length;
    const adaptiveChunkSize = this.calculateAdaptiveChunkSize(avgFileSize);

    // Temporarily adjust chunk size
    const originalChunkSize = this.chunkSize;
    this.chunkSize = adaptiveChunkSize;

    try {
      return await this.processInChunks(sortedFiles, processor, options);
    } finally {
      // Restore original chunk size
      this.chunkSize = originalChunkSize;
    }
  }

  /**
   * Calculate adaptive chunk size based on file sizes
   * @param {number} avgFileSize - Average file size in bytes
   * @returns {number} - Optimal chunk size
   */
  calculateAdaptiveChunkSize(avgFileSize) {
    const MB = 1024 * 1024;

    if (avgFileSize < MB) {
      return 10; // Small files: process 10 at a time
    } else if (avgFileSize < 10 * MB) {
      return 5; // Medium files: process 5 at a time
    } else if (avgFileSize < 50 * MB) {
      return 3; // Large files: process 3 at a time
    } else {
      return 1; // Very large files: process 1 at a time
    }
  }

  /**
   * Process with retry logic
   * @param {Array} items - Items to process
   * @param {Function} processor - Processor function
   * @param {Object} options - Processing options
   * @returns {Promise} - Processing results
   */
  async processWithRetry(items, processor, options = {}) {
    const {
      maxRetries = 2,
      retryDelay = 1000,
      retryBackoff = 2,
      ...processOptions
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.processInChunks(
          items,
          async (item, index) => {
            // Wrap processor with retry logic for individual items
            let itemError;

            for (
              let itemAttempt = 0;
              itemAttempt <= maxRetries;
              itemAttempt++
            ) {
              try {
                return await processor(item, index);
              } catch (error) {
                itemError = error;

                if (itemAttempt < maxRetries) {
                  await this.delay(
                    retryDelay * Math.pow(retryBackoff, itemAttempt)
                  );
                }
              }
            }

            throw itemError;
          },
          processOptions
        );
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          console.warn(`Processing attempt ${attempt + 1} failed, retrying...`);
          await this.delay(retryDelay * Math.pow(retryBackoff, attempt));
        }
      }
    }

    throw lastError;
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
   * Get processor status
   * @returns {Object} - Processor status
   */
  getStatus() {
    return {
      activeOperations: this.activeOperations,
      maxConcurrent: this.maxConcurrent,
      chunkSize: this.chunkSize,
      chunkDelay: this.chunkDelay,
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing,
      memoryStatus: this.memoryManager.getMemoryStatus(),
    };
  }

  /**
   * Update processor configuration
   * @param {Object} options - New configuration options
   */
  configure(options = {}) {
    if (options.chunkSize !== undefined) {
      this.chunkSize = Math.max(1, options.chunkSize);
    }
    if (options.chunkDelay !== undefined) {
      this.chunkDelay = Math.max(0, options.chunkDelay);
    }
    if (options.maxConcurrent !== undefined) {
      this.maxConcurrent = Math.max(1, options.maxConcurrent);
    }
  }

  /**
   * Stop all processing and clean up
   */
  dispose() {
    this.activeOperations = 0;
    this.processingQueue = [];
    this.isProcessing = false;
  }
}

// Create singleton instance
let chunkedProcessorInstance = null;

/**
 * Get or create chunked processor instance
 * @param {Object} options - Processor options
 * @returns {ChunkedProcessor} - Processor instance
 */
export function getChunkedProcessor(options = {}) {
  if (!chunkedProcessorInstance) {
    chunkedProcessorInstance = new ChunkedProcessor(options);
  }
  return chunkedProcessorInstance;
}

// Export for different module systems
export default ChunkedProcessor;
export { ChunkedProcessor };
