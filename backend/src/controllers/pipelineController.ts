import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import Job, { JobType, PipelineStep } from '../models/Job';
import ChapterAnalysis from '../models/ChapterAnalysis';
import panelAnalysisService from '../services/panelAnalysisService';
import storyService from '../services/storyService';
import ttsService from '../services/ttsService';
import timelineService from '../services/timelineService';
import videoService from '../services/videoService';
import aiService from '../services/aiService';
import { rabbitMQService } from '../config/rabbitmq/rabbitmq.service';
import { EXCHANGE_NAMES, ROUTING_KEYS } from '../config/rabbitmq/constants';

class PipelineController {

  /**
   * POST /api/pipeline/chapter/analyze
   * Analyze a chapter: fetch panels → OCR → vision analysis
   */
  async analyzeChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId, mangaId } = req.body;

      if (!chapterId || !mangaId) {
        return res.status(400).json({
          success: false,
          message: 'chapterId and mangaId are required',
        });
      }

      // Create job
      const job = new Job({
        chapterId,
        mangaId,
        type: 'analyze' as JobType,
        status: 'queued',
        steps: [
          { step: 'fetch_panels', status: 'queued', progress: 0 },
          { step: 'ocr', status: 'queued', progress: 0 },
          { step: 'vision_analysis', status: 'queued', progress: 0 },
        ],
      });
      await job.save();

      // Publish to queue for async processing
      const published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.AI_WORKER,
        ROUTING_KEYS.AI_WORKER.PANEL_ANALYSIS,
        { jobId: job._id.toString(), chapterId, mangaId, type: 'analyze' }
      );

      if (!published) {
        // If queue fails, process synchronously
        logger.warn('Queue publish failed, processing synchronously');
        this.processAnalysis(job._id.toString(), chapterId, mangaId).catch(err =>
          logger.error('Sync analysis failed:', err)
        );
      }

      res.status(202).json({
        success: true,
        message: 'Analysis job queued',
        data: { jobId: job._id, status: job.status },
      });
    } catch (error) {
      logger.error('Analyze chapter failed:', error);
      return next(error);
    }
  }

  /**
   * POST /api/pipeline/chapter/story
   * Generate story from analyzed panels
   */
  async generateStory(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId, mangaId } = req.body;

      if (!chapterId) {
        return res.status(400).json({
          success: false,
          message: 'chapterId is required',
        });
      }

      // Check if analysis exists
      const analysis = await ChapterAnalysis.findOne({ chapterId });
      if (!analysis || analysis.panels.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Chapter must be analyzed first. Call /chapter/analyze first.',
        });
      }

      // Create job
      const job = new Job({
        chapterId,
        mangaId: mangaId || analysis.mangaId,
        type: 'story' as JobType,
        status: 'processing',
        steps: [
          { step: 'story_generation', status: 'processing', progress: 0, startedAt: new Date() },
        ],
        startedAt: new Date(),
      });
      await job.save();

      // Process synchronously for story (fast enough)
      try {
        const story = await storyService.generateStory(chapterId);

        job.status = 'completed';
        job.progress = 100;
        job.completedAt = new Date();
        job.steps[0].status = 'completed';
        job.steps[0].progress = 100;
        job.steps[0].completedAt = new Date();
        job.result = { storyFile: `chapters/${chapterId}/story.json` };
        await job.save();

        // Export story JSON
        const storyJson = await storyService.exportStoryJSON(chapterId);

        res.json({
          success: true,
          data: { jobId: job._id, story, storyJson: JSON.parse(storyJson) },
        });
      } catch (err: any) {
        job.status = 'failed';
        job.error = err.message;
        job.steps[0].status = 'failed';
        job.steps[0].error = err.message;
        await job.save();
        throw err;
      }
    } catch (error) {
      logger.error('Generate story failed:', error);
      return next(error);
    }
  }

  /**
   * POST /api/pipeline/chapter/narration
   * Generate voice narration
   */
  async generateNarration(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId, mangaId } = req.body;

      if (!chapterId) {
        return res.status(400).json({
          success: false,
          message: 'chapterId is required',
        });
      }

      const analysis = await ChapterAnalysis.findOne({ chapterId });
      if (!analysis || !analysis.story.narrationScript) {
        return res.status(400).json({
          success: false,
          message: 'Story must be generated first. Call /chapter/story first.',
        });
      }

      // Create job
      const job = new Job({
        chapterId,
        mangaId: mangaId || analysis.mangaId,
        type: 'narration' as JobType,
        status: 'queued',
        steps: [
          { step: 'voice_generation', status: 'queued', progress: 0 },
          { step: 'timeline', status: 'queued', progress: 0 },
          { step: 'subtitles', status: 'queued', progress: 0 },
        ],
      });
      await job.save();

      // Publish to queue
      const published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.AI_VIDEO,
        ROUTING_KEYS.AI_VIDEO.GENERATE_VOICE,
        { jobId: job._id.toString(), chapterId, mangaId: mangaId || analysis.mangaId, type: 'narration' }
      );

      if (!published) {
        this.processNarration(job._id.toString(), chapterId).catch(err =>
          logger.error('Sync narration failed:', err)
        );
      }

      res.status(202).json({
        success: true,
        message: 'Narration job queued',
        data: { jobId: job._id, status: job.status },
      });
    } catch (error) {
      logger.error('Generate narration failed:', error);
      return next(error);
    }
  }

  /**
   * POST /api/pipeline/chapter/video
   * Generate final video
   */
  async generateVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId, mangaId, options } = req.body;

      if (!chapterId) {
        return res.status(400).json({
          success: false,
          message: 'chapterId is required',
        });
      }

      const analysis = await ChapterAnalysis.findOne({ chapterId });
      if (!analysis || analysis.timeline.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Timeline must be generated first. Call /chapter/narration first.',
        });
      }

      // Create job
      const job = new Job({
        chapterId,
        mangaId: mangaId || analysis.mangaId,
        type: 'video' as JobType,
        status: 'queued',
        steps: [
          { step: 'video_render', status: 'queued', progress: 0 },
        ],
      });
      await job.save();

      // Publish to queue
      const published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.AI_VIDEO,
        ROUTING_KEYS.AI_VIDEO.GENERATE_VIDEO,
        { jobId: job._id.toString(), chapterId, mangaId: mangaId || analysis.mangaId, type: 'video', options }
      );

      if (!published) {
        this.processVideo(job._id.toString(), chapterId, options).catch(err =>
          logger.error('Sync video generation failed:', err)
        );
      }

      res.status(202).json({
        success: true,
        message: 'Video generation job queued',
        data: { jobId: job._id, status: job.status },
      });
    } catch (error) {
      logger.error('Generate video failed:', error);
      return next(error);
    }
  }

  /**
   * GET /api/pipeline/job/:jobId
   * Get job status and progress
   */
  async getJobStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found',
        });
      }

      res.json({
        success: true,
        data: {
          jobId: job._id,
          chapterId: job.chapterId,
          type: job.type,
          status: job.status,
          progress: job.progress,
          currentStep: job.currentStep,
          steps: job.steps,
          result: job.result,
          error: job.error,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          createdAt: job.createdAt,
        },
      });
    } catch (error) {
      logger.error('Get job status failed:', error);
      return next(error);
    }
  }

  /**
   * GET /api/pipeline/result/:chapterId
   * Get all results for a chapter
   */
  async getResult(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId } = req.params;

      const analysis = await ChapterAnalysis.findOne({ chapterId });
      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: 'No results found for this chapter',
        });
      }

      const jobs = await Job.find({ chapterId }).sort({ createdAt: -1 }).limit(10);

      res.json({
        success: true,
        data: {
          chapterId,
          status: analysis.status,
          panelCount: analysis.panelCount,
          totalDuration: analysis.totalDuration,
          story: analysis.story,
          timeline: analysis.timeline,
          files: {
            audio: analysis.audioFile,
            subtitle: analysis.subtitleFile,
            video: analysis.videoFile,
            thumbnail: analysis.thumbnailFile,
          },
          recentJobs: jobs.map(j => ({
            id: j._id,
            type: j.type,
            status: j.status,
            progress: j.progress,
            createdAt: j.createdAt,
          })),
        },
      });
    } catch (error) {
      logger.error('Get result failed:', error);
      return next(error);
    }
  }

  /**
   * GET /api/pipeline/health
   * Health check for all pipeline services
   */
  async healthCheck(_req: Request, res: Response, next: NextFunction) {
    try {
      const [aiHealth, ttsHealth, ffmpegHealth] = await Promise.all([
        aiService.healthCheck(),
        ttsService.healthCheck(),
        videoService.healthCheck(),
      ]);

      res.json({
        success: true,
        data: {
          ai: aiHealth,
          tts: ttsHealth,
          ffmpeg: ffmpegHealth,
          overall: aiHealth.healthy && ffmpegHealth,
        },
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      return next(error);
    }
  }

  // ==================== INTERNAL PROCESSING METHODS ====================

  /**
   * Process analysis job (called by queue consumer or synchronously)
   */
  async processAnalysis(jobId: string, chapterId: string, mangaId: string): Promise<void> {
    const job = await Job.findById(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.startedAt = new Date();
      job.currentStep = 'fetch_panels' as PipelineStep;
      await job.save();

      // Update step statuses as we progress
      await this.updateJobStep(jobId, 'fetch_panels', 'processing');

      const panels = await panelAnalysisService.analyzeChapter(
        chapterId,
        mangaId,
        jobId,
        (progress) => {
          // Progress callback - could emit SSE/WS event here
          logger.debug(`Analysis progress: ${progress.percentage}%`);
        }
      );

      await this.updateJobStep(jobId, 'fetch_panels', 'completed', 100);
      await this.updateJobStep(jobId, 'ocr', 'completed', 100);
      await this.updateJobStep(jobId, 'vision_analysis', 'completed', 100);

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.result = { storyFile: `chapters/${chapterId}/analysis.json` };
      await job.save();

      logger.info(`Analysis job ${jobId} completed: ${panels.length} panels`);
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      await job.save();
      logger.error(`Analysis job ${jobId} failed:`, error.message);
    }
  }

  /**
   * Process narration job
   */
  async processNarration(jobId: string, chapterId: string): Promise<void> {
    const job = await Job.findById(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.startedAt = new Date();
      job.currentStep = 'voice_generation' as PipelineStep;
      await job.save();

      // Step 1: Get narration segments
      await this.updateJobStep(jobId, 'voice_generation', 'processing');
      const segments = await storyService.getNarrationSegments(chapterId);

      // Step 2: Generate TTS
      const ttsResult = await ttsService.generateChapterNarration(segments, chapterId);
      await this.updateJobStep(jobId, 'voice_generation', 'completed', 100);

      // Step 3: Generate timeline
      await this.updateJobStep(jobId, 'timeline', 'processing');
      job.currentStep = 'timeline' as PipelineStep;
      await job.save();

      const audioDurations = ttsResult.files.map(f => f.duration);
      await timelineService.generateTimeline(chapterId, audioDurations);
      await timelineService.exportTimelineJSON(chapterId);
      await this.updateJobStep(jobId, 'timeline', 'completed', 100);

      // Step 4: Generate subtitles
      await this.updateJobStep(jobId, 'subtitles', 'processing');
      job.currentStep = 'subtitles' as PipelineStep;
      await job.save();

      const srtPath = await timelineService.generateSRT(chapterId);
      await timelineService.generateVTT(chapterId);
      await this.updateJobStep(jobId, 'subtitles', 'completed', 100);

      // Update analysis record
      const analysis = await ChapterAnalysis.findOne({ chapterId });
      if (analysis) {
        analysis.audioFile = ttsResult.combinedFile;
        analysis.subtitleFile = srtPath;
        analysis.status = 'narrated';
        await analysis.save();
      }

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.result = {
        audioFile: ttsResult.combinedFile,
        subtitleFile: srtPath,
        timelineFile: `chapters/${chapterId}/timeline.json`,
        narrationFile: `chapters/${chapterId}/narration.txt`,
      };
      await job.save();

      logger.info(`Narration job ${jobId} completed: ${ttsResult.totalDuration.toFixed(1)}s`);
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      await job.save();
      logger.error(`Narration job ${jobId} failed:`, error.message);
    }
  }

  /**
   * Process video generation job
   */
  async processVideo(jobId: string, chapterId: string, options?: any): Promise<void> {
    const job = await Job.findById(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.startedAt = new Date();
      job.currentStep = 'video_render' as PipelineStep;
      await job.save();

      await this.updateJobStep(jobId, 'video_render', 'processing');

      const result = await videoService.generateVideo(chapterId, options || {});

      await this.updateJobStep(jobId, 'video_render', 'completed', 100);

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.result = {
        videoFile: result.videoPath,
        thumbnailFile: result.thumbnailPath,
      };
      await job.save();

      logger.info(`Video job ${jobId} completed: ${result.videoPath}`);
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      await job.save();
      logger.error(`Video job ${jobId} failed:`, error.message);
    }
  }

  /**
   * Helper: update a specific step in a job
   */
  private async updateJobStep(
    jobId: string,
    step: PipelineStep,
    status: string,
    progress?: number
  ): Promise<void> {
    const update: any = {
      'steps.$[elem].status': status,
    };
    if (progress !== undefined) {
      update['steps.$[elem].progress'] = progress;
    }
    if (status === 'processing') {
      update['steps.$[elem].startedAt'] = new Date();
    }
    if (status === 'completed') {
      update['steps.$[elem].completedAt'] = new Date();
    }

    await Job.findByIdAndUpdate(jobId, { $set: update }, {
      arrayFilters: [{ 'elem.step': step }],
    });
  }
}

export default new PipelineController();
