import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import Job, { IJob, JobType, PipelineStep, JobStatus } from '../models/Job';
import ChapterAnalysis from '../models/ChapterAnalysis';
import panelAnalysisService from '../services/panelAnalysisService';
import storyService from '../services/storyService';
import ttsService from '../services/ttsService';
import timelineService from '../services/timelineService';
import videoService from '../services/videoService';
import aiService from '../services/aiService';
import SukuyamiGraphQLService from '../services/sukuyamiGraphQLService';
import socketService from '../services/socketService';
import { rabbitMQService } from '../config/rabbitmq/rabbitmq.service';
import { EXCHANGE_NAMES, ROUTING_KEYS } from '../config/rabbitmq/constants';
import { toNumericId } from '../utils/numericId';

class PipelineController {

  /**
   * POST /api/pipeline/chapter/analyze
   * Analyze a chapter: fetch panels → OCR → vision analysis
   */
  async analyzeChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const rawChapterId = req.body.chapterId;
      const rawMangaId = req.body.mangaId;

      if (!rawChapterId || !rawMangaId) {
        return res.status(400).json({
          success: false,
          message: 'chapterId and mangaId are required',
        });
      }

      const chapterId = toNumericId(rawChapterId);
      const mangaId = toNumericId(rawMangaId);

      // Upsert job with findOneAndUpdate to avoid duplicate documents
      const job = await Job.findOneAndUpdate(
        { chapterId, type: 'analyze' },
        {
          $setOnInsert: {
            mangaId,
            chapterId,
            type: 'analyze',
          },
          $set: {
            status: 'queued',
            steps: [
              { step: 'fetch_panels', status: 'queued', progress: 0 },
              { step: 'ocr', status: 'queued', progress: 0 },
              { step: 'vision_analysis', status: 'queued', progress: 0 },
            ],
          },
        },
        { new: true, upsert: true }
      );

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
      const rawChapterId = req.body.chapterId;
      const rawMangaId = req.body.mangaId;

      if (!rawChapterId) {
        return res.status(400).json({
          success: false,
          message: 'chapterId is required',
        });
      }

      const chapterId = toNumericId(rawChapterId);

