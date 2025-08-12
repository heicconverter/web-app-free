'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProgressTracker from '../../utils/progress-tracker.js';
import { ConversionQueue } from '../../utils/conversion-queue.js';
import { formatBytes, formatTime } from '../../utils/format-helpers';

export default function TestProgressPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [progressTracker] = useState(() => new ProgressTracker());
  const [queue] = useState(() => new ConversionQueue());
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState({
    queued: 0,
    active: 0,
    progress: { fileProgressPercent: 0 }
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateQueueStatus = useCallback(() => {
    const status = queue.getQueueStatus();
    const progress = progressTracker.getProgress();
    setQueueStatus({ ...status, progress });
  }, [queue, progressTracker]);

  useEffect(() => {
    const interval = setInterval(updateQueueStatus, 500);
    return () => clearInterval(interval);
  }, [updateQueueStatus]);

  // Test 1: Basic Progress Tracking
  const testBasicProgress = async () => {
    addLog('🚀 Starting basic progress test...');
    const testFiles = 3;
    const testFileSize = 2 * 1024 * 1024; // 2MB each
    
    // Start tracking multiple files
    progressTracker.startTracking(testFiles, testFiles * testFileSize);
    setCurrentTaskId('batch-test');
    
    // Simulate processing files
    for (let fileIndex = 0; fileIndex < testFiles; fileIndex++) {
      addLog(`📂 Processing file ${fileIndex + 1}/${testFiles}...`);
      
      const stages = [
        { progress: 20, message: '🔍 Analyzing HEIC...' },
        { progress: 40, message: '🎨 Decoding image...' },
        { progress: 70, message: '🖼️ Encoding to JPEG...' },
        { progress: 100, message: '✅ File complete!' }
      ];
      
      for (const stage of stages) {
        await new Promise(resolve => setTimeout(resolve, 400));
        progressTracker.updateFileProgress(testFileSize, stage.progress);
        addLog(`File ${fileIndex + 1}: ${stage.progress}% - ${stage.message}`);
        
        const overall = progressTracker.getProgress();
        addLog(`Overall: ${Math.round(overall.fileProgressPercent)}% files, ${Math.round(overall.byteProgressPercent)}% data`);
      }
      
      progressTracker.completeFile();
      addLog(`✅ File ${fileIndex + 1} completed successfully!`);
    }
    
    progressTracker.finish();
    addLog('🎉 All files processed!');
    setCurrentTaskId(null);
  };

  // Test 2: Queue System
  const testQueueSystem = async () => {
    addLog('📋 Testing queue system...');
    
    // Set up event listeners
    const progressHandler = (data: any) => {
      addLog(`📊 Progress [${data.taskId.slice(-6)}]: ${Math.round(data.progress)}% - ${data.message}`);
    };
    
    const completeHandler = (data: any) => {
      addLog(`✅ Task completed [${data.taskId.slice(-6)}]: ${data.fileName || 'Unknown file'}`);
    };
    
    const errorHandler = (data: any) => {
      addLog(`❌ Task failed [${data.taskId.slice(-6)}]: ${data.error}`);
    };
    
    const cancelledHandler = (data: any) => {
      addLog(`🚫 Task cancelled [${data.taskId.slice(-6)}]: ${data.message}`);
    };
    
    // Register event listeners
    queue.on('progress', progressHandler);
    queue.on('complete', completeHandler);
    queue.on('error', errorHandler);
    queue.on('cancelled', cancelledHandler);
    
    // Create simulated files
    const taskIds = [];
    for (let i = 0; i < 3; i++) {
      const file = new File(
        [new ArrayBuffer(1024 * 512)], // 512KB each
        `test-${i + 1}.heic`,
        { type: 'image/heic' }
      );
      
      const taskId = await queue.addFile(file, {
        targetType: 'jpeg',
        quality: 90
      });
      
      taskIds.push(taskId);
      addLog(`➕ Added task ${i + 1} to queue (ID: ${taskId.slice(-6)}...)`);
    }
    
    // Clean up listeners after 30 seconds or when all tasks complete
    setTimeout(() => {
      queue.off('progress', progressHandler);
      queue.off('complete', completeHandler);
      queue.off('error', errorHandler);
      queue.off('cancelled', cancelledHandler);
      addLog('🧹 Cleaned up queue listeners');
    }, 30000);
    
    return taskIds;
  };

  // Test 3: Cancellation
  const testCancellation = async () => {
    addLog('🛑 Testing cancellation...');
    
    // Create a test file for cancellation
    const testFile = new File(
      [new ArrayBuffer(10 * 1024 * 1024)], // 10MB file
      'large-test-file.heic',
      { type: 'image/heic' }
    );
    
    // Set up cancellation listener
    const cancelHandler = (data: any) => {
      addLog(`🚫 Task was cancelled: ${data.message}`);
      setCurrentTaskId(null);
    };
    
    queue.on('cancelled', cancelHandler);
    
    // Add file to queue
    const taskId = await queue.addFile(testFile, {
      targetType: 'jpeg',
      quality: 90
    });
    
    setCurrentTaskId(taskId);
    addLog(`➕ Added cancellation test file (ID: ${taskId.slice(-6)}...)`);
    
    // Wait 2 seconds then cancel
    setTimeout(() => {
      const success = queue.cancelTask(taskId);
      if (success) {
        addLog(`🛑 Initiated cancellation for task ${taskId.slice(-6)}...`);
      } else {
        addLog(`❌ Failed to cancel task ${taskId.slice(-6)}... (may have already completed)`);
        setCurrentTaskId(null);
      }
    }, 2000);
    
    // Clean up listener after 10 seconds
    setTimeout(() => {
      queue.off('cancelled', cancelHandler);
      addLog('🧹 Cleaned up cancellation listener');
    }, 10000);
  };

  // Test 4: Error Handling
  const testErrorHandling = async () => {
    addLog('💥 Testing error handling...');
    
    // Create an invalid file to trigger error
    const invalidFile = new File(
      [new ArrayBuffer(100)], // Too small to be a valid HEIC
      'invalid-file.heic',
      { type: 'image/heic' }
    );
    
    const errorHandler = (data: any) => {
      addLog(`❌ Error caught: ${data.error} (Task: ${data.taskId.slice(-6)}...)`);
    };
    
    queue.on('error', errorHandler);
    
    const taskId = await queue.addFile(invalidFile, {
      targetType: 'jpeg',
      quality: 90
    });
    
    addLog(`➕ Added invalid file to test error handling (ID: ${taskId.slice(-6)}...)`);
    
    // Clean up listener after 15 seconds
    setTimeout(() => {
      queue.off('error', errorHandler);
      addLog('🧹 Cleaned up error listener');
    }, 15000);
  };

  // Test 5: Batch Conversion
  const testBatchConversion = async () => {
    addLog('📦 Testing batch conversion...');
    
    // Create multiple files for batch processing
    const files = [];
    for (let i = 0; i < 5; i++) {
      files.push(new File(
        [new ArrayBuffer(1024 * 200)], // 200KB each
        `batch-file-${i + 1}.heic`,
        { type: 'image/heic' }
      ));
    }
    
    const batchHandler = (data: any) => {
      if (data.type === 'batch') {
        addLog(`📦 Batch completed: ${data.results?.length || 0} files processed, ${data.errors?.length || 0} errors`);
      }
    };
    
    queue.on('complete', batchHandler);
    
    const batchId = await queue.addBatch(files, {
      targetType: 'jpeg',
      quality: 85
    });
    
    addLog(`➕ Added batch of ${files.length} files (ID: ${batchId.slice(-6)}...)`);
    
    // Clean up listener after 30 seconds
    setTimeout(() => {
      queue.off('complete', batchHandler);
      addLog('🧹 Cleaned up batch listener');
    }, 30000);
  };

  // Cancel all active tasks
  const cancelAllTasks = () => {
    addLog('🛑 Cancelling all active tasks...');
    queue.cancelAll();
    setCurrentTaskId(null);
    addLog('🧹 All tasks cancelled');
  };

  // Reset all trackers
  const resetSystem = () => {
    addLog('🔄 Resetting system...');
    queue.cancelAll();
    progressTracker.reset();
    setCurrentTaskId(null);
    setQueueStatus({
      queued: 0,
      active: 0,
      progress: { fileProgressPercent: 0 }
    });
    addLog('✅ System reset complete');
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('🧹 Logs cleared');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
          🚀 Progress Tracking Test Suite
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test Controls */}
          <div className="bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            
            <div className="space-y-3">
              <button
                onClick={testBasicProgress}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                ▶️ Test Basic Progress
              </button>
              
              <button
                onClick={testQueueSystem}
                className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                📋 Test Queue System
              </button>
              
              <button
                onClick={testCancellation}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
              >
                🛑 Test Cancellation
              </button>
              
              <button
                onClick={testErrorHandling}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                💥 Test Error Handling
              </button>
              
              <button
                onClick={testBatchConversion}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
              >
                📦 Test Batch Conversion
              </button>
              
              <div className="border-t pt-3 mt-3">
                <button
                  onClick={cancelAllTasks}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded mb-2"
                >
                  🛑 Cancel All Tasks
                </button>
                
                <button
                  onClick={resetSystem}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded mb-2"
                >
                  🔄 Reset System
                </button>
                
                <button
                  onClick={clearLogs}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  🧹 Clear Logs
                </button>
              </div>
            </div>
            
            {currentTaskId && (
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <p className="text-sm">Active Task: {currentTaskId}</p>
              </div>
            )}
          </div>
          
          {/* Logs Display */}
          <div className="bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Test Logs</h2>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded h-96 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500">Ready to test...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Queue Status */}
        <div className="mt-6 bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">{queueStatus.queued}</div>
              <div className="text-sm text-gray-600">Queued</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{queueStatus.active}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(queueStatus.progress.fileProgressPercent || 0)}%
              </div>
              <div className="text-sm text-gray-600">Files Progress</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(queueStatus.progress.byteProgressPercent || 0)}%
              </div>
              <div className="text-sm text-gray-600">Data Progress</div>
            </div>
          </div>
          
          {/* Additional Stats */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium">Processed Files</div>
              <div className="text-gray-600">
                {queueStatus.progress.processedFiles || 0} / {queueStatus.progress.totalFiles || 0}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium">Data Processed</div>
              <div className="text-gray-600">
                {formatBytes(queueStatus.progress.processedBytes || 0)} / {formatBytes(queueStatus.progress.totalBytes || 0)}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium">Throughput</div>
              <div className="text-gray-600">
                {formatBytes(queueStatus.progress.throughputBytesPerSecond || 0)}/s
              </div>
            </div>
          </div>
          
          {queueStatus.progress.estimatedTimeRemaining && (
            <div className="mt-3 p-3 bg-yellow-50 rounded">
              <div className="font-medium text-yellow-800">Estimated Time Remaining</div>
              <div className="text-yellow-600">
                {formatTime(queueStatus.progress.estimatedTimeRemaining)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}