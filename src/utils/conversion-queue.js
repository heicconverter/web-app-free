/**
 * Enhanced Conversion Queue with Progress Tracking Integration
 * Manages HEIC conversion tasks with comprehensive progress reporting
 */

import { ProgressTracker } from './progress-tracker.js';

export class ConversionQueue {
  constructor(options = {}) {
    // Validate options
    if (options && typeof options !== 'object') {
      throw new Error('Options must be an object');
    }

    this.maxConcurrent = Math.max(1, options.maxConcurrent || 2);
    this.maxRetries = Math.max(0, options.maxRetries || 3);
    this.retryDelay = Math.max(100, options.retryDelay || 1000);
    this.maxWorkers = Math.max(1, options.maxWorkers || 4);

    // Queue management
    this.queue = [];
    this.activeWorkers = new Map();
    this.progressTracker = new ProgressTracker();
    this.isPaused = false;
    this.isDestroyed = false;

    // Worker pools
    this.workerPool = [];
    this.batchWorkerPool = [];
    this.failedWorkerCreations = 0;
    this.maxWorkerFailures = 3;

    // Event handlers
    this.eventHandlers = {
      progress: [],
      complete: [],
      error: [],
      cancelled: [],
      workerError: [],
      queuePaused: [],
      queueResumed: [],
    };

    // Performance metrics
    this.metrics = {
      totalTasksProcessed: 0,
      totalTasksFailed: 0,
      totalTasksCancelled: 0,
      averageProcessingTime: 0,
      workerUtilization: 0,
      startTime: Date.now(),
    };

    // Initialize worker pools with error handling
    this.initializeWorkerPools();
  }

  /**
   * Initialize worker pools for single and batch conversions
   */
  initializeWorkerPools() {
    try {
      // Pre-create minimal workers for better performance
      const initialWorkers = Math.min(2, this.maxWorkers);

      for (let i = 0; i < initialWorkers; i++) {
        try {
          this.createWorker('single');
        } catch (error) {
          console.warn(`Failed to create single worker ${i}:`, error.message);
          this.failedWorkerCreations++;
        }

        try {
          this.createWorker('batch');
        } catch (error) {
          console.warn(`Failed to create batch worker ${i}:`, error.message);
          this.failedWorkerCreations++;
        }
      }

      if (this.failedWorkerCreations >= this.maxWorkerFailures) {
        console.error(
          'Too many worker creation failures. Queue may not function properly.'
        );
        this.emit('workerError', {
          message: 'Worker pool initialization failed',
          failures: this.failedWorkerCreations,
        });
      }
    } catch (error) {
      console.error('Failed to initialize worker pools:', error);
      this.emit('workerError', {
        message: 'Worker pool initialization error',
        error: error.message,
      });
    }
  }

  /**
   * Create a new worker instance
   */
  createWorker(type) {
    if (this.isDestroyed) {
      throw new Error('Cannot create worker: queue has been destroyed');
    }

    if (!type || (type !== 'single' && type !== 'batch')) {
      throw new Error('Worker type must be "single" or "batch"');
    }

    const workerPath =
      type === 'batch'
        ? '/workers/batch-converter.worker.js'
        : '/workers/heic-converter.worker.js';

    let worker;
    try {
      worker = new Worker(workerPath, { type: 'module' });
    } catch (error) {
      console.error(`Failed to create ${type} worker:`, error);
      this.failedWorkerCreations++;

      // Create a mock worker for testing purposes if actual workers fail
      if (this.failedWorkerCreations >= this.maxWorkerFailures) {
        worker = this.createMockWorker(type);
      } else {
        throw new Error(`Failed to create ${type} worker: ${error.message}`);
      }
    }

    worker.metadata = {
      type,
      busy: false,
      taskId: null,
      created: Date.now(),
      isMock: worker.isMock || false,
      tasksProcessed: 0,
      lastActivity: Date.now(),
    };

    // Set up worker message handlers
    worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
    worker.onerror = (e) => this.handleWorkerError(worker, e);

    // Add worker to appropriate pool
    const pool = type === 'batch' ? this.batchWorkerPool : this.workerPool;
    pool.push(worker);

    return worker;
  }

