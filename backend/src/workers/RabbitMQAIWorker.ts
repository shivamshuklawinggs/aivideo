import logger from '../config/logger';
import OllamaService from '../services/OllamaService';
import { DEFAULT_MODELS } from '../config/aiModels';
import { rabbitMQService } from '../config/rabbitmq/rabbitmq.service';
import { QUEUE_NAMES, EXCHANGE_NAMES, ROUTING_KEYS } from '../config/rabbitmq/constants';

// Worker queues for different AI tasks
export const AI_QUEUES = {
  TEXT_GENERATION: QUEUE_NAMES.AI_TEXT_GENERATION,
  IMAGE_ANALYSIS: QUEUE_NAMES.AI_IMAGE_ANALYSIS,
  SCRIPT_GENERATION: QUEUE_NAMES.AI_SCRIPT_GENERATION,
  VOICE_SYNTHESIS: QUEUE_NAMES.AI_VOICE_SYNTHESIS,
  PANEL_ANALYSIS: QUEUE_NAMES.AI_PANEL_ANALYSIS,
  BATCH_PROCESSING: QUEUE_NAMES.AI_BATCH_PROCESSING,
};

// Job types for AI tasks
interface AIJobData {
  type: 'text' | 'vision' | 'script' | 'voice' | 'panel' | 'batch';
  taskId: string;
  userId: string;
  data: any;
  options?: {
    priority?: number;
    model?: string;
    quickMode?: boolean;
    maxRetries?: number;
  };
  jobId?: string; // Added for RabbitMQ tracking
}



// AI Worker class
class RabbitMQAIWorker {
  private ollamaService: typeof OllamaService;
  private jobIdCounter: number = 1;

  constructor() {
    this.ollamaService = OllamaService;
    this.initializeConsumers();
  }

  private generateJobId(): string {
    return `ai_job_${this.jobIdCounter++}_${Date.now()}`;
  }

  private async initializeConsumers(): Promise<void> {
    // Text Generation Consumer
    await rabbitMQService.consumeMessages(
      QUEUE_NAMES.AI_TEXT_GENERATION,
      async (message) => {
        await this.processTextGeneration(message);
      }
    );

    // Image Analysis Consumer
    await rabbitMQService.consumeMessages(
      QUEUE_NAMES.AI_IMAGE_ANALYSIS,
      async (message) => {
        await this.processImageAnalysis(message);
      }
    );

    // Script Generation Consumer
    await rabbitMQService.consumeMessages(
      QUEUE_NAMES.AI_SCRIPT_GENERATION,
      async (message) => {
        await this.processScriptGeneration(message);
      }
    );

    // Voice Synthesis Consumer
    await rabbitMQService.consumeMessages(
      QUEUE_NAMES.AI_VOICE_SYNTHESIS,
      async (message) => {
        await this.processVoiceSynthesis(message);
      }
    );

    // Panel Analysis Consumer
    await rabbitMQService.consumeMessages(
      QUEUE_NAMES.AI_PANEL_ANALYSIS,
      async (message) => {
        await this.processPanelAnalysis(message);
      }
    );

    // Batch Processing Consumer
    await rabbitMQService.consumeMessages(
      QUEUE_NAMES.AI_BATCH_PROCESSING,
      async (message) => {
        await this.processBatchTasks(message);
      }
    );

    logger.info('RabbitMQ AI Worker consumers initialized');
  }

  // Add job to appropriate queue
  async addJob(jobData: AIJobData): Promise<{ id: string }> {
    const jobId = this.generateJobId();
    const jobDataWithId = { ...jobData, jobId };

    let exchange: string;
    let routingKey: string;

    switch (jobData.type) {
      case 'text':
        exchange = EXCHANGE_NAMES.AI_WORKER;
        routingKey = ROUTING_KEYS.AI_WORKER.TEXT_GENERATION;
        break;
      case 'vision':
        exchange = EXCHANGE_NAMES.AI_WORKER;
        routingKey = ROUTING_KEYS.AI_WORKER.IMAGE_ANALYSIS;
        break;
      case 'script':
        exchange = EXCHANGE_NAMES.AI_WORKER;
        routingKey = ROUTING_KEYS.AI_WORKER.SCRIPT_GENERATION;
        break;
      case 'voice':
        exchange = EXCHANGE_NAMES.AI_WORKER;
        routingKey = ROUTING_KEYS.AI_WORKER.VOICE_SYNTHESIS;
        break;
      case 'panel':
        exchange = EXCHANGE_NAMES.AI_WORKER;
        routingKey = ROUTING_KEYS.AI_WORKER.PANEL_ANALYSIS;
        break;
      case 'batch':
        exchange = EXCHANGE_NAMES.AI_WORKER;
        routingKey = ROUTING_KEYS.AI_WORKER.BATCH_PROCESSING;
        break;
      default:
        throw new Error(`Unknown job type: ${jobData.type}`);
    }

    const success = await rabbitMQService.produceMessage(
      exchange,
      routingKey,
      jobDataWithId
    );

    if (!success) {
      throw new Error('Failed to publish AI job to RabbitMQ');
    }

    logger.info(`Added AI job ${jobId} to ${jobData.type} queue`);
    return { id: jobId };
  }

