/**
 * Batch HEIC Converter Web Worker
 * Handles multiple file conversions with progress tracking and cancellation
 */

import SimpleHeicConverter from '../wasm/heic-to-wrapper.js';

// Track batch conversion state
let batchState = {
  isCancelled: false,
  currentFileIndex: 0,
  totalFiles: 0,
  results: [],
  errors: [],
  startTime: null,
  filesProcessed: 0
};

// Calculate overall progress based on file progress
function calculateBatchProgress(fileIndex, fileProgress) {
  const baseProgress = (fileIndex / batchState.totalFiles) * 100;
  const fileContribution = (fileProgress / batchState.totalFiles);
  return Math.min(100, baseProgress + fileContribution);
}

// Send progress update to main thread
function sendProgress(progress, currentFile, message, details = {}) {
  self.postMessage({
    type: 'batch-progress',
    progress,
    currentFile,
    message,
    details: {
      ...details,
      filesProcessed: batchState.filesProcessed,
      totalFiles: batchState.totalFiles,
      elapsedTime: Date.now() - batchState.startTime,
      estimatedTimeRemaining: calculateEstimatedTimeRemaining()
    },
    timestamp: Date.now()
  });
}

// Calculate estimated time remaining
function calculateEstimatedTimeRemaining() {
  if (batchState.filesProcessed === 0) return null;
  
  const elapsedTime = Date.now() - batchState.startTime;
  const averageTimePerFile = elapsedTime / batchState.filesProcessed;
  const filesRemaining = batchState.totalFiles - batchState.filesProcessed;
  
  return Math.round(averageTimePerFile * filesRemaining);
}

// Convert a single file with progress tracking
async function convertSingleFile(file, targetType, quality, fileIndex) {
  const fileName = file.name;
  
  try {
    // Report file start
    sendProgress(
      calculateBatchProgress(fileIndex, 0),
      fileName,
      `Starting conversion of ${fileName}`,
      { stage: 'loading' }
    );

    // Check for cancellation
    if (batchState.isCancelled) {
      throw new Error('Batch conversion cancelled');
    }

    // Simulate loading phase
    await new Promise(resolve => setTimeout(resolve, 50));
    sendProgress(
      calculateBatchProgress(fileIndex, 20),
      fileName,
      `Loading ${fileName}`,
      { stage: 'loading' }
    );

    if (batchState.isCancelled) {
      throw new Error('Batch conversion cancelled');
    }

    // Perform conversion
    sendProgress(
      calculateBatchProgress(fileIndex, 40),
      fileName,
      `Decoding ${fileName}`,
      { stage: 'decoding' }
    );

    let result;
    if (targetType === 'jpeg') {
      result = await SimpleHeicConverter.convertToJPEG(file, quality || 90);
    } else if (targetType === 'png') {
      result = await SimpleHeicConverter.convertToPNG(file);
    } else {
      throw new Error(`Unsupported conversion type: ${targetType}`);
    }

    if (batchState.isCancelled) {
      throw new Error('Batch conversion cancelled');
    }

    // Encoding phase
    sendProgress(
      calculateBatchProgress(fileIndex, 70),
      fileName,
      `Encoding ${fileName}`,
      { stage: 'encoding' }
    );

    await new Promise(resolve => setTimeout(resolve, 50));

    // Create blob
    const blob = new Blob([result], {
      type: targetType === 'jpeg' ? 'image/jpeg' : 'image/png'
    });

    // Finalizing
    sendProgress(
      calculateBatchProgress(fileIndex, 90),
      fileName,
      `Finalizing ${fileName}`,
      { stage: 'finalizing' }
    );

    // Complete
    sendProgress(
      calculateBatchProgress(fileIndex, 100),
      fileName,
      `Completed ${fileName}`,
      { stage: 'complete' }
    );

    batchState.filesProcessed++;

    return {
      success: true,
      fileName,
      blob,
      metadata: {
        originalSize: file.size,
        convertedSize: blob.size,
        compressionRatio: ((1 - blob.size / file.size) * 100).toFixed(2),
        format: targetType,
        quality: quality || (targetType === 'jpeg' ? 90 : 100)
      }
    };

  } catch (error) {
    batchState.errors.push({
      fileName,
      error: error.message
    });

    return {
      success: false,
      fileName,
      error: error.message
    };
  }
}

// Handle incoming messages
self.onmessage = async function (e) {
  const { type } = e.data;

  // Handle cancellation
  if (type === 'cancel-batch') {
    batchState.isCancelled = true;
    self.postMessage({
      type: 'batch-cancelled',
      message: 'Batch conversion cancelled by user',
      results: batchState.results,
      errors: batchState.errors
    });
    return;
  }

  // Handle batch conversion request
  if (type === 'convert-batch') {
    const { files, targetType, quality } = e.data;
    
    // Reset batch state
    batchState = {
      isCancelled: false,
      currentFileIndex: 0,
      totalFiles: files.length,
      results: [],
      errors: [],
      startTime: Date.now(),
      filesProcessed: 0
    };

    // Send initial progress
    sendProgress(0, '', `Starting batch conversion of ${files.length} files`, {
      stage: 'initializing'
    });

    // Process files sequentially
    for (let i = 0; i < files.length; i++) {
      if (batchState.isCancelled) {
        break;
      }

      batchState.currentFileIndex = i;
      const result = await convertSingleFile(files[i], targetType, quality, i);
      
      if (result.success) {
        batchState.results.push(result);
      }
    }

    // Send completion message
    if (!batchState.isCancelled) {
      sendProgress(100, '', 'Batch conversion complete', {
        stage: 'complete'
      });

      self.postMessage({
        type: 'batch-complete',
        results: batchState.results,
        errors: batchState.errors,
        summary: {
          totalFiles: batchState.totalFiles,
          successCount: batchState.results.length,
          errorCount: batchState.errors.length,
          totalTime: Date.now() - batchState.startTime
        }
      });
    }
  }
};

// Handle worker errors
self.onerror = function(error) {
  console.error('Batch worker error:', error);
  self.postMessage({
    type: 'batch-error',
    error: 'Batch worker error: ' + error.message
  });
};