      // Check if analysis exists
      const analysis = await ChapterAnalysis.findOne({ chapterId });
      if (!analysis || analysis.panels.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Chapter must be analyzed first. Call /chapter/analyze first.',
        });
      }

      const resolvedMangaId = toNumericId(rawMangaId || analysis.mangaId);

      // Upsert job
      const job = await Job.findOneAndUpdate(
        { chapterId, type: 'story' },
        {
          $setOnInsert: {
            chapterId,
            mangaId: resolvedMangaId,
            type: 'story' as JobType,
          },
          $set: {
            status: 'queued',
            steps: [
              { step: 'story_generation', status: 'queued', progress: 0 },
            ],
          },
        },
        { new: true, upsert: true }
      );

      // Publish to queue for async processing
      const published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.AI_VIDEO,
        ROUTING_KEYS.AI_VIDEO.GENERATE_SCRIPT,
        { jobId: job._id.toString(), chapterId, mangaId: resolvedMangaId, type: 'story' }
      );

      if (!published) {
        // If queue fails, process synchronously
        logger.warn('Queue publish failed, processing story synchronously');
        this.processStory(job._id.toString(), chapterId, resolvedMangaId).catch(err =>
          logger.error('Sync story generation failed:', err)
        );
      }

      res.status(202).json({
        success: true,
        message: 'Story generation job queued',
        data: { jobId: job._id, status: job.status },
      });
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
      const rawChapterId = req.body.chapterId;
      const rawMangaId = req.body.mangaId;

      if (!rawChapterId) {
        return res.status(400).json({
          success: false,
          message: 'chapterId is required',
        });
      }

      const chapterId = toNumericId(rawChapterId);

      const analysis = await ChapterAnalysis.findOne({ chapterId });
      if (!analysis || !analysis.story.narrationScript) {
        return res.status(400).json({
          success: false,
          message: 'Story must be generated first. Call /chapter/story first.',
        });
      }

      const resolvedMangaId = toNumericId(rawMangaId || analysis.mangaId);

      // Upsert job
      const job = await Job.findOneAndUpdate(
        { chapterId, type: 'narration' },
        {
          $setOnInsert: {
            chapterId,
            mangaId: resolvedMangaId,
            type: 'narration' as JobType,
          },
          $set: {
            status: 'queued',
            steps: [
              { step: 'voice_generation', status: 'queued', progress: 0 },
              { step: 'timeline', status: 'queued', progress: 0 },
              { step: 'subtitles', status: 'queued', progress: 0 },
            ],
          },
        },
        { new: true, upsert: true }
      );

      // Publish to queue
      const published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.AI_VIDEO,
        ROUTING_KEYS.AI_VIDEO.GENERATE_VOICE,
        { jobId: job._id.toString(), chapterId, mangaId: resolvedMangaId, type: 'narration' }
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
      const rawChapterId = req.body.chapterId;
      const rawMangaId = req.body.mangaId;
      const options = req.body.options;

      if (!rawChapterId) {
        return res.status(400).json({
          success: false,
          message: 'chapterId is required',
        });
      }

      const chapterId = toNumericId(rawChapterId);

      const analysis = await ChapterAnalysis.findOne({ chapterId });
      if (!analysis || analysis.timeline.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Timeline must be generated first. Call /chapter/narration first.',
        });
      }

      const resolvedMangaId = toNumericId(rawMangaId || analysis.mangaId);

      // Upsert job
      const job = await Job.findOneAndUpdate(
        { chapterId, type: 'video' },
        {
          $setOnInsert: {
            chapterId,
            mangaId: resolvedMangaId,
            type: 'video' as JobType,
          },
          $set: {
            status: 'queued',
            options,
            steps: [
              { step: 'video_render', status: 'queued', progress: 0 },
            ],
          },
        },
        { new: true, upsert: true }
      );

      // Publish to queue
      const published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.AI_VIDEO,
        ROUTING_KEYS.AI_VIDEO.GENERATE_VIDEO,
        { jobId: job._id.toString(), chapterId, mangaId: resolvedMangaId, type: 'video', options }
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
      const chapterId = toNumericId(req.params.chapterId);

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

  /**
   * POST /api/pipeline/webtoon/full
   * Run the full pipeline (analyze → story → narration → video) for all chapters
   * of a webtoon. Each stage status is persisted to the database so the pipeline
   * can be resumed and only missing stages are re-run.
   */
  async runFullPipelineForWebtoon(req: Request, res: Response, next: NextFunction) {
    try {
      const { webtoonId, chapterLimit = 1, options = {}, force = false } = req.body;

      if (!webtoonId) {
        return res.status(400).json({
          success: false,
          message: 'webtoonId is required',
        });
      }

      const graphqlService = new SukuyamiGraphQLService();
      const { chapters } = await graphqlService.getChaptersWithTotal(String(webtoonId), 1, 10000);

      if (!chapters || chapters.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No chapters found for this webtoon',
        });
      }

      const limit = Math.min(parseInt(chapterLimit as string, 10) || 1, chapters.length);
      const chaptersToProcess = chapters.slice(0, limit);

      const results: any[] = [];

      for (const chapter of chaptersToProcess) {
        const chapterId = toNumericId(chapter.id);
        const mangaId = toNumericId(chapter.mangaId || webtoonId);
        const chapterTitle = chapter.name || `Chapter ${chapter.number || 0}`;

        const result = await this.runFullPipelineForChapter(
          chapterId,
          mangaId,
          chapterTitle,
          options,
          force === true
        );
        results.push(result);
      }

      return res.json({
        success: true,
        message: `Processed ${results.length} chapter(s)`,
        data: {
          webtoonId,
          chapterLimit: limit,
          totalChapters: chapters.length,
          chapters: results,
        },
      });
    } catch (error) {
      logger.error('Run full pipeline for webtoon failed:', error);
      return next(error);
    }
  }

  /**
   * POST /api/pipeline/chapter/full
   * Run the full pipeline (analyze → story → narration → video) for a single
   * chapter by chapterId and mangaId. Stage status is persisted to the DB and
   * the pipeline resumes from the last completed stage.
   */
  async runFullPipelineForChapterByIds(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId, mangaId, options = {}, force = false } = req.body;

      if (!chapterId || !mangaId) {
        return res.status(400).json({
          success: false,
          message: 'chapterId and mangaId are required',
        });
      }

      const result = await this.runFullPipelineForChapter(
        toNumericId(chapterId),
        toNumericId(mangaId),
        `Chapter ${chapterId}`,
        options,
        force === true
      );

      return res.json({
        success: true,
        message: 'Chapter pipeline completed',
        data: result,
      });
    } catch (error) {
      logger.error('Run full pipeline for chapter failed:', error);
      return next(error);
    }
  }

  /**
   * Run the full pipeline for a single chapter and return the result.
   * Reuses or creates a `full_pipeline` job and skips already completed stages.
   */
  private async runFullPipelineForChapter(
    chapterId: number,
    mangaId: number,
    chapterTitle: string,
    options: any,
    force: boolean
  ): Promise<any> {
    let job = await this.getOrCreateFullPipelineJob(chapterId, mangaId, options, force);

    if (job.status === 'completed' && !force) {
      const analysis = await ChapterAnalysis.findOne({ chapterId });
      return {
        chapterId,
        title: chapterTitle,
        status: 'completed',
        skipped: true,
        jobId: job._id,
        files: analysis ? {
          story: analysis.story,
          audio: analysis.audioFile,
          video: analysis.videoFile,
          thumbnail: analysis.thumbnailFile,
          subtitle: analysis.subtitleFile,
        } : undefined,
      };
    }

    // Mark the pipeline as queued and dispatch the first incomplete step to RabbitMQ
    if (job.status !== 'queued' && job.status !== 'processing') {
      job.status = 'queued';
      await job.save();
    }

    logger.info(`[Full Pipeline] Queuing chapter ${chapterId} - ${chapterTitle} (job: ${job._id})`);

    this.emitPipelineEvent(job._id.toString(), chapterId, 'pipeline:chapter:started', {
      title: chapterTitle,
      step: 'vision_analysis',
      progress: job.progress,
      status: 'queued',
    });

    try {
      await this.queueNextFullPipelineStep(job, chapterId, mangaId);

      return {
        chapterId,
        title: chapterTitle,
        status: 'queued',
        jobId: job._id,
        message: 'Full pipeline queued. Progress will be streamed via Socket.IO.',
      };
    } catch (err: any) {
      logger.error(`[Full Pipeline] Failed for chapter ${chapterId}:`, err);
      job = await this.reloadJob(job._id.toString());
      job.status = 'failed';
      job.error = err.message;
      await job.save();

      this.emitPipelineEvent(job._id.toString(), chapterId, 'pipeline:chapter:failed', {
        step: job.currentStep,
        error: err.message,
        progress: job.progress,
      });

      return {
        chapterId,
        title: chapterTitle,
        status: 'failed',
        error: err.message,
        jobId: job._id,
      };
    }
  }

  // ==================== INTERNAL PIPELINE HELPERS ====================

  private isStepCompleted(job: IJob, stepName: PipelineStep): boolean {
    const step = job.steps.find((s) => s.step === stepName);
    return step?.status === 'completed';
  }

  private isJobFailed(job: IJob | null): boolean {
    return job?.status === 'failed';
  }

  private async reloadJob(jobId: string) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    return job;
  }

  private emitPipelineEvent(jobId: string, chapterId: number | string, event: string, data: any = {}) {
    socketService.emitToContext({ jobId, chapterId }, event, { ...data, chapterId, jobId });
  }

  private async getOrCreateFullPipelineJob(
    chapterId: number,
    mangaId: number,
    options: any,
    force: boolean
  ): Promise<IJob> {
    const allSteps: PipelineStep[] = [
      'fetch_panels', 'ocr', 'vision_analysis', 'story_generation',
      'voice_generation', 'timeline', 'subtitles', 'video_render',
    ];
    const defaultSteps = allSteps.map((step) => ({
      step,
      status: 'queued' as JobStatus,
      progress: 0,
    }));

    let job = await Job.findOne({ chapterId, type: 'full_pipeline' }).sort({ createdAt: -1 });

    if (job && force) {
      await Job.findOneAndUpdate(
        { _id: job._id },
        {
          $set: {
            status: 'processing',
            progress: 0,
            currentStep: undefined,
            error: undefined,
            result: undefined,
            options,
            completedAt: undefined,
            startedAt: new Date(),
            steps: defaultSteps,
          },
        }
      );
      job = await this.reloadJob(job._id.toString());
    }

    if (!job) {
      job = await Job.findOneAndUpdate(
        { chapterId, type: 'full_pipeline' },
        {
          $setOnInsert: { chapterId, mangaId, type: 'full_pipeline' as JobType },
          $set: { status: 'processing', options, steps: defaultSteps, startedAt: new Date() },
        },
        { new: true, upsert: true }
      );
      if (!job) {
        throw new Error(`Failed to create full_pipeline job for chapter ${chapterId}`);
      }
    }

    return job;
  }

  // ==================== INTERNAL PROCESSING METHODS ====================

  /**
   * Process analysis job (called by queue consumer or synchronously)
   */
  async processAnalysis(jobId: string, chapterId: number, mangaId: number): Promise<void> {
    const job = await Job.findById(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.startedAt = new Date();
      job.currentStep = 'fetch_panels' as PipelineStep;
      await job.save();

      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:step:started', { step: 'vision_analysis' });

      // Update step statuses as we progress
      await this.updateJobStep(jobId, 'fetch_panels', 'processing');

      const panels = await panelAnalysisService.analyzeChapter(
        chapterId,
        mangaId,
        jobId,
        (progress) => {
          // Progress callback - could emit SSE/WS event here
          logger.debug(`Analysis progress: ${progress.percentage}%`);
          this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:progress', {
            step: 'vision_analysis',
            ...progress,
          });
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

      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:step:completed', { step: 'vision_analysis', progress: 100, panels: panels.length });
      logger.info(`Analysis job ${jobId} completed: ${panels.length} panels`);

      if (job.type === 'full_pipeline') {
        await this.queueNextFullPipelineStep(job, chapterId, mangaId);
      }
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      await job.save();
      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:failed', { step: 'vision_analysis', error: error.message });
      logger.error(`Analysis job ${jobId} failed:`, error.message);
    }
  }

  /**
   * Process narration job
   */
  async processNarration(jobId: string, chapterId: number): Promise<void> {
    const job = await Job.findById(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.startedAt = new Date();
      job.currentStep = 'voice_generation' as PipelineStep;
      await job.save();

      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:step:started', { step: 'narration' });

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
      await ChapterAnalysis.findOneAndUpdate(
        { chapterId },
        {
          $set: {
            audioFile: ttsResult.combinedFile,
            subtitleFile: srtPath,
            status: 'narrated',
          },
        }
      );

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

      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:step:completed', { step: 'narration', duration: ttsResult.totalDuration });
      logger.info(`Narration job ${jobId} completed: ${ttsResult.totalDuration.toFixed(1)}s`);

      if (job.type === 'full_pipeline') {
        await this.queueNextFullPipelineStep(job, chapterId, job.mangaId);
      }
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      await job.save();
      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:failed', { step: 'narration', error: error.message });
      logger.error(`Narration job ${jobId} failed:`, error.message);
    }
  }

  /**
   * Process video generation job
   */
  async processVideo(jobId: string, chapterId: number, options?: any): Promise<void> {
    const job = await Job.findById(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.startedAt = new Date();
      job.currentStep = 'video_render' as PipelineStep;
      await job.save();

      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:step:started', { step: 'video_render' });

      await this.updateJobStep(jobId, 'video_render', 'processing');

      const result = await videoService.generateVideo(chapterId, options || {});

      await this.updateJobStep(jobId, 'video_render', 'completed', 100);

      // Update analysis record
      await ChapterAnalysis.findOneAndUpdate(
        { chapterId },
        {
          $set: {
            videoFile: result.videoPath,
            thumbnailFile: result.thumbnailPath,
            status: 'video_ready',
          },
        }
      );

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.result = {
        videoFile: result.videoPath,
        thumbnailFile: result.thumbnailPath,
      };
      await job.save();

      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:step:completed', { step: 'video_render', videoFile: result.videoPath, thumbnailFile: result.thumbnailPath });
      logger.info(`Video job ${jobId} completed: ${result.videoPath}`);

      if (job.type === 'full_pipeline') {
        await this.finalizeFullPipelineJob(job, chapterId);
      }
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      await job.save();
      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:failed', { step: 'video_render', error: error.message });
      logger.error(`Video job ${jobId} failed:`, error.message);
    }
  }

  /**
   * Process story generation job (called by queue consumer or synchronously)
   */
  async processStory(jobId: string, chapterId: number, mangaId?: number): Promise<void> {
    const job = await Job.findById(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.startedAt = new Date();
      job.currentStep = 'story_generation';
      await job.save();

      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:step:started', { step: 'story_generation' });
      await this.updateJobStep(jobId, 'story_generation', 'processing');

      const story = await storyService.generateStory(chapterId, mangaId || job.mangaId);

      await this.updateJobStep(jobId, 'story_generation', 'completed', 100);

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.result = { storyFile: `chapters/${chapterId}/story.json` };
      await job.save();

      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:step:completed', { step: 'story_generation', story });
      logger.info(`Story job ${jobId} completed`);

      if (job.type === 'full_pipeline') {
        await this.queueNextFullPipelineStep(job, chapterId, mangaId || job.mangaId);
      }
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      await job.save();
      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:failed', { step: 'story_generation', error: error.message });
      logger.error(`Story job ${jobId} failed:`, error.message);
    }
  }

  /**
   * Queue the next incomplete step of a full-pipeline job to RabbitMQ.
   * Falls back to synchronous execution if the queue is unavailable.
   */
  private async queueNextFullPipelineStep(job: IJob, chapterId: number, mangaId?: number): Promise<void> {
    const stepOrder: PipelineStep[] = ['vision_analysis', 'story_generation', 'voice_generation', 'video_render'];
    const latestJob = await this.reloadJob(job._id.toString());
    const nextStep = stepOrder.find((s) => !this.isStepCompleted(latestJob, s));

    if (!nextStep) {
      return this.finalizeFullPipelineJob(latestJob, chapterId);
    }

    const resolvedMangaId = mangaId || latestJob.mangaId;
    let published = false;

    if (nextStep === 'vision_analysis') {
      published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.AI_WORKER,
        ROUTING_KEYS.AI_WORKER.PANEL_ANALYSIS,
        { jobId: latestJob._id.toString(), chapterId, mangaId: resolvedMangaId, type: 'full_pipeline' }
      );
      if (!published) {
        logger.warn('Queue publish failed for analysis, processing synchronously');
        await this.processAnalysis(latestJob._id.toString(), chapterId, resolvedMangaId);
      }
    } else if (nextStep === 'story_generation') {
      published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.AI_VIDEO,
        ROUTING_KEYS.AI_VIDEO.GENERATE_SCRIPT,
        { jobId: latestJob._id.toString(), chapterId, mangaId: resolvedMangaId, type: 'full_pipeline' }
      );
      if (!published) {
        logger.warn('Queue publish failed for story, processing synchronously');
        await this.processStory(latestJob._id.toString(), chapterId, resolvedMangaId);
      }
    } else if (nextStep === 'voice_generation') {
      published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.AI_VIDEO,
        ROUTING_KEYS.AI_VIDEO.GENERATE_VOICE,
        { jobId: latestJob._id.toString(), chapterId, mangaId: resolvedMangaId, type: 'full_pipeline' }
      );
      if (!published) {
        logger.warn('Queue publish failed for narration, processing synchronously');
        await this.processNarration(latestJob._id.toString(), chapterId);
      }
    } else if (nextStep === 'video_render') {
      const videoOptions = latestJob.options || {};
      published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.AI_VIDEO,
        ROUTING_KEYS.AI_VIDEO.GENERATE_VIDEO,
        { jobId: latestJob._id.toString(), chapterId, mangaId: resolvedMangaId, type: 'full_pipeline', options: videoOptions }
      );
      if (!published) {
        logger.warn('Queue publish failed for video, processing synchronously');
        await this.processVideo(latestJob._id.toString(), chapterId, videoOptions);
      }
    }
  }

  /**
   * Mark a full-pipeline job as fully completed and emit the final completion event.
   */
  private async finalizeFullPipelineJob(job: IJob, chapterId: number): Promise<void> {
    const latestJob = await this.reloadJob(job._id.toString());

    if (!this.isJobFailed(latestJob)) {
      latestJob.status = 'completed';
      latestJob.progress = 100;
      latestJob.completedAt = new Date();
      await latestJob.save();
    }

    const analysis = await ChapterAnalysis.findOne({ chapterId });

    this.emitPipelineEvent(latestJob._id.toString(), chapterId, 'pipeline:chapter:completed', {
      progress: 100,
      files: analysis ? {
        story: analysis.story,
        audio: analysis.audioFile,
        video: analysis.videoFile,
        thumbnail: analysis.thumbnailFile,
        subtitle: analysis.subtitleFile,
      } : undefined,
    });

    logger.info(`Full pipeline job ${latestJob._id} completed for chapter ${chapterId}`);
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
