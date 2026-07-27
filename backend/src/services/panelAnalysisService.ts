import axios from 'axios';
import logger from '../config/logger';
import aiService from './aiService';
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

  constructor() {
    this.batchSize = parseInt(process.env.PANEL_BATCH_SIZE || '5');
    this.parallelRequests = parseInt(process.env.PANEL_PARALLEL_REQUESTS || '2');
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

  /**
   * Download a panel image and return as base64
   */
  async downloadPanelAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const buffer = Buffer.from(response.data);
      return buffer.toString('base64');
    } catch (error: any) {
      logger.error(`Failed to download panel image: ${imageUrl}`, error.message);
      throw new Error(`Failed to download panel: ${error.message}`);
    }
  }

  /**
   * Analyze a single panel (OCR + Vision)
   */
  async analyzeSinglePanel(imageUrl: string, panelIndex: number): Promise<IPanelAnalysis> {
    const imageBase64 = await this.downloadPanelAsBase64(imageUrl);

    // Run OCR and Vision in parallel
    const [ocr, vision] = await Promise.all([
      aiService.extractText(imageBase64, panelIndex),
      aiService.analyzePanel(imageBase64, panelIndex),
    ]);

    return {
      panelIndex,
      imageUrl,
      ocr,
      vision,
    };
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

    // Process in batches
    for (let i = 0; i < total; i += this.batchSize) {
      const batch = panelUrls.slice(i, i + this.batchSize);
      const batchPromises = batch.map((url, batchIdx) => {
        const panelIndex = i + batchIdx;
        return this.analyzeSinglePanel(url, panelIndex).catch((error) => {
          logger.error(`Panel ${panelIndex} analysis failed:`, error.message);
          // Return a partial result on failure
          return {
            panelIndex,
            imageUrl: url,
            ocr: { speech: [], narration: [], captions: [], soundEffects: [], rawText: '' },
            vision: { characters: [], actions: [], emotions: [], scene: 'Analysis failed', objects: [], importantEvents: [], description: `Failed: ${error.message}` },
          } as IPanelAnalysis;
        });
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
    analysis.status = 'analyzed';
    await analysis.save();

    logger.info(`Completed analysis of ${total} panels for chapter ${chapterId}`);
    return results;
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
