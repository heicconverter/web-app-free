/**
 * Enhanced HEIC Converter Web Worker
 * Supports progress tracking and cancellation
 */

import SimpleHeicConverter from '../wasm/heic-to-wrapper.js';

// Track cancellation state
let isCancelled = false;

// Send progress update to main thread
function sendProgress(progress, stage, message) {
  self.postMessage({
    type: 'progress',
    progress,
    stage,
    message,
    timestamp: Date.now(),
  });
}

// Handle incoming messages
self.onmessage = async function (e) {
  const { type } = e.data;

  // Handle cancellation
  if (type === 'cancel') {
    isCancelled = true;
    self.postMessage({
      type: 'cancelled',
      message: 'Conversion cancelled by user',
    });
    return;
  }

  // Handle conversion request
  if (type === 'convert') {
    const { file, targetType, quality } = e.data;
    isCancelled = false; // Reset cancellation flag

    try {
      // Stage 1: Loading file (0-20%)
      sendProgress(0, 'loading', 'Starting conversion...');

      // Check for cancellation
      if (isCancelled) {
        throw new Error('Conversion cancelled');
      }

      sendProgress(10, 'loading', 'Reading file data...');

      // Small delay to simulate file reading
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (isCancelled) {
        throw new Error('Conversion cancelled');
      }

      sendProgress(20, 'loading', 'File loaded successfully');

      // Stage 2: Decoding HEIC (20-60%)
      sendProgress(20, 'decoding', 'Decoding HEIC format...');

      if (isCancelled) {
        throw new Error('Conversion cancelled');
      }

      // The actual conversion happens here
      let result;
      let conversionStartTime = Date.now();

      // Update progress during conversion
      const progressInterval = setInterval(() => {
        if (!isCancelled) {
          const elapsed = Date.now() - conversionStartTime;
          const estimatedProgress = Math.min(50, 20 + elapsed / 100);
          sendProgress(
            estimatedProgress,
            'decoding',
            'Processing image data...'
          );
        }
      }, 100);

      try {
        if (targetType === 'jpeg') {
          result = await SimpleHeicConverter.convertToJPEG(file, quality || 90);
        } else if (targetType === 'png') {
          result = await SimpleHeicConverter.convertToPNG(file);
        } else {
          throw new Error(`Unsupported conversion type: ${targetType}`);
        }
      } finally {
        clearInterval(progressInterval);
      }

      if (isCancelled) {
        throw new Error('Conversion cancelled');
      }

      sendProgress(60, 'decoding', 'Decoding complete');

      // Stage 3: Encoding output (60-90%)
      sendProgress(
        60,
        'encoding',
        `Encoding to ${targetType.toUpperCase()}...`
      );

      // Simulate encoding progress
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (isCancelled) {
        throw new Error('Conversion cancelled');
      }

      sendProgress(80, 'encoding', 'Optimizing output...');

      await new Promise((resolve) => setTimeout(resolve, 50));

      if (isCancelled) {
        throw new Error('Conversion cancelled');
      }

      sendProgress(90, 'encoding', 'Encoding complete');

      // Stage 4: Finalizing (90-100%)
      sendProgress(90, 'finalizing', 'Finalizing conversion...');

      // Create blob URL for the result
      const blob = new Blob([result], {
        type: targetType === 'jpeg' ? 'image/jpeg' : 'image/png',
      });

      if (isCancelled) {
        throw new Error('Conversion cancelled');
      }

      sendProgress(100, 'complete', 'Conversion successful!');

      // Send success result
      self.postMessage({
        success: true,
        result: blob,
        metadata: {
          originalSize: file.size,
          convertedSize: blob.size,
          compressionRatio: ((1 - blob.size / file.size) * 100).toFixed(2),
          format: targetType,
          quality: quality || (targetType === 'jpeg' ? 90 : 100),
        },
      });
    } catch (error) {
      // Handle errors and cancellation
      if (error.message === 'Conversion cancelled') {
        self.postMessage({
          success: false,
          cancelled: true,
          error: error.message,
        });
      } else {
        self.postMessage({
          success: false,
          error: error.message,
          stack: error.stack,
        });
      }
    }
  }
};

// Handle worker errors
self.onerror = function (error) {
  console.error('Worker error:', error);
  self.postMessage({
    success: false,
    error: 'Worker error: ' + error.message,
  });
};
