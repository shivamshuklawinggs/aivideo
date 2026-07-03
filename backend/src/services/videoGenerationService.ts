import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import Chapter, { IChapter } from '../models/Chapter';
import logger from '../config/logger';
import SukuyamiGraphQLService from './sukuyamiGraphQLService';

export interface VideoGenerationOptions {
  format?: 'mp4' | 'webm' | 'avi';
  quality?: 'low' | 'medium' | 'high';
  fps?: number;
  resolution?: {
    width: number;
    height: number;
  };
  includeAudio?: boolean;
  audioCodec?: 'aac' | 'mp3' | 'opus';
  videoCodec?: 'h264' | 'h265' | 'vp9';
  outputDir?: string;
}

export interface GeneratedVideo {
  videoUrl: string;
  videoPath: string;
  videoSize: number;
  videoDuration: number;
  videoFormat: string;
  generatedAt: Date;
  processingTime: number;
}

export class VideoGenerationService {
  private graphqlService: SukuyamiGraphQLService;
  private readonly DEFAULT_OPTIONS: Required<VideoGenerationOptions> = {
    format: 'mp4',
    quality: 'medium',
    fps: 30,
    resolution: { width: 1920, height: 1080 },
    includeAudio: true,
    audioCodec: 'aac',
    videoCodec: 'h264',
    outputDir: path.join(process.cwd(), 'videos')
  };

  constructor(graphqlUrl?: string) {
    this.graphqlService = new SukuyamiGraphQLService(graphqlUrl);
  }

