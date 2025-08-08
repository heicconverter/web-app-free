/**
 * Progress UI Component
 * Displays real-time conversion progress with detailed status information
 */

import React, { useState, useEffect, useRef } from 'react';
import { conversionQueue } from '../utils/conversion-queue.js';
import { formatBytes, formatTime } from '../utils/format-helpers.js';
import './ProgressUI.css';

export const ProgressUI = ({ className = '' }) => {
  const [tasks, setTasks] = useState([]);
  const [queueStatus, setQueueStatus] = useState({
    queued: 0,
    active: 0,
    progress: 0,
    workers: { single: 0, batch: 0 }
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const updateInterval = useRef(null);

  useEffect(() => {
    // Set up event listeners
    const handleProgress = (data) => {
      updateTask(data.taskId, {
        progress: data.progress,
        stage: data.stage,
        message: data.message,
        currentFile: data.currentFile,
        details: data.details
      });
    };

    const handleComplete = (data) => {
      updateTask(data.taskId, {
        status: 'completed',
        progress: 100,
        result: data.result,
        metadata: data.metadata,
        summary: data.summary
      });
      
      // Remove completed task after delay
      setTimeout(() => removeTask(data.taskId), 5000);
    };

    const handleError = (data) => {
      updateTask(data.taskId, {
        status: 'error',
        error: data.error
      });
    };

    const handleCancelled = (data) => {
      updateTask(data.taskId, {
        status: 'cancelled',
        message: data.message
      });
      
      // Remove cancelled task after delay
      setTimeout(() => removeTask(data.taskId), 3000);
    };

    // Register event handlers
    conversionQueue.on('progress', handleProgress);
    conversionQueue.on('complete', handleComplete);
    conversionQueue.on('error', handleError);
    conversionQueue.on('cancelled', handleCancelled);

    // Update queue status periodically
    updateInterval.current = setInterval(() => {
      setQueueStatus(conversionQueue.getQueueStatus());
    }, 250);

    return () => {
      conversionQueue.off('progress', handleProgress);
      conversionQueue.off('complete', handleComplete);
      conversionQueue.off('error', handleError);
      conversionQueue.off('cancelled', handleCancelled);
      
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, []);

  const updateTask = (taskId, updates) => {
    setTasks(prev => {
      const existing = prev.find(t => t.id === taskId);
      if (existing) {
        return prev.map(t => t.id === taskId ? { ...t, ...updates } : t);
      } else {
        return [...prev, { id: taskId, ...updates }];
      }
    });
  };

  const removeTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleCancelTask = (taskId) => {
    conversionQueue.cancelTask(taskId);
  };

  const handleCancelAll = () => {
    conversionQueue.cancelAll();
  };

  const getProgressBarColor = (task) => {
    if (task.status === 'error') return '#ef4444';
    if (task.status === 'cancelled') return '#f59e0b';
    if (task.status === 'completed') return '#10b981';
    if (task.stage === 'decoding') return '#3b82f6';
    if (task.stage === 'encoding') return '#8b5cf6';
    return '#6b7280';
  };

  const getStageIcon = (stage) => {
    switch (stage) {
      case 'loading': return '📂';
      case 'decoding': return '🔍';
      case 'encoding': return '🎨';
      case 'finalizing': return '✨';
      case 'complete': return '✅';
      default: return '⏳';
    }
  };

  if (tasks.length === 0 && queueStatus.queued === 0 && queueStatus.active === 0) {
    return null;
  }

  return (
    <div className={`progress-ui ${className} ${isMinimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="progress-header">
        <div className="progress-title">
          <span className="progress-icon">🔄</span>
          <span>Conversions in Progress</span>
          <span className="task-count">
            ({queueStatus.active} active, {queueStatus.queued} queued)
          </span>
        </div>
        <div className="progress-controls">
          {tasks.length > 1 && (
            <button
              className="cancel-all-btn"
              onClick={handleCancelAll}
              title="Cancel all conversions"
            >
              Cancel All
            </button>
          )}
          <button
            className="minimize-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      {!isMinimized && queueStatus.progress > 0 && (
        <div className="overall-progress">
          <div className="progress-label">Overall Progress</div>
          <div className="progress-bar-container">
            <div
              className="progress-bar overall"
              style={{
                width: `${queueStatus.progress}%`,
                backgroundColor: '#3b82f6'
              }}
            />
          </div>
          <div className="progress-percentage">{Math.round(queueStatus.progress)}%</div>
        </div>
      )}

      {/* Task List */}
      {!isMinimized && (
        <div className="task-list">
          {tasks.map(task => (
            <div key={task.id} className={`task-item ${task.status}`}>
              <div className="task-header">
                <span className="task-icon">{getStageIcon(task.stage)}</span>
                <span className="task-name">
                  {task.currentFile || task.fileName || 'Processing...'}
                </span>
                {task.status !== 'completed' && task.status !== 'cancelled' && (
                  <button
                    className="cancel-task-btn"
                    onClick={() => handleCancelTask(task.id)}
                    title="Cancel this conversion"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="task-progress">
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${task.progress || 0}%`,
                      backgroundColor: getProgressBarColor(task)
                    }}
                  />
                </div>
                <span className="progress-text">{Math.round(task.progress || 0)}%</span>
              </div>

              <div className="task-details">
                <span className="task-message">{task.message}</span>
                {task.details && (
                  <div className="task-metadata">
                    {task.details.filesProcessed !== undefined && (
                      <span>
                        Files: {task.details.filesProcessed}/{task.details.totalFiles}
                      </span>
                    )}
                    {task.details.estimatedTimeRemaining && (
                      <span>
                        ETA: {formatTime(task.details.estimatedTimeRemaining)}
                      </span>
                    )}
                    {task.metadata && (
                      <>
                        {task.metadata.originalSize && (
                          <span>
                            Size: {formatBytes(task.metadata.originalSize)} → 
                            {formatBytes(task.metadata.convertedSize)}
                          </span>
                        )}
                        {task.metadata.compressionRatio && (
                          <span>
                            Saved: {task.metadata.compressionRatio}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {task.status === 'error' && (
                <div className="task-error">
                  ⚠️ {task.error}
                </div>
              )}

              {task.summary && (
                <div className="batch-summary">
                  <span>✅ {task.summary.successCount} successful</span>
                  {task.summary.errorCount > 0 && (
                    <span>❌ {task.summary.errorCount} failed</span>
                  )}
                  <span>⏱️ {formatTime(task.summary.totalTime)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Worker Status */}
      {!isMinimized && (
        <div className="worker-status">
          <span className="worker-info">
            Workers: {queueStatus.workers.single} single, {queueStatus.workers.batch} batch available
          </span>
        </div>
      )}
    </div>
  );
};

// Format helper functions (create these in a separate utils file)
const createFormatHelpers = () => {
  const script = document.createElement('script');
  script.textContent = `
    // src/utils/format-helpers.js
    export function formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    export function formatTime(ms) {
      if (ms < 1000) return 'less than a second';
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return hours + 'h ' + (minutes % 60) + 'm';
      } else if (minutes > 0) {
        return minutes + 'm ' + (seconds % 60) + 's';
      } else {
        return seconds + 's';
      }
    }
  `;
  document.head.appendChild(script);
};

export default ProgressUI;