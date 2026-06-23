import Bull, { Job } from 'bullmq';
import logger from '../config/logger';
import OllamaService from '../services/OllamaService';
import { DEFAULT_MODELS } from '../config/aiModels';
import { redisConnectionConfig } from '../config/redisConnection';

// Worker queues for different AI tasks
export const AI_QUEUES = {
  TEXT_GENERATION: 'ai-text-generation',
  IMAGE_ANALYSIS: 'ai-image-analysis',
  SCRIPT_GENERATION: 'ai-script-generation',
  VOICE_SYNTHESIS: 'ai-voice-synthesis',
  PANEL_ANALYSIS: 'ai-panel-analysis',
  BATCH_PROCESSING: 'ai-batch-processing',
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
}

interface AIJobResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  processingTime: number;
  modelUsed: string;
}

// AI Worker class
class AIWorker {
  private queues: Map<string, Bull.Queue> = new Map();
  private workers: Map<string, Bull.Worker> = new Map();
  private ollamaService: typeof OllamaService;

  constructor() {
    this.ollamaService = OllamaService;
    this.initializeQueues();
    this.initializeWorkers();
  }

  private initializeQueues(): void {
    // Initialize all AI task queues
    Object.values(AI_QUEUES).forEach(queueName => {
      const queue = new Bull.Queue(queueName, {
        connection: redisConnectionConfig,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });
      this.queues.set(queueName, queue);
    });
  }

  private initializeWorkers(): void {
    // Text Generation Worker
    const textWorker = new Bull.Worker(
      AI_QUEUES.TEXT_GENERATION,
      async (job) => {
        return this.processTextGeneration(job);
      },
      { connection: redisConnectionConfig }
    );

    // Image Analysis Worker
    const imageWorker = new Bull.Worker(
      AI_QUEUES.IMAGE_ANALYSIS,
      async (job) => {
        return this.processImageAnalysis(job);
      },
      { connection: redisConnectionConfig }
    );

    // Script Generation Worker
    const scriptWorker = new Bull.Worker(
      AI_QUEUES.SCRIPT_GENERATION,
      async (job) => {
        return this.processScriptGeneration(job);
      },
      { connection: redisConnectionConfig }
    );

    // Panel Analysis Worker
    const panelWorker = new Bull.Worker(
      AI_QUEUES.PANEL_ANALYSIS,
      async (job) => {
        return this.processPanelAnalysis(job);
      },
      { connection: redisConnectionConfig }
    );

    // Batch Processing Worker
    const batchWorker = new Bull.Worker(
      AI_QUEUES.BATCH_PROCESSING,
      async (job) => {
        return this.processBatchTasks(job);
      },
      { connection: redisConnectionConfig }
    );

    this.workers.set('text', textWorker);
    this.workers.set('image', imageWorker);
    this.workers.set('script', scriptWorker);
    this.workers.set('panel', panelWorker);
    this.workers.set('batch', batchWorker);

    // Set up worker event listeners
    this.setupWorkerListeners();
  }

  private setupWorkerListeners(): void {
    this.workers.forEach((worker, type) => {
      worker.on('completed', (job: Job) => {
        logger.info(`AI ${type} worker completed job ${job.id}`);
      });

      worker.on('failed', (job: Job | undefined, err: Error) => {
        if (job) {
          logger.error(`AI ${type} worker failed job ${job.id}:`, err);
        } else {
          logger.error(`AI ${type} worker failed:`, err);
        }
      });

      worker.on('error', (err) => {
        logger.error(`AI ${type} worker error:`, err);
      });
    });
  }

