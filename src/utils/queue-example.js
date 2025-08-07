/**
 * Example usage of the ConversionQueue system
 * Demonstrates priority handling, event listeners, and queue management
 */

import { getConversionQueue, Priority, QueueItemState } from './conversion-queue.js';

// Initialize the conversion queue
const queue = getConversionQueue({ maxConcurrent: 2 });

// Set up event listeners
queue.on('itemAdded', (item) => {
  console.log(`Item added to queue: ${item.id} with priority ${item.priority}`);
});

queue.on('processingStarted', (item) => {
  console.log(`Started processing: ${item.id}`);
});

queue.on('progress', (item) => {
  console.log(`Progress for ${item.id}: ${item.progress}%`);
});

queue.on('completed', (item) => {
  console.log(`Completed: ${item.id}`);
  console.log(`Result size: ${item.result.size} bytes`);
});

queue.on('failed', (item) => {
  console.error(`Failed: ${item.id} - ${item.error}`);
});

queue.on('retry', (item) => {
  console.log(`Retrying: ${item.id} (attempt ${item.retryCount})`);
});

queue.on('cancelled', (item) => {
  console.log(`Cancelled: ${item.id}`);
});

queue.on('memoryWait', (data) => {
  console.log(`Waiting for memory: ${data.required} bytes needed`);
});

// Example: Add items with different priorities
async function demonstrateQueue() {
  console.log('Starting queue demonstration...\n');

  // Mock file objects for testing
  const createMockFile = (name, size) => new Blob(['test'], { 
    type: 'image/heic',
    size: size 
  });

  // Add high priority item
  const highPriorityId = queue.add({
    file: createMockFile('urgent-photo.heic', 1024 * 1024),
    targetFormat: 'jpeg',
    options: { quality: 95 },
    priority: Priority.HIGH
  });

  // Add normal priority items
  const normalId1 = queue.add({
    file: createMockFile('photo1.heic', 512 * 1024),
    targetFormat: 'jpeg',
    options: { quality: 90 },
    priority: Priority.NORMAL
  });

  const normalId2 = queue.add({
    file: createMockFile('photo2.heic', 768 * 1024),
    targetFormat: 'png',
    priority: Priority.NORMAL
  });

  // Add low priority item
  const lowPriorityId = queue.add({
    file: createMockFile('background.heic', 256 * 1024),
    targetFormat: 'jpeg',
    options: { quality: 80 },
    priority: Priority.LOW
  });

  // Check queue status
  console.log('\nInitial queue status:', queue.getStatus());

  // Demonstrate cancellation
  setTimeout(() => {
    console.log('\nCancelling low priority item...');
    queue.cancel(lowPriorityId);
  }, 1000);

  // Monitor queue until empty
  const checkInterval = setInterval(() => {
    const status = queue.getStatus();
    console.log('\nQueue status update:', {
      pending: status.pending,
      processing: status.processing,
      completed: status.completed,
      failed: status.failed
    });

    if (status.pending === 0 && status.processing === 0) {
      console.log('\nQueue processing complete!');
      console.log('Final statistics:', status.stats);
      clearInterval(checkInterval);
      
      // Clean up completed items
      queue.clearCompleted();
    }
  }, 2000);
}

// Export the demonstration function
export { demonstrateQueue };

// Run demonstration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateQueue().catch(console.error);
}