  /**
   * Create a mock worker for testing when real workers fail
   */
  createMockWorker(type) {
    const mockWorker = {
      isMock: true,
      type,
      postMessage: (data) => {
        console.warn(`Mock ${type} worker received message:`, data);

        // Simulate worker response with delay
        setTimeout(() => {
          if (data.type === 'convert' || data.type === 'convert-batch') {
            // Simulate error for mock worker
            this.handleWorkerMessage(mockWorker, {
              data: {
                type: 'error',
                error: 'Mock worker - real workers unavailable',
              },
            });
          }
        }, 100);
      },
      terminate: () => {
        console.warn(`Mock ${type} worker terminated`);
      },
      onmessage: null,
      onerror: null,
    };

    return mockWorker;
  }

  /**
   * Get an available worker from the pool
   */
  getAvailableWorker(type) {
    const pool = type === 'batch' ? this.batchWorkerPool : this.workerPool;
    let worker = pool.find((w) => !w.metadata.busy);

    if (!worker && pool.length < this.maxWorkers) {
      worker = this.createWorker(type);
    }

    return worker;
  }

  /**
   * Add a single file to the conversion queue
   */
  async addFile(file, options = {}) {
    if (this.isDestroyed) {
      throw new Error('Cannot add file: queue has been destroyed');
    }

    // Validate file
    if (!file || typeof file !== 'object') {
      throw new Error('File must be a valid File object');
    }

    if (!file.name || typeof file.name !== 'string') {
      throw new Error('File must have a valid name');
    }

    if (typeof file.size !== 'number' || file.size < 0) {
      throw new Error('File must have a valid size');
    }

    // Validate options
    if (options && typeof options !== 'object') {
      throw new Error('Options must be an object');
    }

    const taskId = this.generateTaskId();
    const targetType = options.targetType || 'jpeg';
    const quality = Math.min(100, Math.max(1, options.quality || 90));

    // Validate target type
    const validTargetTypes = ['jpeg', 'jpg', 'png', 'webp'];
    if (!validTargetTypes.includes(targetType.toLowerCase())) {
      throw new Error(
        `Invalid target type: ${targetType}. Must be one of: ${validTargetTypes.join(', ')}`
      );
    }

    const task = {
      id: taskId,
      type: 'single',
      file,
      options: {
        targetType: targetType.toLowerCase(),
        quality,
        ...options,
      },
      retries: 0,
      status: 'queued',
      addedAt: Date.now(),
      priority: options.priority || 0,
    };

    try {
      // Register with progress tracker
      this.progressTracker.createTask(taskId, {
        fileName: file.name,
        fileSize: file.size,
        type: 'single',
        targetType: task.options.targetType,
        quality: task.options.quality,
      });

      this.queue.push(task);

      // Sort queue by priority (higher priority first)
      this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      this.processQueue();

      return taskId;
    } catch (error) {
      console.error('Failed to add file to queue:', error);
      throw new Error(`Failed to add file to queue: ${error.message}`);
    }
  }