  // Add job to appropriate queue
  async addJob(jobData: AIJobData): Promise<Bull.Job> {
    const queueName = this.getQueueForType(jobData.type);
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue not found for type: ${jobData.type}`);
    }

    const job = await queue.add(
      `${jobData.type}-${jobData.taskId}`,
      jobData,
      {
        priority: jobData.options?.priority || 1,
        delay: 0,
        attempts: jobData.options?.maxRetries || 3,
      }
    );

    logger.info(`Added AI job ${job.id} to ${queueName} queue`);
    return job;
  }

  private getQueueForType(type: string): string {
    const queueMap = {
      'text': AI_QUEUES.TEXT_GENERATION,
      'vision': AI_QUEUES.IMAGE_ANALYSIS,
      'script': AI_QUEUES.SCRIPT_GENERATION,
      'panel': AI_QUEUES.PANEL_ANALYSIS,
      'batch': AI_QUEUES.BATCH_PROCESSING,
    };
    return queueMap[type as keyof typeof queueMap] || AI_QUEUES.TEXT_GENERATION;
  }

  // Process text generation jobs
  private async processTextGeneration(job: Bull.Job<AIJobData>): Promise<AIJobResult> {
    const startTime = Date.now();
    const { data, options } = job.data;

    try {
      const model = options?.model || DEFAULT_MODELS.textGeneration;
      const result = await this.ollamaService.generateText(data.prompt, {
        task: 'text',
        model,
        ...options,
      });

      return {
        taskId: job.data.taskId,
        success: true,
        result,
        processingTime: Date.now() - startTime,
        modelUsed: model,
      };
    } catch (error) {
      logger.error(`Text generation failed for job ${job.id}:`, error);
      return {
        taskId: job.data.taskId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
        modelUsed: options?.model || DEFAULT_MODELS.textGeneration,
      };
    }
  }

  // Process image analysis jobs
  private async processImageAnalysis(job: Bull.Job<AIJobData>): Promise<AIJobResult> {
    const startTime = Date.now();
    const { data, options } = job.data;

    try {
      const model = options?.model || DEFAULT_MODELS.visionAnalysis;
      const result = await this.ollamaService.analyzeImage(
        data.imageBase64,
        data.prompt,
        { task: 'vision', model, ...options }
      );

      return {
        taskId: job.data.taskId,
        success: true,
        result,
        processingTime: Date.now() - startTime,
        modelUsed: model,
      };
    } catch (error) {
      logger.error(`Image analysis failed for job ${job.id}:`, error);
      return {
        taskId: job.data.taskId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
        modelUsed: options?.model || DEFAULT_MODELS.visionAnalysis,
      };
    }
  }

  // Process script generation jobs
  private async processScriptGeneration(job: Bull.Job<AIJobData>): Promise<AIJobResult> {
    const startTime = Date.now();
    const { data, options } = job.data;

    try {
      const model = options?.model || DEFAULT_MODELS.scriptGeneration;
      const result = await this.ollamaService.generateStoryScript(
        data.panelAnalyses,
        data.metadata
      );

      return {
        taskId: job.data.taskId,
        success: true,
        result,
        processingTime: Date.now() - startTime,
        modelUsed: model,
      };
    } catch (error) {
      logger.error(`Script generation failed for job ${job.id}:`, error);
      return {
        taskId: job.data.taskId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
        modelUsed: options?.model || DEFAULT_MODELS.scriptGeneration,
      };
    }
  }

  // Process panel analysis jobs
  private async processPanelAnalysis(job: Bull.Job<AIJobData>): Promise<AIJobResult> {
    const startTime = Date.now();
    const { data, options } = job.data;

    try {
      const result = await this.ollamaService.analyzePanels(
        data.panelImages,
        options
      );

      return {
        taskId: job.data.taskId,
        success: true,
        result,
        processingTime: Date.now() - startTime,
        modelUsed: options?.quickMode ? 'bakllava-1b' : 'llava-7b',
      };
    } catch (error) {
      logger.error(`Panel analysis failed for job ${job.id}:`, error);
      return {
        taskId: job.data.taskId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
        modelUsed: options?.quickMode ? 'bakllava-1b' : 'llava-7b',
      };
    }
  }

  // Process batch tasks
  private async processBatchTasks(job: Bull.Job<AIJobData>): Promise<AIJobResult> {
    const startTime = Date.now();
    const { data } = job.data;

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

      return {
        taskId: job.data.taskId,
        success: true,
        result: results,
        processingTime: Date.now() - startTime,
        modelUsed: 'multiple',
      };
    } catch (error) {
      logger.error(`Batch processing failed for job ${job.id}:`, error);
      return {
        taskId: job.data.taskId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
        modelUsed: 'multiple',
      };
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Get queue status
  async getQueueStatus(): Promise<any> {
    const status: Record<string, any> = {};
    
    for (const [name, queue] of this.queues) {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
      ]);

      status[name as string] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      };
    }

    return status;
  }

  // Clean up resources
  async close(): Promise<void> {
    await Promise.all([
      ...Array.from(this.queues.values()).map(queue => queue.close()),
      ...Array.from(this.workers.values()).map(worker => worker.close()),
    ]);
  }
}

// Export singleton instance
export default new AIWorker();
