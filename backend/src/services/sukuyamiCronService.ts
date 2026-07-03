import cron from 'node-cron';
import mongoose from 'mongoose';
import SukuyamiSyncService from './sukuyamiSyncService';
import ScriptGenerationService from './scriptGenerationService';
import VideoGenerationService from './videoGenerationService';
import logger from '../config/logger';
import { rabbitMQService } from '../config/rabbitmq/rabbitmq.service';

export interface CronJobStatus {
  syncWebtoons: {
    isRunning: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
    successCount: number;
    failureCount: number;
  };
  checkNewChapters: {
    isRunning: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
    successCount: number;
    failureCount: number;
  };
  generateScripts: {
    isRunning: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
    successCount: number;
    failureCount: number;
  };
  generateVideos: {
    isRunning: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
    successCount: number;
    failureCount: number;
  };
}

export class SukuyamiCronService {
  private syncService: SukuyamiSyncService;
  private scriptService: ScriptGenerationService;
  private videoService: VideoGenerationService;
  
  private jobs: {
    syncWebtoons?: cron.ScheduledTask;
    checkNewChapters?: cron.ScheduledTask;
    generateScripts?: cron.ScheduledTask;
    generateVideos?: cron.ScheduledTask;
  } = {};

  private status: CronJobStatus = {
    syncWebtoons: {
      isRunning: false,
      lastRun: null,
      nextRun: null,
      successCount: 0,
      failureCount: 0
    },
    checkNewChapters: {
      isRunning: false,
      lastRun: null,
      nextRun: null,
      successCount: 0,
      failureCount: 0
    },
    generateScripts: {
      isRunning: false,
      lastRun: null,
      nextRun: null,
      successCount: 0,
      failureCount: 0
    },
    generateVideos: {
      isRunning: false,
      lastRun: null,
      nextRun: null,
      successCount: 0,
      failureCount: 0
    }
  };

  constructor(
    graphqlUrl?: string,
    private defaultUserId?: mongoose.Types.ObjectId
  ) {
    this.syncService = new SukuyamiSyncService(graphqlUrl);
    this.scriptService = new ScriptGenerationService();
    this.videoService = new VideoGenerationService(graphqlUrl);
  }

  startAllJobs(): void {
    logger.info('Starting SUKUYAMI cron jobs...');

    // Sync webtoons daily at 2:00 AM
    this.startSyncWebtoonsJob('0 2 * * *');

    // Check for new chapters every 6 hours
    this.startCheckNewChaptersJob('0 */6 * * *');

    // Generate scripts daily at 3:00 AM
    this.startGenerateScriptsJob('0 3 * * *');

    // Generate videos daily at 4:00 AM
    this.startGenerateVideosJob('0 4 * * *');

    logger.info('All SUKUYAMI cron jobs started successfully');
  }

  stopAllJobs(): void {
    logger.info('Stopping SUKUYAMI cron jobs...');

    Object.values(this.jobs).forEach(job => {
      if (job) {
        job.stop();
      }
    });

    this.jobs = {};
    logger.info('All SUKUYAMI cron jobs stopped');
  }

