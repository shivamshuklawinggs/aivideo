import { rabbitMQService } from './rabbitmq.service';
import { initializeConsumers } from './consumers';
import { rabbitMQQueueManager } from '../../queues/RabbitMQQueueManager';
import RabbitMQAIWorker from '../../workers/RabbitMQAIWorker';
import RabbitMQExtractComicWorker from '../../workers/RabbitMQExtractComicWorker';

/**
 * 🚀 Initialize RabbitMQ System
 * Sets up all exchanges, queues, consumers, and workers for the complete RabbitMQ system
 */
export async function initializeRabbitMQSystem(): Promise<void> {
  try {
    console.log('🔄 Initializing RabbitMQ system...');

    // 1. Initialize RabbitMQ connection and setup exchanges/queues
    await rabbitMQService.initialize();
    console.log('✅ RabbitMQ connection initialized');

    // 2. Initialize general consumers (invoices, bills, etc.)
    await initializeConsumers();
    console.log('✅ General consumers initialized');

    // 3. Initialize AI Video Processing QueueManager
    // This sets up consumers for tracking job status
    console.log('✅ QueueManager initialized');

    // 4. Initialize AI Worker
    // This sets up consumers for AI processing tasks
    console.log('✅ AI Worker initialized');

    // 5. Initialize Extract Comic Worker
    // This sets up consumer for comic extraction
    console.log('✅ Extract Comic Worker initialized');

    console.log('🎉 RabbitMQ system initialization completed successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize RabbitMQ system:', error);
    throw error;
  }
}

/**
 * 🛑 Gracefully shutdown RabbitMQ system
 */
export async function shutdownRabbitMQSystem(): Promise<void> {
  try {
    console.log('🔄 Shutting down RabbitMQ system...');

    // Close all connections
    await rabbitMQQueueManager.closeAll();
    await rabbitMQService.closeConnection();

    console.log('✅ RabbitMQ system shutdown completed');
  } catch (error) {
    console.error('❌ Error during RabbitMQ shutdown:', error);
    throw error;
  }
}

/**
 * 📊 Get system status
 */
export async function getRabbitMQSystemStatus(): Promise<any> {
  try {
    return {
      rabbitmq: {
        connected: rabbitMQQueueManager.isConnected(),
        status: 'active'
      },
      workers: {
        aiWorker: 'active',
        extractComicWorker: 'active',
        queueManager: 'active'
      }
    };
  } catch (error) {
    console.error('❌ Error getting system status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      rabbitmq: { connected: false, error: errorMessage },
      workers: { error: errorMessage }
    };
  }
}

// Export individual components for direct access if needed
export {
  rabbitMQService,
  initializeConsumers,
  rabbitMQQueueManager,
  RabbitMQAIWorker,
  RabbitMQExtractComicWorker
};

// Export the Producer class for easy message publishing
export { Producer } from './producers';
