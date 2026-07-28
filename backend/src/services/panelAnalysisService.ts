import axios from 'axios';
import logger from '../config/logger';
import aiService from './aiService';
import socketService from './socketService';
import SukuyamiGraphQLService from './sukuyamiGraphQLService';
import ChapterAnalysis, { IPanelAnalysis } from '../models/ChapterAnalysis';
import Job from '../models/Job';

const graphqlService = new SukuyamiGraphQLService();

export interface AnalysisProgress {
  total: number;
  completed: number;
  current: number;
  percentage: number;
}

class PanelAnalysisService {
  private batchSize: number;
  private parallelRequests: number;
  private panelMaxRetries: number;
  private panelRetryDelayMs: number;

  constructor() {
    this.batchSize = parseInt(process.env.PANEL_BATCH_SIZE || '5');
    this.parallelRequests = parseInt(process.env.PANEL_PARALLEL_REQUESTS || '2');
    this.panelMaxRetries = parseInt(process.env.PANEL_MAX_RETRIES || '3');
    this.panelRetryDelayMs = parseInt(process.env.PANEL_RETRY_DELAY_MS || '1000');
  }

  /**
   * Fetch all panel image URLs for a chapter
   */
  async fetchPanelUrls(chapterId: string): Promise<string[]> {
    try {
      const pages = await graphqlService.getChapterPages(chapterId);
      logger.info(`Fetched ${pages.length} panel URLs for chapter ${chapterId}`);
      return pages;
    } catch (error: any) {
      logger.error(`Failed to fetch panels for chapter ${chapterId}:`, error.message);
      throw new Error(`Failed to fetch panels: ${error.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Download a panel image and return as base64 with retries
   */
  async downloadPanelAsBase64(imageUrl: string): Promise<string> {
    const maxRetries = parseInt(process.env.PANEL_DOWNLOAD_RETRIES || '3', 10);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[Download] Attempt ${attempt + 1}/${maxRetries + 1} for ${imageUrl}`);
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 60000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        const buffer = Buffer.from(response.data);
        logger.info(`[Download] Success for ${imageUrl} (${buffer.length} bytes)`);
        return buffer.toString('base64');
      } catch (error: any) {
        logger.error(`[Download] Attempt ${attempt + 1} failed for ${imageUrl}:`, error.message);
        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt);
          logger.warn(`[Download] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        } else {
          throw new Error(`Failed to download panel after ${maxRetries + 1} attempts: ${error.message}`);
        }
      }
    }

    throw new Error(`Failed to download panel after ${maxRetries + 1} attempts: ${imageUrl}`);
  }

  /**
   * Analyze a single panel (OCR + Vision) with retries.
   * Throws if vision analysis cannot be completed so the chapter job can be marked failed and resumed.
   */
  async analyzeSinglePanel(
    imageUrl: string,
    panelIndex: number,
    chapterId?: string,
    jobId?: string
  ): Promise<IPanelAnalysis> {
    const ctx = { chapterId, jobId, panelIndex };

    for (let attempt = 0; attempt <= this.panelMaxRetries; attempt++) {
      try {
        logger.info(`[Panel ${panelIndex + 1}] Analysis attempt ${attempt + 1}/${this.panelMaxRetries + 1} for ${imageUrl}`);

        socketService.emitToContext({ jobId, chapterId }, 'pipeline:panel:progress', {
          ...ctx,
          imageUrl,
          status: 'downloading',
          attempt: attempt + 1,
          timestamp: new Date().toISOString(),
        });

        const imageBase64 = await this.downloadPanelAsBase64(imageUrl);

        socketService.emitToContext({ jobId, chapterId }, 'pipeline:panel:progress', {
          ...ctx,
          imageUrl,
          status: 'analyzing',
          attempt: attempt + 1,
          timestamp: new Date().toISOString(),
        });

        // Run OCR and Vision in parallel
        const [ocr, vision] = await Promise.all([
          aiService.extractText(imageBase64, panelIndex, ctx),
          aiService.analyzePanel(imageBase64, panelIndex, ctx),
        ]);

        socketService.emitToContext({ jobId, chapterId }, 'pipeline:panel:analyzed', {
          ...ctx,
          imageUrl,
          ocrLines: ocr.rawText ? ocr.rawText.split('\n').length : 0,
          descriptionPreview: vision.description?.slice(0, 80),
          timestamp: new Date().toISOString(),
        });

        logger.info(`[Panel ${panelIndex + 1}] Analysis succeeded`);
        return {
          panelIndex,
          imageUrl,
          ocr,
          vision,
        };
      } catch (error: any) {
        logger.error(`[Panel ${panelIndex + 1}] Analysis attempt ${attempt + 1} failed:`, error.message);

        socketService.emitToContext({ jobId, chapterId }, 'pipeline:panel:retry', {
          ...ctx,
          imageUrl,
          attempt: attempt + 1,
          maxRetries: this.panelMaxRetries + 1,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        if (attempt < this.panelMaxRetries) {
          const delay = this.panelRetryDelayMs * Math.pow(2, attempt);
          logger.warn(`[Panel ${panelIndex + 1}] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        } else {
          socketService.emitToContext({ jobId, chapterId }, 'pipeline:panel:error', {
            ...ctx,
            imageUrl,
            error: error.message,
            timestamp: new Date().toISOString(),
          });
          throw new Error(`Panel ${panelIndex + 1} analysis failed after ${this.panelMaxRetries + 1} attempts: ${error.message}`);
        }
      }
    }

    throw new Error(`Panel ${panelIndex + 1} analysis failed after ${this.panelMaxRetries + 1} attempts`);
  }

  /**
   * Analyze all panels in a chapter with batching and progress tracking
   */
  async analyzeChapter(
    chapterId: string,
    mangaId: string,
    jobId?: string,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<IPanelAnalysis[]> {
    try {
    // Fetch panel URLs
    const panelUrls = await this.fetchPanelUrls(chapterId);
    const total = panelUrls.length;

    if (total === 0) {
      throw new Error(`No panels found for chapter ${chapterId}`);
    }

    logger.info(`Starting analysis of ${total} panels for chapter ${chapterId}`);

    // Get or create chapter analysis document
    let analysis = await ChapterAnalysis.findOne({ chapterId });
    if (!analysis) {
      analysis = new ChapterAnalysis({
        chapterId,
        mangaId,
        panelCount: total,
        status: 'analyzing',
      });
      await analysis.save();
    } else {
      analysis.status = 'analyzing';
      analysis.panelCount = total;
      await analysis.save();
    }

    const results: IPanelAnalysis[] = [];
    let completed = 0;

    socketService.emitToContext({ jobId, chapterId }, 'pipeline:panel:progress', {
      chapterId,
      jobId,
      total,
      completed: 0,
      current: 0,
      percentage: 0,
      status: 'started',
      timestamp: new Date().toISOString(),
    });

    // Process in batches
    for (let i = 0; i < total; i += this.batchSize) {
      const batch = panelUrls.slice(i, i + this.batchSize);
      const batchPromises = batch.map((url, batchIdx) => {
        const panelIndex = i + batchIdx;
        return this.analyzeSinglePanel(url, panelIndex, chapterId, jobId);
      });

      // Process batch with concurrency limit
      const batchResults = await this.processBatchWithLimit(batchPromises, this.parallelRequests);
      results.push(...batchResults);
      completed += batchResults.length;

      // Report progress
      const progress: AnalysisProgress = {
        total,
        completed,
        current: Math.min(i + this.batchSize, total),
        percentage: Math.round((completed / total) * 100),
      };

      if (onProgress) onProgress(progress);

      socketService.emitToContext({ jobId, chapterId }, 'pipeline:panel:progress', {
        ...progress,
        chapterId,
        jobId,
        status: 'in_progress',
        timestamp: new Date().toISOString(),
      });

      // Update job progress if tracking
      if (jobId) {
        await Job.findByIdAndUpdate(jobId, {
          progress: Math.round((completed / total) * 50), // Analysis is 50% of total pipeline
          'steps.$[elem].progress': progress.percentage,
        }, {
          arrayFilters: [{ 'elem.step': 'vision_analysis' }],
        });
      }

      logger.info(`Panel analysis progress: ${completed}/${total} (${progress.percentage}%)`);
    }

    // Save results to database
    analysis.panels = results;
    analysis.combinedText = results
      .map((r) => r.ocr.rawText)
      .filter(Boolean)
      .join('\n\n');
    analysis.status = 'analyzed';
    await analysis.save();

    socketService.emitToContext({ jobId, chapterId }, 'pipeline:panel:progress', {
      chapterId,
      jobId,
      total,
      completed: total,
      current: total,
      percentage: 100,
      status: 'completed',
      timestamp: new Date().toISOString(),
    });

    logger.info(`Completed analysis of ${total} panels for chapter ${chapterId}`);
    return results;
  } catch (error: any) {
    logger.error(`Chapter ${chapterId} analysis failed:`, error.message);

    socketService.emitToContext({ jobId, chapterId }, 'pipeline:panel:error', {
      chapterId,
      jobId,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    const analysis = await ChapterAnalysis.findOne({ chapterId });
    if (analysis) {
      analysis.status = 'failed';
      await analysis.save();
    }

    throw error;
  }
  }

  /**
   * Process promises with concurrency limit
   */
  private async processBatchWithLimit<T>(promises: Promise<T>[], limit: number): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const promise of promises) {
      const p = promise.then((result) => {
        results.push(result);
      });
      executing.push(p);

      if (executing.length >= limit) {
        await Promise.all(executing);
        executing.length = 0;
      }
    }

    await Promise.all(executing);
    return results;
  }
}

export default new PanelAnalysisService();