  async generateVideoForChapter(
    chapterId: mongoose.Types.ObjectId,
    options: VideoGenerationOptions = {}
  ): Promise<GeneratedVideo> {
    const startTime = Date.now();
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      logger.info(`Generating video for chapter: ${chapterId}`);

      // Get chapter with script and panels
      const chapter = await Chapter.findById(chapterId).populate('webtoonId');
      if (!chapter) {
        throw new Error(`Chapter not found: ${chapterId}`);
      }

      if (!chapter.generatedScript) {
        throw new Error(`Chapter has no generated script: ${chapterId}`);
      }

      if (!chapter.panels || chapter.panels.length === 0) {
        throw new Error(`Chapter has no panels: ${chapterId}`);
      }

      // Update chapter status
      chapter.status = 'processing';
      chapter.processingProgress = 80;
      await chapter.save();

      // Ensure output directory exists
      await fs.mkdir(mergedOptions.outputDir, { recursive: true });

      // Download panels
      const panelPaths = await this.downloadPanels(chapter, mergedOptions.outputDir);

      // Generate video
      const videoResult = await this.createVideoFromPanels(
        chapter,
        panelPaths,
        mergedOptions
      );

      // Save video info to chapter
      chapter.videoUrl = videoResult.videoUrl;
      chapter.videoPath = videoResult.videoPath;
      chapter.videoSize = videoResult.videoSize;
      chapter.videoDuration = videoResult.videoDuration;
      chapter.videoFormat = videoResult.videoFormat;
      chapter.videoGeneratedAt = videoResult.generatedAt;
      chapter.status = 'completed';
      chapter.processingProgress = 100;
      chapter.isProcessed = true;
      chapter.processingStatus = 'completed';
      await chapter.save();

      // Cleanup temporary panel files
      await this.cleanupPanelFiles(panelPaths);

      const processingTime = Date.now() - startTime;
      logger.info(`Video generated successfully for chapter: ${chapterId} in ${processingTime}ms`);

      return {
        ...videoResult,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`Failed to generate video for chapter ${chapterId} after ${processingTime}ms:`, error);
      
      // Update chapter with error
      const chapter = await Chapter.findById(chapterId);
      if (chapter) {
        chapter.status = 'failed';
        chapter.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await chapter.save();
      }
      
      throw error;
    }
  }

  private async downloadPanels(chapter: IChapter, outputDir: string): Promise<string[]> {
    const panelPaths: string[] = [];
    const chapterDir = path.join(outputDir, `chapter_${chapter.chapterNumber.toString().padStart(3, '0')}`);
    await fs.mkdir(chapterDir, { recursive: true });

    logger.info(`Downloading ${chapter.panels.length} panels for chapter ${chapter.chapterNumber}`);

    for (let i = 0; i < chapter.panels.length; i++) {
      const panel = chapter.panels[i];
      const panelFilename = `panel_${(i + 1).toString().padStart(3, '0')}.jpg`;
      const panelPath = path.join(chapterDir, panelFilename);

      try {
        // Download panel image using SUKUYAMI service
        const imageBuffer = await this.graphqlService.downloadPageImage(panel.imageUrl);
        await fs.writeFile(panelPath, imageBuffer);
        
        panelPaths.push(panelPath);
        logger.info(`Downloaded panel ${i + 1}/${chapter.panels.length}: ${panelPath}`);

      } catch (error) {
        logger.error(`Failed to download panel ${i + 1}: ${panel.imageUrl}`, error);
        throw new Error(`Failed to download panel ${i + 1}: ${error}`);
      }
    }

    return panelPaths;
  }

  private async createVideoFromPanels(
    chapter: IChapter,
    panelPaths: string[],
    options: Required<VideoGenerationOptions>
  ): Promise<Omit<GeneratedVideo, 'processingTime'>> {
    const webtoonTitle = (chapter.webtoonId as any)?.title || 'Unknown Webtoon';
    const videoFilename = `${webtoonTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Chapter_${chapter.chapterNumber.toString().padStart(3, '0')}.${options.format}`;
    const videoPath = path.join(options.outputDir, videoFilename);

    logger.info(`Creating video: ${videoFilename}`);

    try {
      // For now, we'll create a mock video generation
      // In production, this would use FFmpeg or similar video processing library
      const videoResult = await this.mockVideoGeneration(
        chapter,
        panelPaths,
        videoPath,
        options
      );

      return {
        videoUrl: `/videos/${videoFilename}`, // Relative URL for serving
        videoPath,
        videoSize: videoResult.size,
        videoDuration: chapter.generatedScript!.totalDuration,
        videoFormat: options.format,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Video creation failed:', error);
      throw new Error(`Failed to create video: ${error}`);
    }
  }

  private async mockVideoGeneration(
    chapter: IChapter,
    panelPaths: string[],
    outputPath: string,
    _options: Required<VideoGenerationOptions>
  ): Promise<{ size: number }> {
    // This is a mock implementation
    // In production, this would use FFmpeg to create actual videos
    
    logger.info(`Mock video generation: ${panelPaths.length} panels -> ${outputPath}`);
    
    // Create a mock video file (just for demonstration)
    const mockVideoContent = Buffer.from(`Mock video content for ${chapter.title}`);
    await fs.writeFile(outputPath, mockVideoContent);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      size: mockVideoContent.length
    };
  }

  private async cleanupPanelFiles(panelPaths: string[]): Promise<void> {
    try {
      for (const panelPath of panelPaths) {
        try {
          await fs.unlink(panelPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }

      // Try to remove chapter directory if empty
      const chapterDir = path.dirname(panelPaths[0]);
      try {
        await fs.rmdir(chapterDir);
      } catch (error) {
        // Directory not empty, ignore
      }

    } catch (error) {
      logger.warn('Error during panel cleanup:', error);
    }
  }

  async regenerateVideo(
    chapterId: mongoose.Types.ObjectId,
    options: VideoGenerationOptions = {}
  ): Promise<GeneratedVideo> {
    logger.info(`Regenerating video for chapter: ${chapterId}`);
    
    // Clear existing video
    await Chapter.findByIdAndUpdate(chapterId, {
      $unset: { 
        videoUrl: 1, 
        videoPath: 1, 
        videoSize: 1, 
        videoDuration: 1, 
        videoFormat: 1, 
        videoGeneratedAt: 1 
      },
      status: 'processing',
      processingProgress: 75
    });

    // Generate new video
    return await this.generateVideoForChapter(chapterId, options);
  }

  async generateVideosForWebtoon(
    webtoonId: mongoose.Types.ObjectId,
    options: VideoGenerationOptions = {}
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      logger.info(`Generating videos for webtoon: ${webtoonId}`);

      // Get all chapters with scripts for the webtoon
      const chapters = await Chapter.find({
        webtoonId,
        status: 'completed',
        generatedScript: { $exists: true },
        'panels.0': { $exists: true }
      });

      result.total = chapters.length;

      for (const chapter of chapters) {
        try {
          // Skip if already has video
          if (chapter.videoUrl && chapter.videoPath) {
            result.successful++;
            continue;
          }

          await this.generateVideoForChapter(chapter._id, options);
          result.successful++;

        } catch (error) {
          logger.error(`Failed to generate video for chapter ${chapter._id}:`, error);
          result.errors.push(`Chapter ${chapter.chapterNumber}: ${error}`);
          result.failed++;
        }
      }

      logger.info(`Video generation completed for webtoon ${webtoonId}:`, result);
      return result;

    } catch (error) {
      logger.error(`Failed to generate videos for webtoon ${webtoonId}:`, error);
      result.errors.push(`Webtoon processing failed: ${error}`);
      return result;
    }
  }

  async getVideo(chapterId: mongoose.Types.ObjectId): Promise<GeneratedVideo | null> {
    const chapter = await Chapter.findById(chapterId);
    
    if (!chapter?.videoUrl || !chapter?.videoPath) {
      return null;
    }

    return {
      videoUrl: chapter.videoUrl,
      videoPath: chapter.videoPath,
      videoSize: chapter.videoSize || 0,
      videoDuration: chapter.videoDuration || 0,
      videoFormat: chapter.videoFormat || 'mp4',
      generatedAt: chapter.videoGeneratedAt || new Date(),
      processingTime: 0
    };
  }

  async deleteVideo(chapterId: mongoose.Types.ObjectId): Promise<void> {
    const chapter = await Chapter.findById(chapterId);
    
    if (chapter?.videoPath) {
      try {
        await fs.unlink(chapter.videoPath);
      } catch (error) {
        logger.warn(`Failed to delete video file: ${chapter.videoPath}`, error);
      }
    }

    await Chapter.findByIdAndUpdate(chapterId, {
      $unset: { 
        videoUrl: 1, 
        videoPath: 1, 
        videoSize: 1, 
        videoDuration: 1, 
        videoFormat: 1, 
        videoGeneratedAt: 1 
      },
      processingProgress: 75
    });
    
    logger.info(`Video deleted for chapter: ${chapterId}`);
  }

  async getVideoStats(): Promise<{
    totalVideos: number;
    totalSize: number;
    averageDuration: number;
    formatCounts: Record<string, number>;
  }> {
    const chapters = await Chapter.find({
      videoUrl: { $exists: true },
      videoSize: { $exists: true }
    });

    const totalVideos = chapters.length;
    const totalSize = chapters.reduce((sum, ch) => sum + (ch.videoSize || 0), 0);
    const totalDuration = chapters.reduce((sum, ch) => sum + (ch.videoDuration || 0), 0);
    const averageDuration = totalVideos > 0 ? totalDuration / totalVideos : 0;

    const formatCounts: Record<string, number> = {};
    chapters.forEach(ch => {
      const format = ch.videoFormat || 'unknown';
      formatCounts[format] = (formatCounts[format] || 0) + 1;
    });

    return {
      totalVideos,
      totalSize,
      averageDuration,
      formatCounts
    };
  }
}

export default VideoGenerationService;
