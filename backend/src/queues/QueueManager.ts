import { Queue, QueueOptions } from 'bullmq';
import logger from '../config/logger';
import { redisConnectionConfig } from '../config/redisConnection';

const defaultQueueOptions: QueueOptions = {
  connection: redisConnectionConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 1000,
    },
  },
};

class QueueManager {
  public uploadArchiveQueue: Queue;
  public extractComicQueue: Queue;
  public processPanelsQueue: Queue;
  public generateScriptQueue: Queue;
  public generateVoiceQueue: Queue;
  public generateSubtitlesQueue: Queue;
  public generateVideoQueue: Queue;
  public renderVideoQueue: Queue;

  constructor() {
    this.uploadArchiveQueue = new Queue('upload-archive', defaultQueueOptions);
    this.extractComicQueue = new Queue('extract-comic', defaultQueueOptions);
    this.processPanelsQueue = new Queue('process-panels', defaultQueueOptions);
    this.generateScriptQueue = new Queue('generate-script', defaultQueueOptions);
    this.generateVoiceQueue = new Queue('generate-voice', defaultQueueOptions);
    this.generateSubtitlesQueue = new Queue('generate-subtitles', defaultQueueOptions);
    this.generateVideoQueue = new Queue('generate-video', defaultQueueOptions);
    this.renderVideoQueue = new Queue('render-video', defaultQueueOptions);

    this.setupEventListeners();
    logger.info('Queue Manager initialized');
  }

  private setupEventListeners(): void {
    const queues = [
      this.uploadArchiveQueue,
      this.extractComicQueue,
      this.processPanelsQueue,
      this.generateScriptQueue,
      this.generateVoiceQueue,
      this.generateSubtitlesQueue,
      this.generateVideoQueue,
      this.renderVideoQueue,
    ];

    queues.forEach((queue) => {
      (queue as any).on('error', (error: any) => {
        logger.error(`Queue ${queue.name} error:`, error);
      });

      (queue as any).on('waiting', (job: any) => {
        logger.info(`Job ${job.id} is waiting in queue ${queue.name}`);
      });

      (queue as any).on('active', (job: any) => {
        logger.info(`Job ${job.id} is now active in queue ${queue.name}`);
      });

      (queue as any).on('completed', (job: any) => {
        logger.info(`Job ${job.id} completed in queue ${queue.name}`);
      });

      (queue as any).on('failed', (job: any, err: any) => {
        logger.error(`Job ${job?.id} failed in queue ${queue.name}:`, err);
      });
    });
  }

  async addUploadArchiveJob(data: any, options?: any) {
    return await this.uploadArchiveQueue.add('upload-archive', data, options);
  }

  async addExtractComicJob(data: any, options?: any) {
    return await this.extractComicQueue.add('extract-comic', data, options);
  }

  async addProcessPanelsJob(data: any, options?: any) {
    return await this.processPanelsQueue.add('process-panels', data, options);
  }

  async addGenerateScriptJob(data: any, options?: any) {
    return await this.generateScriptQueue.add('generate-script', data, options);
  }

  async addGenerateVoiceJob(data: any, options?: any) {
    return await this.generateVoiceQueue.add('generate-voice', data, options);
  }

  async addGenerateSubtitlesJob(data: any, options?: any) {
    return await this.generateSubtitlesQueue.add('generate-subtitles', data, options);
  }

  async addGenerateVideoJob(data: any, options?: any) {
    return await this.generateVideoQueue.add('generate-video', data, options);
  }

  async addRenderVideoJob(data: any, options?: any) {
    return await this.renderVideoQueue.add('render-video', data, options);
  }

  async getJobStatus(queueName: string, jobId: string) {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      returnvalue: job.returnvalue,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    };
  }

  private getQueueByName(name: string): Queue | null {
    const queueMap: Record<string, Queue> = {
      'upload-archive': this.uploadArchiveQueue,
      'extract-comic': this.extractComicQueue,
      'process-panels': this.processPanelsQueue,
      'generate-script': this.generateScriptQueue,
      'generate-voice': this.generateVoiceQueue,
      'generate-subtitles': this.generateSubtitlesQueue,
      'generate-video': this.generateVideoQueue,
      'render-video': this.renderVideoQueue,
    };

    return queueMap[name] || null;
  }

  async closeAll(): Promise<void> {
    await Promise.all([
      this.uploadArchiveQueue.close(),
      this.extractComicQueue.close(),
      this.processPanelsQueue.close(),
      this.generateScriptQueue.close(),
      this.generateVoiceQueue.close(),
      this.generateSubtitlesQueue.close(),
      this.generateVideoQueue.close(),
      this.renderVideoQueue.close(),
    ]);
    logger.info('All queues closed');
  }
}

// Export singleton instance
export const queueManager = new QueueManager();

// Export class for creating new instances
export { QueueManager };

export default new QueueManager();
