import logger from '../config/logger';
import { rabbitMQService } from '../config/rabbitmq/rabbitmq.service';
import { EXCHANGE_NAMES, ROUTING_KEYS } from '../config/rabbitmq/constants';

class RabbitMQQueueManager {
  constructor() {
    logger.info('RabbitMQ Queue Manager initialized');
  }

  // Simple message publishing methods - no job tracking
  async addUploadArchiveJob(data: any): Promise<{ success: boolean }> {
    const messageData = { ...data, timestamp: Date.now() };
    
    const success = await rabbitMQService.produceMessage(
      EXCHANGE_NAMES.AI_VIDEO,
      ROUTING_KEYS.AI_VIDEO.UPLOAD_ARCHIVE,
      messageData
    );

    if (!success) {
      throw new Error('Failed to publish upload archive message to RabbitMQ');
    }

    return { success: true };
  }

  async addExtractComicJob(data: any): Promise<{ success: boolean }> {
    const messageData = { ...data, timestamp: Date.now() };
    
    const success = await rabbitMQService.produceMessage(
      EXCHANGE_NAMES.AI_VIDEO,
      ROUTING_KEYS.AI_VIDEO.EXTRACT_COMIC,
      messageData
    );

    if (!success) {
      throw new Error('Failed to publish extract comic message to RabbitMQ');
    }

    return { success: true };
  }

  async addProcessPanelsJob(data: any): Promise<{ success: boolean }> {
    const messageData = { ...data, timestamp: Date.now() };
    
    const success = await rabbitMQService.produceMessage(
      EXCHANGE_NAMES.AI_VIDEO,
      ROUTING_KEYS.AI_VIDEO.PROCESS_PANELS,
      messageData
    );

    if (!success) {
      throw new Error('Failed to publish process panels message to RabbitMQ');
    }

    return { success: true };
  }

  async addGenerateScriptJob(data: any): Promise<{ success: boolean }> {
    const messageData = { ...data, timestamp: Date.now() };
    
    const success = await rabbitMQService.produceMessage(
      EXCHANGE_NAMES.AI_VIDEO,
      ROUTING_KEYS.AI_VIDEO.GENERATE_SCRIPT,
      messageData
    );

    if (!success) {
      throw new Error('Failed to publish generate script message to RabbitMQ');
    }

    return { success: true };
  }

  async addGenerateVoiceJob(data: any): Promise<{ success: boolean }> {
    const messageData = { ...data, timestamp: Date.now() };
    
    const success = await rabbitMQService.produceMessage(
      EXCHANGE_NAMES.AI_VIDEO,
      ROUTING_KEYS.AI_VIDEO.GENERATE_VOICE,
      messageData
    );

    if (!success) {
      throw new Error('Failed to publish generate voice message to RabbitMQ');
    }

    return { success: true };
  }

  async addGenerateSubtitlesJob(data: any): Promise<{ success: boolean }> {
    const messageData = { ...data, timestamp: Date.now() };
    
    const success = await rabbitMQService.produceMessage(
      EXCHANGE_NAMES.AI_VIDEO,
      ROUTING_KEYS.AI_VIDEO.GENERATE_SUBTITLES,
      messageData
    );

    if (!success) {
      throw new Error('Failed to publish generate subtitles message to RabbitMQ');
    }

    return { success: true };
  }

  async addGenerateVideoJob(data: any): Promise<{ success: boolean }> {
    const messageData = { ...data, timestamp: Date.now() };
    
    const success = await rabbitMQService.produceMessage(
      EXCHANGE_NAMES.AI_VIDEO,
      ROUTING_KEYS.AI_VIDEO.GENERATE_VIDEO,
      messageData
    );

    if (!success) {
      throw new Error('Failed to publish generate video message to RabbitMQ');
    }

    return { success: true };
  }

  async addRenderVideoJob(data: any): Promise<{ success: boolean }> {
    const messageData = { ...data, timestamp: Date.now() };
    
    const success = await rabbitMQService.produceMessage(
      EXCHANGE_NAMES.AI_VIDEO,
      ROUTING_KEYS.AI_VIDEO.RENDER_VIDEO,
      messageData
    );

    if (!success) {
      throw new Error('Failed to publish render video message to RabbitMQ');
    }

    return { success: true };
  }

  // Direct message publishing for custom messages
  async publishMessage(exchange: string, routingKey: string, data: any): Promise<{ success: boolean }> {
    const messageData = { ...data, timestamp: Date.now() };
    
    const success = await rabbitMQService.produceMessage(
      exchange,
      routingKey,
      messageData
    );

    if (!success) {
      throw new Error(`Failed to publish message to RabbitMQ: ${routingKey}`);
    }

    return { success: true };
  }

  async closeAll(): Promise<void> {
    await rabbitMQService.closeConnection();
    logger.info('RabbitMQ Queue Manager closed');
  }

  // Simple connection status check
  isConnected(): boolean {
    return true;
  }
}

// Export singleton instance
export const rabbitMQQueueManager = new RabbitMQQueueManager();

// Export class for creating new instances
export { RabbitMQQueueManager };

export default rabbitMQQueueManager;