  /**
   * Add multiple files for batch conversion
   */
  async addBatch(files, options = {}) {
    if (this.isDestroyed) {
      throw new Error('Cannot add batch: queue has been destroyed');
    }

    // Validate files
    if (!Array.isArray(files)) {
      throw new Error('Files must be an array');
    }

    if (files.length === 0) {
      throw new Error('Files array cannot be empty');
    }

    if (files.length > 100) {
      throw new Error('Batch size cannot exceed 100 files');
    }

    // Validate each file
    files.forEach((file, index) => {
      if (!file || typeof file !== 'object') {
        throw new Error(`File at index ${index} must be a valid File object`);
      }
      if (!file.name || typeof file.name !== 'string') {
        throw new Error(`File at index ${index} must have a valid name`);
      }
      if (typeof file.size !== 'number' || file.size < 0) {
        throw new Error(`File at index ${index} must have a valid size`);
      }
    });

    // Validate options
    if (options && typeof options !== 'object') {
      throw new Error('Options must be an object');
    }

    const taskId = this.generateTaskId();
    const targetType = options.targetType || 'jpeg';
    const quality = Math.min(100, Math.max(1, options.quality || 90));

    // Validate target type
    const validTargetTypes = ['jpeg', 'jpg', 'png', 'webp'];
    if (!validTargetTypes.includes(targetType.toLowerCase())) {
      throw new Error(
        `Invalid target type: ${targetType}. Must be one of: ${validTargetTypes.join(', ')}`
      );
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    const task = {
      id: taskId,
      type: 'batch',
      files,
      options: {
        targetType: targetType.toLowerCase(),
        quality,
        ...options,
      },
      retries: 0,
      status: 'queued',
      addedAt: Date.now(),
      priority: options.priority || 0,
    };

    try {
      // Register batch with progress tracker
      this.progressTracker.createTask(taskId, {
        fileCount: files.length,
        totalSize,
        type: 'batch',
        targetType: task.options.targetType,
        quality: task.options.quality,
        files: files.map((f) => ({ name: f.name, size: f.size })),
      });

      this.queue.push(task);

      // Sort queue by priority (higher priority first)
      this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      this.processQueue();

      return taskId;
    } catch (error) {
      console.error('Failed to add batch to queue:', error);
      throw new Error(`Failed to add batch to queue: ${error.message}`);
    }
  }

  /**
   * Process the queue
   */
  async processQueue() {
    // Don't process if paused or destroyed
    if (this.isPaused || this.isDestroyed) {
      return;
    }

    while (
      this.queue.length > 0 &&
      this.activeWorkers.size < this.maxConcurrent &&
      !this.isPaused &&
      !this.isDestroyed
    ) {
      const task = this.queue.shift();

      if (!task) break;

      const worker = this.getAvailableWorker(task.type);

      if (!worker) {
        // Put task back in queue if no worker available
        this.queue.unshift(task);
        break;
      }

      try {
        await this.executeTask(task, worker);
      } catch (error) {
        console.error('Error executing task:', error);
        this.handleTaskError(task, error);
      }
    }
  }

  /**
   * Pause the queue processing
   */
  pause() {
    if (this.isDestroyed) {
      throw new Error('Cannot pause: queue has been destroyed');
    }

    if (!this.isPaused) {
      this.isPaused = true;
      this.emit('queuePaused', {
        timestamp: Date.now(),
        queuedTasks: this.queue.length,
        activeTasks: this.activeWorkers.size,
      });
    }
  }

  /**
   * Resume the queue processing
   */
  resume() {
    if (this.isDestroyed) {
      throw new Error('Cannot resume: queue has been destroyed');
    }

    if (this.isPaused) {
      this.isPaused = false;
      this.emit('queueResumed', {
        timestamp: Date.now(),
        queuedTasks: this.queue.length,
        activeTasks: this.activeWorkers.size,
      });

      // Resume processing
      this.processQueue();
    }
  }

  /**
   * Check if queue is paused
   */
  isPausedState() {
    return this.isPaused;
  }

  /**
   * Get queue priority statistics
   */
  getQueuePriorities() {
    const priorities = this.queue.map((task) => task.priority || 0);
    return {
      min: Math.min(...priorities) || 0,
      max: Math.max(...priorities) || 0,
      average:
        priorities.length > 0
          ? priorities.reduce((sum, p) => sum + p, 0) / priorities.length
          : 0,
    };
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
          quality: task.options.quality,
        });
      } else {
        worker.postMessage({
          type: 'convert',
          file: task.file,
          targetType: task.options.targetType,
          quality: task.options.quality,
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
      timestamp: Date.now(),
    });

    this.emit('progress', {
      taskId: task.id,
      progress,
      stage,
      message,
      fileName: task.file?.name,
    });
  }

  /**
   * Handle batch progress updates
   */
  handleBatchProgress(task, data) {
    const { progress, currentFile, message, details } = data;

    this.progressTracker.updateProgress(task.id, progress, message, {
      currentFile,
      ...details,
    });

    this.emit('progress', {
      taskId: task.id,
      progress,
      currentFile,
      message,
      details,
    });
  }

  /**
   * Handle successful conversion
   */
  handleSuccess(task, data) {
    const { result, metadata } = data;
    const processingTime = Date.now() - task.addedAt;

    // Update metrics
    this.metrics.totalTasksProcessed++;
    this.updateAverageProcessingTime(processingTime);

    // Update worker stats
    const activeWorker = this.activeWorkers.get(task.id);
    if (activeWorker?.worker?.metadata) {
      activeWorker.worker.metadata.tasksProcessed++;
      activeWorker.worker.metadata.lastActivity = Date.now();
    }

    // Complete task in progress tracker with result
    this.progressTracker.completeTask(task.id, {
      result,
      metadata,
      processingTime,
      completedAt: Date.now(),
    });

    // Clean up worker
    this.releaseWorker(task.id);

    // Emit complete event
    this.emit('complete', {
      taskId: task.id,
      result,
      metadata,
      fileName: task.file?.name,
      processingTime,
      type: task.type,
    });

    // Process next item in queue
    this.processQueue();
  }

  /**
   * Handle batch completion
   */
  handleBatchComplete(task, data) {
    const { results, errors, summary } = data;
    const processingTime = Date.now() - task.addedAt;

    // Update metrics
    this.metrics.totalTasksProcessed++;
    this.updateAverageProcessingTime(processingTime);

    // Update worker stats
    const activeWorker = this.activeWorkers.get(task.id);
    if (activeWorker?.worker?.metadata) {
      activeWorker.worker.metadata.tasksProcessed++;
      activeWorker.worker.metadata.lastActivity = Date.now();
    }

    // Complete task in progress tracker with results
    this.progressTracker.completeTask(task.id, {
      results,
      errors,
      summary,
      processingTime,
      completedAt: Date.now(),
      successCount: results?.length || 0,
      errorCount: errors?.length || 0,
    });

    // Clean up worker
    this.releaseWorker(task.id);

    // Emit complete event
    this.emit('complete', {
      taskId: task.id,
      results,
      errors,
      summary,
      type: 'batch',
      processingTime,
      fileCount: task.files?.length || 0,
    });

    // Process next item in queue
    this.processQueue();
  }

  /**
   * Handle task cancellation
   */
  handleCancellation(task, data) {
    // Update metrics
    this.metrics.totalTasksCancelled++;

    this.progressTracker.cancelTask(task.id, data.message || 'Task cancelled');
    this.releaseWorker(task.id);

    this.emit('cancelled', {
      taskId: task.id,
      message: data.message,
      fileName: task.file?.name,
      type: task.type,
      cancelledAt: Date.now(),
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
        if (!this.isDestroyed) {
          task.status = 'queued';
          this.queue.unshift(task);
          this.processQueue();
        }
      }, this.retryDelay * task.retries);

      this.progressTracker.updateProgress(
        task.id,
        0,
        `Retrying... (Attempt ${task.retries + 1}/${this.maxRetries})`
      );
    } else {
      // Max retries reached - update metrics
      this.metrics.totalTasksFailed++;

      this.progressTracker.failTask(task.id, error.message, {
        retries: task.retries,
        lastError: error.message,
        failedAt: Date.now(),
      });

      this.releaseWorker(task.id);

      this.emit('error', {
        taskId: task.id,
        error: error.message,
        fileName: task.file?.name,
        retries: task.retries,
        type: task.type,
      });

      this.processQueue();
    }
  }

  /**
   * Update average processing time metric
   */
  updateAverageProcessingTime(newTime) {
    const totalProcessed = this.metrics.totalTasksProcessed;
    if (totalProcessed === 1) {
      this.metrics.averageProcessingTime = newTime;
    } else {
      // Rolling average
      this.metrics.averageProcessingTime =
        (this.metrics.averageProcessingTime * (totalProcessed - 1) + newTime) /
        totalProcessed;
    }
  }

  /**
   * Calculate worker utilization
   */
  calculateWorkerUtilization() {
    const totalWorkers = this.workerPool.length + this.batchWorkerPool.length;
    const busyWorkers = [...this.workerPool, ...this.batchWorkerPool].filter(
      (worker) => worker.metadata.busy
    ).length;

    return totalWorkers > 0 ? (busyWorkers / totalWorkers) * 100 : 0;
  }

  /**
   * Get comprehensive performance metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;

    return {
      ...this.metrics,
      uptime,
      workerUtilization: this.calculateWorkerUtilization(),
      tasksPerSecond:
        uptime > 0 ? this.metrics.totalTasksProcessed / (uptime / 1000) : 0,
      successRate:
        this.metrics.totalTasksProcessed > 0
          ? ((this.metrics.totalTasksProcessed -
              this.metrics.totalTasksFailed) /
              this.metrics.totalTasksProcessed) *
            100
          : 0,
      queueLength: this.queue.length,
      activeTasks: this.activeWorkers.size,
      isPaused: this.isPaused,
      isDestroyed: this.isDestroyed,
    };
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(worker, error) {
    console.log(
      'DEBUG - Error type:',
      typeof error,
      'Value:',
      error,
      'Constructor:',
      error?.constructor?.name
    );
    if (error instanceof Event) {
      console.error('Worker error: Event triggered', error.type);
      return;
    }
    if (
      typeof error === 'number' ||
      Object.prototype.toString.call(error) === '[object Number]'
    ) {
      console.error(`Worker error code: ${error}`);
    } else if (typeof error === 'string') {
      console.error(`Worker error message: ${error}`);
    } else if (error instanceof Error) {
      console.error(`Worker error: ${error.message}\n${error.stack}`);
    } else {
      console.error(
        'Worker error (unknown type): ' +
          (error?.constructor?.name || typeof error),
        error
      );
    }

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
    const queueIndex = this.queue.findIndex((t) => t.id === taskId);
    if (queueIndex !== -1) {
      const task = this.queue.splice(queueIndex, 1)[0];
      this.progressTracker.cancelTask(taskId);
      this.emit('cancelled', {
        taskId,
        message: 'Task cancelled',
        fileName: task.file?.name,
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
        fileName: task.file?.name,
      });
    }

    // Cancel active tasks
    for (const [, { worker, task }] of this.activeWorkers) {
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
    const overallProgress = this.progressTracker.getOverallProgress();
    const workerStats = this.getWorkerStats();

    return {
      queued: this.queue.length,
      active: this.activeWorkers.size,
      progress: overallProgress,
      workers: workerStats,
      isPaused: this.isPaused,
      isDestroyed: this.isDestroyed,
      priorities: this.getQueuePriorities(),
      metrics: {
        processed: this.metrics.totalTasksProcessed,
        failed: this.metrics.totalTasksFailed,
        cancelled: this.metrics.totalTasksCancelled,
        averageTime: Math.round(this.metrics.averageProcessingTime),
        utilization: Math.round(this.calculateWorkerUtilization() * 100) / 100,
      },
      uptime: Date.now() - this.metrics.startTime,
    };
  }

  /**
   * Get detailed worker statistics
   */
  getWorkerStats() {
    const singleWorkers = this.workerPool;
    const batchWorkers = this.batchWorkerPool;

    return {
      single: {
        total: singleWorkers.length,
        available: singleWorkers.filter((w) => !w.metadata.busy).length,
        busy: singleWorkers.filter((w) => w.metadata.busy).length,
        mock: singleWorkers.filter((w) => w.metadata.isMock).length,
      },
      batch: {
        total: batchWorkers.length,
        available: batchWorkers.filter((w) => !w.metadata.busy).length,
        busy: batchWorkers.filter((w) => w.metadata.busy).length,
        mock: batchWorkers.filter((w) => w.metadata.isMock).length,
      },
      totalTasks: [...singleWorkers, ...batchWorkers].reduce(
        (sum, w) => sum + (w.metadata.tasksProcessed || 0),
        0
      ),
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
      this.eventHandlers[event].forEach((handler) => handler(data));
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
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.isPaused = false;

    // Cancel all tasks
    this.cancelAll();

    // Wait a bit for cancellations to process
    setTimeout(() => {
      // Terminate all workers
      [...this.workerPool, ...this.batchWorkerPool].forEach((worker) => {
        if (worker.terminate) {
          worker.terminate();
        }
      });

      // Clear all arrays and maps
      this.workerPool = [];
      this.batchWorkerPool = [];
      this.activeWorkers.clear();
      this.queue = [];

      // Clear event handlers
      Object.keys(this.eventHandlers).forEach((event) => {
        this.eventHandlers[event] = [];
      });

      // Reset progress tracker
      if (this.progressTracker) {
        this.progressTracker.reset();
      }

      console.log('ConversionQueue destroyed');
    }, 100);
  }

  /**
   * Check if queue is destroyed
   */
  isDestroyedState() {
    return this.isDestroyed;
  }

  /**
   * Get queue health status
   */
  getHealthStatus() {
    const status = this.getQueueStatus();
    const metrics = this.getMetrics();

    return {
      healthy:
        !this.isDestroyed &&
        this.failedWorkerCreations < this.maxWorkerFailures,
      issues: [],
      recommendations: [],
      status: {
        queue: this.isDestroyed
          ? 'destroyed'
          : this.isPaused
            ? 'paused'
            : 'active',
        workers: status.workers.single.total + status.workers.batch.total,
        utilization: metrics.workerUtilization,
        successRate: metrics.successRate,
      },
    };
  }
}

// Export singleton instance for app-wide use
export const conversionQueue = new ConversionQueue({
  maxConcurrent: 2,
  maxWorkers: 4,
  maxRetries: 3,
});