  private startSyncWebtoonsJob(schedule: string): void {
    if (this.jobs.syncWebtoons) {
      this.jobs.syncWebtoons.stop();
    }

    this.jobs.syncWebtoons = cron.schedule(schedule, async () => {
      if (this.status.syncWebtoons.isRunning) {
        logger.warn('Sync webtoons job is already running, skipping...');
        return;
      }

      this.status.syncWebtoons.isRunning = true;
      this.status.syncWebtoons.lastRun = new Date();

      try {
        logger.info('Starting scheduled webtoon sync...');

        if (!this.defaultUserId) {
          throw new Error('Default user ID not configured for cron jobs');
        }

        const result = await this.syncService.syncAllWebtoons({
          userId: this.defaultUserId,
          syncChapters: true,
          forceUpdate: false
        });

        this.status.syncWebtoons.successCount++;
        logger.info('Scheduled webtoon sync completed:', result);

        // Send notification via RabbitMQ
        await this.sendNotification('webtoons_synced', {
          type: 'sync_completed',
          result,
          timestamp: new Date()
        });

      } catch (error) {
        this.status.syncWebtoons.failureCount++;
        logger.error('Scheduled webtoon sync failed:', error);

        await this.sendNotification('webtoons_sync_failed', {
          type: 'sync_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });

      } finally {
        this.status.syncWebtoons.isRunning = false;
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    // Calculate next run time
    this.status.syncWebtoons.nextRun = this.getNextRunTime(schedule);
    logger.info(`Sync webtoons job scheduled: ${schedule}`);
  }

  private startCheckNewChaptersJob(schedule: string): void {
    if (this.jobs.checkNewChapters) {
      this.jobs.checkNewChapters.stop();
    }

    this.jobs.checkNewChapters = cron.schedule(schedule, async () => {
      if (this.status.checkNewChapters.isRunning) {
        logger.warn('Check new chapters job is already running, skipping...');
        return;
      }

      this.status.checkNewChapters.isRunning = true;
      this.status.checkNewChapters.lastRun = new Date();

      try {
        logger.info('Starting scheduled new chapters check...');

        const result = await this.syncService.checkForNewChapters();

        this.status.checkNewChapters.successCount++;
        logger.info('Scheduled new chapters check completed:', result);

        if (result.chapters.added > 0) {
          // Send notification for new chapters
          await this.sendNotification('new_chapters', {
            type: 'new_chapters_found',
            newChaptersCount: result.chapters.added,
            result,
            timestamp: new Date()
          });
        }

      } catch (error) {
        this.status.checkNewChapters.failureCount++;
        logger.error('Scheduled new chapters check failed:', error);

        await this.sendNotification('chapters_check_failed', {
          type: 'check_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });

      } finally {
        this.status.checkNewChapters.isRunning = false;
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.status.checkNewChapters.nextRun = this.getNextRunTime(schedule);
    logger.info(`Check new chapters job scheduled: ${schedule}`);
  }

  private startGenerateScriptsJob(schedule: string): void {
    if (this.jobs.generateScripts) {
      this.jobs.generateScripts.stop();
    }

    this.jobs.generateScripts = cron.schedule(schedule, async () => {
      if (this.status.generateScripts.isRunning) {
        logger.warn('Generate scripts job is already running, skipping...');
        return;
      }

      this.status.generateScripts.isRunning = true;
      this.status.generateScripts.lastRun = new Date();

      try {
        logger.info('Starting scheduled script generation...');

        // Get webtoons that need script generation
        const Webtoon = mongoose.model('Webtoon');
        const webtoons = await Webtoon.find({
          sourceType: 'sukuyami',
          status: { $in: ['ongoing', 'completed'] }
        }).limit(10); // Process 10 webtoons per run to avoid overload

        let totalSuccessful = 0;
        let totalFailed = 0;

        for (const webtoon of webtoons) {
          try {
            const result = await this.scriptService.generateScriptsForWebtoon(
              webtoon._id,
              { style: 'narrative', durationPerPanel: 3 }
            );

            totalSuccessful += result.successful;
            totalFailed += result.failed;

            logger.info(`Script generation for ${webtoon.title}:`, result);

          } catch (error) {
            logger.error(`Script generation failed for ${webtoon.title}:`, error);
            totalFailed++;
          }
        }

        this.status.generateScripts.successCount++;
        logger.info(`Scheduled script generation completed: ${totalSuccessful} successful, ${totalFailed} failed`);

        if (totalSuccessful > 0) {
          await this.sendNotification('scripts_generated', {
            type: 'scripts_generated',
            successfulCount: totalSuccessful,
            failedCount: totalFailed,
            timestamp: new Date()
          });
        }

      } catch (error) {
        this.status.generateScripts.failureCount++;
        logger.error('Scheduled script generation failed:', error);

        await this.sendNotification('script_generation_failed', {
          type: 'generation_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });

      } finally {
        this.status.generateScripts.isRunning = false;
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.status.generateScripts.nextRun = this.getNextRunTime(schedule);
    logger.info(`Generate scripts job scheduled: ${schedule}`);
  }

  private startGenerateVideosJob(schedule: string): void {
    if (this.jobs.generateVideos) {
      this.jobs.generateVideos.stop();
    }

    this.jobs.generateVideos = cron.schedule(schedule, async () => {
      if (this.status.generateVideos.isRunning) {
        logger.warn('Generate videos job is already running, skipping...');
        return;
      }

      this.status.generateVideos.isRunning = true;
      this.status.generateVideos.lastRun = new Date();

      try {
        logger.info('Starting scheduled video generation...');

        // Get webtoons that need video generation
        const Webtoon = mongoose.model('Webtoon');
        const webtoons = await Webtoon.find({
          sourceType: 'sukuyami',
          status: { $in: ['ongoing', 'completed'] }
        }).limit(5); // Process 5 webtoons per run (videos are resource-intensive)

        let totalSuccessful = 0;
        let totalFailed = 0;

        for (const webtoon of webtoons) {
          try {
            const result = await this.videoService.generateVideosForWebtoon(
              webtoon._id,
              { format: 'mp4', quality: 'medium' }
            );

            totalSuccessful += result.successful;
            totalFailed += result.failed;

            logger.info(`Video generation for ${webtoon.title}:`, result);

          } catch (error) {
            logger.error(`Video generation failed for ${webtoon.title}:`, error);
            totalFailed++;
          }
        }

        this.status.generateVideos.successCount++;
        logger.info(`Scheduled video generation completed: ${totalSuccessful} successful, ${totalFailed} failed`);

        if (totalSuccessful > 0) {
          await this.sendNotification('videos_generated', {
            type: 'videos_generated',
            successfulCount: totalSuccessful,
            failedCount: totalFailed,
            timestamp: new Date()
          });
        }

      } catch (error) {
        this.status.generateVideos.failureCount++;
        logger.error('Scheduled video generation failed:', error);

        await this.sendNotification('video_generation_failed', {
          type: 'generation_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });

      } finally {
        this.status.generateVideos.isRunning = false;
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.status.generateVideos.nextRun = this.getNextRunTime(schedule);
    logger.info(`Generate videos job scheduled: ${schedule}`);
  }

  private getNextRunTime(_schedule: string): Date {
    // Simple calculation for next run time
    // In production, you might want to use a more sophisticated cron parser
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to 24 hours
    return nextRun;
  }

  private async sendNotification(routingKey: string, data: any): Promise<void> {
    try {
      // Check if RabbitMQ service has the required methods
      if ((rabbitMQService as any).isConnected && (rabbitMQService as any).isConnected()) {
        await (rabbitMQService as any).publish(routingKey, data);
        logger.info(`Notification sent: ${routingKey}`);
      } else {
        logger.warn('RabbitMQ not connected or methods not available, skipping notification');
      }
    } catch (error) {
      logger.error(`Failed to send notification ${routingKey}:`, error);
    }
  }

  getStatus(): CronJobStatus {
    return { ...this.status };
  }

  async runJobManually(jobName: keyof CronJobStatus): Promise<void> {
    logger.info(`Manually running job: ${jobName}`);

    switch (jobName) {
      case 'syncWebtoons':
        if (!this.defaultUserId) {
          throw new Error('Default user ID not configured');
        }
        await this.syncService.syncAllWebtoons({
          userId: this.defaultUserId,
          syncChapters: true
        });
        break;

      case 'checkNewChapters':
        await this.syncService.checkForNewChapters();
        break;

      case 'generateScripts':
        // Implementation for manual script generation
        logger.info('Manual script generation not implemented yet');
        break;

      case 'generateVideos':
        // Implementation for manual video generation
        logger.info('Manual video generation not implemented yet');
        break;

      default:
        throw new Error(`Unknown job: ${jobName}`);
    }

    logger.info(`Manual job ${jobName} completed`);
  }

  updateSchedule(jobName: keyof CronJobStatus, schedule: string): void {
    logger.info(`Updating schedule for ${jobName}: ${schedule}`);

    switch (jobName) {
      case 'syncWebtoons':
        this.startSyncWebtoonsJob(schedule);
        break;

      case 'checkNewChapters':
        this.startCheckNewChaptersJob(schedule);
        break;

      case 'generateScripts':
        this.startGenerateScriptsJob(schedule);
        break;

      case 'generateVideos':
        this.startGenerateVideosJob(schedule);
        break;

      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

export default SukuyamiCronService;
