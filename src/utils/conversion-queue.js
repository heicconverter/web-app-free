// ConversionQueue: HEIC conversion queue with priority, status, cancellation, and memory manager integration

class ConversionQueue {
  constructor({ memoryManager, maxConcurrent = 2 } = {}) {
    this.queue = [];
    this.activeConversions = new Map();
    this.listeners = new Map();
    this.memoryManager = memoryManager;
    this.maxConcurrent = maxConcurrent;
    this.processing = false;
    this.stats = {
      totalProcessed: 0,
      totalFailed: 0,
      totalCancelled: 0,
      averageProcessingTime: 0
    };
  }

  add(item) {
    // item: { id, file, priority, ... }
    item.state = 'PENDING';
    item.retryCount = 0;
    item.maxRetries = item.maxRetries || 2;
    this.queue.push(item);
    this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    this.emitEvent('itemAdded', item);
    this.process();
    return item.id;
  }

  async process() {
    if (this.processing) return;
    this.processing = true;
    while (this.activeConversions.size < this.maxConcurrent) {
      const nextItem = this.queue.find(item => item.state === 'PENDING');
      if (!nextItem) break;
      nextItem.state = 'PROCESSING';
      nextItem.startedAt = Date.now();
      this.activeConversions.set(nextItem.id, nextItem);
      this.emitEvent('processing', nextItem);
      this._convert(nextItem);
    }
    this.processing = false;
  }

  async _convert(item) {
    try {
      // Simulate conversion (replace with actual HEIC conversion logic)
      await new Promise(res => setTimeout(res, 100));
      const result = { size: item.file.size, type: 'image/jpeg' };
      
      item.state = 'COMPLETED';
      item.completedAt = Date.now();
      item.result = result;
      this.stats.totalProcessed++;
      this.updateAverageProcessingTime(item);
      this.emitEvent('completed', item);
    } catch (error) {
      item.state = 'FAILED';
      item.error = error.message;
      item.completedAt = Date.now();
      
      if (item.retryCount < item.maxRetries) {
        item.retryCount++;
        item.state = 'PENDING';
        item.error = null;
        this.emitEvent('retry', item);
        this.process();
      } else {
        this.stats.totalFailed++;
        this.emitEvent('failed', item);
      }
    } finally {
      this.activeConversions.delete(item.id);
      this.process(); // Continue processing remaining items
    }
  }

  cancel(id) {
    const item = this.queue.find(item => item.id === id);
    if (!item || item.state !== 'PENDING') return false;
    
    item.state = 'CANCELLED';
    item.completedAt = Date.now();
    this.stats.totalCancelled++;
    this.emitEvent('cancelled', item);
    return true;
  }

  getStatus() {
    const pending = this.queue.filter(item => item.state === 'PENDING').length;
    const processing = this.activeConversions.size;
    const completed = this.queue.filter(item => item.state === 'COMPLETED').length;
    const failed = this.queue.filter(item => item.state === 'FAILED').length;
    const cancelled = this.queue.filter(item => item.state === 'CANCELLED').length;

    return {
      pending,
      processing,
      completed,
      failed,
      cancelled,
      total: this.queue.length,
      stats: { ...this.stats }
    };
  }

  updateAverageProcessingTime(item) {
    const processingTime = item.completedAt - item.startedAt;
    const totalItems = this.stats.totalProcessed;
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (totalItems - 1) + processingTime) / totalItems;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emitEvent(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  clearCompleted() {
    this.queue = this.queue.filter(item => item.state !== 'COMPLETED');
  }

  clearAll() {
    this.queue = [];
    this.activeConversions.clear();
    this.processing = false;
  }
}

export default ConversionQueue;