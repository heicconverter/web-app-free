/**
 * Enhanced Conversion Queue with Progress Tracking Integration
 * Manages HEIC conversion tasks with comprehensive progress reporting
 */

import { ProgressTracker } from './progress-tracker.js';

export class ConversionQueue {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 2;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    // Queue management
    this.queue = [];
    this.activeWorkers = new Map();
    this.progressTracker = new ProgressTracker();
    
    // Worker pools
    this.workerPool = [];
    this.batchWorkerPool = [];
    this.maxWorkers = options.maxWorkers || 4;
    
    // Event handlers
    this.eventHandlers = {
      progress: [],
      complete: [],
      error: [],
      cancelled: []
    };
    
    // Initialize worker pools
    this.initializeWorkerPools();
  }

  /**
   * Initialize worker pools for single and batch conversions
   */
  initializeWorkerPools() {
    // Pre-create workers for better performance
    for (let i = 0; i < Math.min(2, this.maxWorkers); i++) {
      this.createWorker('single');
      this.createWorker('batch');
    }
  }

  /**
   * Create a new worker instance
   */
  createWorker(type) {
    const workerPath = type === 'batch' 
      ? '/workers/batch-converter.worker.js'
      : '/workers/heic-converter.worker.js';
    
    const worker = new Worker(workerPath, { type: 'module' });
    
    worker.metadata = {
      type,
      busy: false,
      taskId: null,
      created: Date.now()
    };

    // Set up worker message handlers
    worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
    worker.onerror = (e) => this.handleWorkerError(worker, e);

    if (type === 'batch') {
      this.batchWorkerPool.push(worker);
    } else {
      this.workerPool.push(worker);
    }

    return worker;
  }

  /**
   * Get an available worker from the pool
   */
  getAvailableWorker(type) {
    const pool = type === 'batch' ? this.batchWorkerPool : this.workerPool;
    let worker = pool.find(w => !w.metadata.busy);
    
    if (!worker && pool.length < this.maxWorkers) {
      worker = this.createWorker(type);
    }
    
    return worker;
  }

  /**
   * Add a single file to the conversion queue
   */
  async addFile(file, options = {}) {
    const taskId = this.generateTaskId();
    
    const task = {
      id: taskId,
      type: 'single',
      file,
      options: {
        targetType: options.targetType || 'jpeg',
        quality: options.quality || 90,
        ...options
      },
      retries: 0,
      status: 'queued',
      addedAt: Date.now()
    };

    // Register with progress tracker
    this.progressTracker.createTask(taskId, {
      fileName: file.name,
      fileSize: file.size,
      type: 'single'
    });

    this.queue.push(task);
    this.processQueue();
    
    return taskId;
  }

  /**
   * Add multiple files for batch conversion
   */
  async addBatch(files, options = {}) {
    const taskId = this.generateTaskId();
    
    const task = {
      id: taskId,
      type: 'batch',
      files,
      options: {
        targetType: options.targetType || 'jpeg',
        quality: options.quality || 90,
        ...options
      },
      retries: 0,
      status: 'queued',
      addedAt: Date.now()
    };

    // Register batch with progress tracker
    this.progressTracker.createTask(taskId, {
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      type: 'batch'
    });

    this.queue.push(task);
    this.processQueue();
    
    return taskId;
  }

  /**
   * Process the queue
   */
  async processQueue() {
    while (this.queue.length > 0 && this.activeWorkers.size < this.maxConcurrent) {
      const task = this.queue.shift();
      
      if (!task) break;
      
      const worker = this.getAvailableWorker(task.type);
      
      if (!worker) {
        // Put task back in queue if no worker available
        this.queue.unshift(task);
        break;
      }

      await this.executeTask(task, worker);
    }
  }

  /**
   * Execute a conversion task
   */
  async executeTask(task, worker) {
    worker.metadata.busy = true;
    worker.metadata.taskId = task.id;
    this.activeWorkers.set(task.id, { task, worker });

    // Update task status
    task.status = 'processing';
    this.progressTracker.updateProgress(task.id, 0, 'Starting conversion');

    try {
      if (task.type === 'batch') {
        worker.postMessage({
          type: 'convert-batch',
          files: task.files,
          targetType: task.options.targetType,
          quality: task.options.quality
        });
      } else {
        worker.postMessage({
          type: 'convert',
          file: task.file,
          targetType: task.options.targetType,
          quality: task.options.quality
        });
      }
    } catch (error) {
      this.handleTaskError(task, error);
    }
  }

  /**
   * Handle messages from workers
   */
  handleWorkerMessage(worker, event) {
    const { type } = event.data;
    const activeTask = this.activeWorkers.get(worker.metadata.taskId);
    
    if (!activeTask) return;

    switch (type) {
      case 'progress':
        this.handleProgress(activeTask.task, event.data);
        break;
      
      case 'batch-progress':
        this.handleBatchProgress(activeTask.task, event.data);
        break;
      
      case 'success':
        this.handleSuccess(activeTask.task, event.data);
        break;
      
      case 'batch-complete':
        this.handleBatchComplete(activeTask.task, event.data);
        break;
      
      case 'cancelled':
      case 'batch-cancelled':
        this.handleCancellation(activeTask.task, event.data);
        break;
      
      case 'error':
      case 'batch-error':
        this.handleTaskError(activeTask.task, new Error(event.data.error));
        break;
    }
  }

  /**
   * Handle progress updates
   */
  handleProgress(task, data) {
    const { progress, stage, message } = data;
    
    this.progressTracker.updateProgress(task.id, progress, message, {
      stage,
      timestamp: Date.now()
    });

    this.emit('progress', {
      taskId: task.id,
      progress,
      stage,
      message,
      fileName: task.file?.name
    });
  }

  /**
   * Handle batch progress updates
   */
  handleBatchProgress(task, data) {
    const { progress, currentFile, message, details } = data;
    
    this.progressTracker.updateProgress(task.id, progress, message, {
      currentFile,
      ...details
    });

    this.emit('progress', {
      taskId: task.id,
      progress,
      currentFile,
      message,
      details
    });
  }

  /**
   * Handle successful conversion
   */
  handleSuccess(task, data) {
    const { result, metadata } = data;
    
    // Complete task in progress tracker
    this.progressTracker.completeTask(task.id);
    
    // Clean up worker
    this.releaseWorker(task.id);
    
    // Emit complete event
    this.emit('complete', {
      taskId: task.id,
      result,
      metadata,
      fileName: task.file?.name
    });
    
    // Process next item in queue
    this.processQueue();
  }

  /**
   * Handle batch completion
   */
  handleBatchComplete(task, data) {
    const { results, errors, summary } = data;
    
    // Complete task in progress tracker
    this.progressTracker.completeTask(task.id);
    
    // Clean up worker
    this.releaseWorker(task.id);
    
    // Emit complete event
    this.emit('complete', {
      taskId: task.id,
      results,
      errors,
      summary,
      type: 'batch'
    });
    
    // Process next item in queue
    this.processQueue();
  }

  /**
   * Handle task cancellation
   */
  handleCancellation(task, data) {
    this.progressTracker.cancelTask(task.id);
    this.releaseWorker(task.id);
    
    this.emit('cancelled', {
      taskId: task.id,
      message: data.message,
      fileName: task.file?.name
    });
    
    this.processQueue();
  }

  /**
   * Handle task errors
   */
  handleTaskError(task, error) {
    task.retries++;
    
    if (task.retries < this.maxRetries) {
      // Retry the task
      setTimeout(() => {
        task.status = 'queued';
        this.queue.unshift(task);
        this.processQueue();
      }, this.retryDelay * task.retries);
      
      this.progressTracker.updateProgress(
        task.id, 
        0, 
        `Retrying... (Attempt ${task.retries + 1}/${this.maxRetries})`
      );
    } else {
      // Max retries reached
      this.progressTracker.failTask(task.id, error.message);
      this.releaseWorker(task.id);
      
      this.emit('error', {
        taskId: task.id,
        error: error.message,
        fileName: task.file?.name
      });
      
      this.processQueue();
    }
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(worker, error) {
    console.error('Worker error:', error);
    
    const taskId = worker.metadata.taskId;
    if (taskId && this.activeWorkers.has(taskId)) {
      const { task } = this.activeWorkers.get(taskId);
      this.handleTaskError(task, new Error('Worker crashed'));
    }
    
    // Replace crashed worker
    this.replaceWorker(worker);
  }

  /**
   * Release a worker back to the pool
   */
  releaseWorker(taskId) {
    const activeTask = this.activeWorkers.get(taskId);
    if (activeTask) {
      activeTask.worker.metadata.busy = false;
      activeTask.worker.metadata.taskId = null;
      this.activeWorkers.delete(taskId);
    }
  }

  /**
   * Replace a crashed worker
   */
  replaceWorker(worker) {
    const type = worker.metadata.type;
    const pool = type === 'batch' ? this.batchWorkerPool : this.workerPool;
    const index = pool.indexOf(worker);
    
    if (index !== -1) {
      worker.terminate();
      pool.splice(index, 1);
      this.createWorker(type);
    }
  }

  /**
   * Cancel a specific task
   */
  cancelTask(taskId) {
    // Check if task is in queue
    const queueIndex = this.queue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      const task = this.queue.splice(queueIndex, 1)[0];
      this.progressTracker.cancelTask(taskId);
      this.emit('cancelled', {
        taskId,
        message: 'Task cancelled',
        fileName: task.file?.name
      });
      return true;
    }

    // Check if task is active
    const activeTask = this.activeWorkers.get(taskId);
    if (activeTask) {
      const { worker, task } = activeTask;
      const cancelType = task.type === 'batch' ? 'cancel-batch' : 'cancel';
      worker.postMessage({ type: cancelType });
      return true;
    }

    return false;
  }

  /**
   * Cancel all tasks
   */
  cancelAll() {
    // Cancel queued tasks
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      this.progressTracker.cancelTask(task.id);
      this.emit('cancelled', {
        taskId: task.id,
        message: 'All tasks cancelled',
        fileName: task.file?.name
      });
    }

    // Cancel active tasks
    for (const [_taskId, { worker, task }] of this.activeWorkers) {
      const cancelType = task.type === 'batch' ? 'cancel-batch' : 'cancel';
      worker.postMessage({ type: cancelType });
    }
  }

  /**
   * Get progress for a specific task
   */
  getProgress(taskId) {
    return this.progressTracker.getTaskProgress(taskId);
  }

  /**
   * Get overall queue status
   */
  getQueueStatus() {
    return {
      queued: this.queue.length,
      active: this.activeWorkers.size,
      progress: this.progressTracker.getOverallProgress(),
      workers: {
        single: this.workerPool.filter(w => !w.metadata.busy).length,
        batch: this.batchWorkerPool.filter(w => !w.metadata.busy).length
      }
    };
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    }
  }

  /**
   * Remove event handler
   */
  off(event, handler) {
    if (this.eventHandlers[event]) {
      const index = this.eventHandlers[event].indexOf(handler);
      if (index !== -1) {
        this.eventHandlers[event].splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }

  /**
   * Generate unique task ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.cancelAll();
    
    // Terminate all workers
    [...this.workerPool, ...this.batchWorkerPool].forEach(worker => {
      worker.terminate();
    });
    
    this.workerPool = [];
    this.batchWorkerPool = [];
    this.activeWorkers.clear();
    this.queue = [];
  }
}

// Export singleton instance for app-wide use
export const conversionQueue = new ConversionQueue({
  maxConcurrent: 2,
  maxWorkers: 4,
  maxRetries: 3
});