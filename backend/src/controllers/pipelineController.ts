import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import Job, { IJob, JobType, PipelineStep } from '../models/Job';
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
        const chapterId = String(chapter.id);
        const mangaId = String(chapter.mangaId || webtoonId);
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
        String(chapterId),
        String(mangaId),
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
    chapterId: string,
    mangaId: string,
    chapterTitle: string,
    options: any,
    force: boolean
  ): Promise<any> {
    let job = await this.getOrCreateFullPipelineJob(chapterId, mangaId, force);

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

    // Ensure job is marked processing while we work through stages
    if (job.status !== 'processing') {
      job.status = 'processing';
      await job.save();
    }

    logger.info(`[Full Pipeline] Resuming chapter ${chapterId} - ${chapterTitle} (job: ${job._id})`);

    this.emitPipelineEvent(job._id.toString(), chapterId, 'pipeline:chapter:started', {
      title: chapterTitle,
      step: 'vision_analysis',
      progress: job.progress,
    });

    try {
      // 1. Analyze panels (fetch_panels, ocr, vision_analysis)
      if (!this.isStepCompleted(job, 'vision_analysis')) {
        this.emitPipelineEvent(job._id.toString(), chapterId, 'pipeline:chapter:step:started', {
          step: 'vision_analysis',
          progress: job.progress,
        });
        await this.processAnalysis(job._id.toString(), chapterId, mangaId);
        this.emitPipelineEvent(job._id.toString(), chapterId, 'pipeline:chapter:step:completed', {
          step: 'vision_analysis',
          progress: 25,
        });
        job = await this.reloadJob(job._id.toString());
        if (this.isJobFailed(job)) throw new Error(job.error || 'Analysis stage failed');
        await this.markJobProcessing(job._id.toString());
      } else {
        logger.info(`[Full Pipeline] Analysis already completed for chapter ${chapterId}`);
      }

      job = await this.reloadJob(job._id.toString());

      // 2. Generate story
      if (!this.isStepCompleted(job, 'story_generation')) {
        this.emitPipelineEvent(job._id.toString(), chapterId, 'pipeline:chapter:step:started', { step: 'story_generation', progress: 25 });
        await this.updateJobStep(job._id.toString(), 'story_generation', 'processing');
        await storyService.generateStory(chapterId);
        await this.updateJobStep(job._id.toString(), 'story_generation', 'completed', 100);
        this.emitPipelineEvent(job._id.toString(), chapterId, 'pipeline:chapter:step:completed', { step: 'story_generation', progress: 50 });
      } else {
        logger.info(`[Full Pipeline] Story already completed for chapter ${chapterId}`);
      }

      job = await this.reloadJob(job._id.toString());

      // 3. Generate narration / audio / timeline / subtitles
      if (!this.isStepCompleted(job, 'subtitles')) {
        this.emitPipelineEvent(job._id.toString(), chapterId, 'pipeline:chapter:step:started', { step: 'narration', progress: 50 });
        await this.processNarration(job._id.toString(), chapterId);
        job = await this.reloadJob(job._id.toString());
        if (this.isJobFailed(job)) throw new Error(job.error || 'Narration stage failed');
        this.emitPipelineEvent(job._id.toString(), chapterId, 'pipeline:chapter:step:completed', { step: 'narration', progress: 75 });
        await this.markJobProcessing(job._id.toString());
      } else {
        logger.info(`[Full Pipeline] Narration already completed for chapter ${chapterId}`);
      }

      job = await this.reloadJob(job._id.toString());

      // 4. Render final video
      if (!this.isStepCompleted(job, 'video_render')) {
        this.emitPipelineEvent(job._id.toString(), chapterId, 'pipeline:chapter:step:started', { step: 'video_render', progress: 75 });
        await this.processVideo(job._id.toString(), chapterId, options);
        job = await this.reloadJob(job._id.toString());
        if (this.isJobFailed(job)) throw new Error(job.error || 'Video stage failed');
        this.emitPipelineEvent(job._id.toString(), chapterId, 'pipeline:chapter:step:completed', { step: 'video_render', progress: 100 });
      } else {
        logger.info(`[Full Pipeline] Video already completed for chapter ${chapterId}`);
      }

      job = await this.reloadJob(job._id.toString());
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      await job.save();

      const analysis = await ChapterAnalysis.findOne({ chapterId });

      this.emitPipelineEvent(job._id.toString(), chapterId, 'pipeline:chapter:completed', {
        progress: 100,
        files: analysis ? {
          story: analysis.story,
          audio: analysis.audioFile,
          video: analysis.videoFile,
          thumbnail: analysis.thumbnailFile,
          subtitle: analysis.subtitleFile,
        } : undefined,
      });

      return {
        chapterId,
        title: chapterTitle,
        status: 'completed',
        jobId: job._id,
        files: analysis ? {
          story: analysis.story,
          audio: analysis.audioFile,
          video: analysis.videoFile,
          thumbnail: analysis.thumbnailFile,
          subtitle: analysis.subtitleFile,
        } : undefined,
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

  private async reloadJob(jobId: string): Promise<IJob> {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    return job;
  }

  private async markJobProcessing(jobId: string): Promise<void> {
    await Job.findByIdAndUpdate(jobId, {
      $set: { status: 'processing' },
    });
  }

  private emitPipelineEvent(jobId: string, chapterId: string, event: string, data: any = {}) {
    socketService.emitToContext({ jobId, chapterId }, event, { ...data, chapterId, jobId });
  }

  private async getOrCreateFullPipelineJob(
    chapterId: string,
    mangaId: string,
    force: boolean
  ): Promise<IJob> {
    let job = await Job.findOne({ chapterId, type: 'full_pipeline' }).sort({ createdAt: -1 });

    if (job && force) {
      job.status = 'processing';
      job.progress = 0;
      job.currentStep = undefined;
      job.error = undefined;
      job.result = undefined;
      job.completedAt = undefined;
      job.startedAt = new Date();
      job.steps.forEach((s) => {
        s.status = 'queued';
        s.progress = 0;
        s.startedAt = undefined;
        s.completedAt = undefined;
        s.error = undefined;
      });
      await job.save();
    }

    if (!job) {
      job = new Job({
        chapterId,
        mangaId,
        type: 'full_pipeline' as JobType,
        status: 'processing',
        steps: [
          { step: 'fetch_panels', status: 'queued', progress: 0 },
          { step: 'ocr', status: 'queued', progress: 0 },
          { step: 'vision_analysis', status: 'queued', progress: 0 },
          { step: 'story_generation', status: 'queued', progress: 0 },
          { step: 'voice_generation', status: 'queued', progress: 0 },
          { step: 'timeline', status: 'queued', progress: 0 },
          { step: 'subtitles', status: 'queued', progress: 0 },
          { step: 'video_render', status: 'queued', progress: 0 },
        ],
        startedAt: new Date(),
      });
      await job.save();
    }

    return job;
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
  async processNarration(jobId: string, chapterId: string): Promise<void> {
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

      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:step:completed', { step: 'narration', duration: ttsResult.totalDuration });
      logger.info(`Narration job ${jobId} completed: ${ttsResult.totalDuration.toFixed(1)}s`);
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
  async processVideo(jobId: string, chapterId: string, options?: any): Promise<void> {
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
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      await job.save();
      this.emitPipelineEvent(jobId, chapterId, 'pipeline:chapter:failed', { step: 'video_render', error: error.message });
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
