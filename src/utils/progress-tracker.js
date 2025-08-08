// Progress Tracker for HEIC Converter
// Tracks conversion progress with detailed statistics and event handling

class ProgressTracker {
  constructor() {
    this.listeners = new Map();
    this.reset();
  }

  reset() {
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      failedFiles: 0,
      cancelledFiles: 0,
      totalBytes: 0,
      processedBytes: 0,
      startTime: null,
      endTime: null,
      averageFileSize: 0,
      estimatedTimeRemaining: null,
      currentThroughput: 0
    };
  }

  startTracking(totalFiles, totalBytes) {
    this.stats.totalFiles = totalFiles;
    this.stats.totalBytes = totalBytes;
    this.stats.startTime = Date.now();
    this.stats.averageFileSize = totalFiles > 0 ? totalBytes / totalFiles : 0;
    this.emitEvent('trackingStarted', this.getProgress());
  }

  updateFileProgress(fileSize, progress = 100) {
    const progressBytes = Math.floor((fileSize * progress) / 100);
    this.stats.processedBytes = Math.min(
      this.stats.processedBytes + progressBytes,
      this.stats.totalBytes
    );
    this.updateEstimates();
    this.emitEvent('progressUpdated', this.getProgress());
  }

  completeFile(fileSize) {
    this.stats.processedFiles++;
    this.updateEstimates();
    this.emitEvent('fileCompleted', this.getProgress());
  }

  failFile(fileSize) {
    this.stats.failedFiles++;
    this.stats.processedFiles++;
    this.updateEstimates();
    this.emitEvent('fileFailed', this.getProgress());
  }

  cancelFile(fileSize) {
    this.stats.cancelledFiles++;
    this.updateEstimates();
    this.emitEvent('fileCancelled', this.getProgress());
  }

  updateEstimates() {
    const now = Date.now();
    const elapsed = now - this.stats.startTime;
    
    if (elapsed > 0 && this.stats.processedBytes > 0) {
      // Calculate throughput in bytes per millisecond
      this.stats.currentThroughput = this.stats.processedBytes / elapsed;
      
      // Estimate remaining time
      const remainingBytes = this.stats.totalBytes - this.stats.processedBytes;
      if (this.stats.currentThroughput > 0) {
        this.stats.estimatedTimeRemaining = remainingBytes / this.stats.currentThroughput;
      }
    }
  }

  finish() {
    this.stats.endTime = Date.now();
    this.emitEvent('trackingFinished', this.getProgress());
  }

  getProgress() {
    const fileProgress = this.stats.totalFiles > 0 
      ? (this.stats.processedFiles / this.stats.totalFiles) * 100 
      : 0;
    
    const byteProgress = this.stats.totalBytes > 0 
      ? (this.stats.processedBytes / this.stats.totalBytes) * 100 
      : 0;

    const elapsedTime = this.stats.startTime 
      ? (this.stats.endTime || Date.now()) - this.stats.startTime 
      : 0;

    return {
      ...this.stats,
      fileProgressPercent: Math.round(fileProgress * 100) / 100,
      byteProgressPercent: Math.round(byteProgress * 100) / 100,
      elapsedTime,
      isComplete: this.stats.processedFiles >= this.stats.totalFiles,
      throughputBytesPerSecond: this.stats.currentThroughput * 1000
    };
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  emitEvent(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in progress tracker listener for ${event}:`, error);
      }
    });
  }
}

export default ProgressTracker;