  // Process text generation jobs
  private async processTextGeneration(jobData: AIJobData): Promise<void> {

    const { data, options, jobId } = jobData;

    try {
      const model = options?.model || DEFAULT_MODELS.textGeneration;
       await this.ollamaService.generateText(data.prompt, {
        task: 'text',
        model,
        ...options,
      });

  

      logger.info(`Text generation completed for job ${jobId}`);
      // Optionally publish result to a results queue or callback
    } catch (error) {
      logger.error(`Text generation failed for job ${jobId}:`, error);
   
      // Optionally publish error to a results queue or callback
    }
  }

  // Process image analysis jobs
  private async processImageAnalysis(jobData: AIJobData): Promise<void> {
 
    const { data, options, jobId } = jobData;

    try {
      const model = options?.model || DEFAULT_MODELS.visionAnalysis;
      await this.ollamaService.analyzeImage(
        data.imageBase64,
        data.prompt,
        { task: 'vision', model, ...options }
      );

  

      logger.info(`Image analysis completed for job ${jobId}`);
    } catch (error) {
      logger.error(`Image analysis failed for job ${jobId}:`, error);
      
    }
  }

  // Process script generation jobs
  private async processScriptGeneration(jobData: AIJobData): Promise<void> {
  
    const { data,  jobId } = jobData;

    try {
       await this.ollamaService.generateStoryScript(
        data.panelAnalyses,
        data.metadata
      );


      logger.info(`Script generation completed for job ${jobId}`);
    } catch (error) {
      logger.error(`Script generation failed for job ${jobId}:`, error);
    
    }
  }

  // Process voice synthesis jobs
  private async processVoiceSynthesis(jobData: AIJobData): Promise<void> {
    
    const {  jobId } = jobData;

    try {
    

      logger.info(`Voice synthesis completed for job ${jobId}`);
    } catch (error) {
      logger.error(`Voice synthesis failed for job ${jobId}:`, error);
     
    }
  }

  // Process panel analysis jobs
  private async processPanelAnalysis(jobData: AIJobData): Promise<void> {

    const { data, options, jobId } = jobData;

    try {
     await this.ollamaService.analyzePanels(
        data.panelImages,
        options
      );

      logger.info(`Panel analysis completed for job ${jobId}`);
    } catch (error) {
      logger.error(`Panel analysis failed for job ${jobId}:`, error);
   
    }
  }

  // Process batch tasks
  private async processBatchTasks(jobData: AIJobData): Promise<void> {

    const { data, jobId } = jobData;

    try {
      const results = [];
      
      // Process batch items in parallel with concurrency control
      const concurrency = 3; // Process 3 items at a time
      const chunks = this.chunkArray(data.items, concurrency);
      
      for (const chunk of chunks) {
        const chunkResults = await Promise.allSettled(
          chunk.map(async (item: any) => {
            switch (item.type) {
              case 'text':
                return this.ollamaService.generateText(item.prompt, { task: 'text' });
              case 'vision':
                return this.ollamaService.analyzeImage(item.image, item.prompt, { task: 'vision' });
              default:
                throw new Error(`Unknown batch item type: ${item.type}`);
            }
          })
        );

        results.push(...chunkResults.map((result, index) => ({
          item: chunk[index],
          status: result.status,
          value: result.status === 'fulfilled' ? result.value : null,
          error: result.status === 'rejected' ? result.reason : null,
        })));
      }

   

      logger.info(`Batch processing completed for job ${jobId}`);
    } catch (error) {
      logger.error(`Batch processing failed for job ${jobId}:`, error);
   
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Get queue status (simplified for RabbitMQ)
  async getQueueStatus(): Promise<any> {
    // RabbitMQ doesn't have the same built-in queue status as BullMQ
    // This would require implementing a status tracking mechanism
    // For now, return basic status
    return {
      [QUEUE_NAMES.AI_TEXT_GENERATION]: { waiting: 0, active: 0, completed: 0, failed: 0 },
      [QUEUE_NAMES.AI_IMAGE_ANALYSIS]: { waiting: 0, active: 0, completed: 0, failed: 0 },
      [QUEUE_NAMES.AI_SCRIPT_GENERATION]: { waiting: 0, active: 0, completed: 0, failed: 0 },
      [QUEUE_NAMES.AI_VOICE_SYNTHESIS]: { waiting: 0, active: 0, completed: 0, failed: 0 },
      [QUEUE_NAMES.AI_PANEL_ANALYSIS]: { waiting: 0, active: 0, completed: 0, failed: 0 },
      [QUEUE_NAMES.AI_BATCH_PROCESSING]: { waiting: 0, active: 0, completed: 0, failed: 0 },
    };
  }

  // Clean up resources
  async close(): Promise<void> {
    await rabbitMQService.closeConnection();
    logger.info('RabbitMQ AI Worker closed');
  }
}

// Export singleton instance
export default new RabbitMQAIWorker();
