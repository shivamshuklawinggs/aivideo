import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import Webtoon from '../models/Webtoon';
import logger from '../config/logger';
import { rabbitMQService } from '../config/rabbitmq/rabbitmq.service';
import { ROUTING_KEYS } from '../config/rabbitmq/constants';
import SimpleMangaDownloader, { DownloadOptions } from '../services/simpleMangaDownloader';
import TachiyomiDownloader from '../services/tachiyomiDownloader';
import GraphQLWebtoonDownloader from '../services/graphqlWebtoonDownloader';

interface EnhancedDownloadOptions extends DownloadOptions {
  source?: 'tachiyomi' | 'mangafire' | 'graphql' | 'auto';
}

interface DownloadRequest {
  url: string;
  chapters?: number[];
  format?: 'zip' | 'cbz';
  quality?: 'low' | 'medium' | 'high';
  source?: 'tachiyomi' | 'mangafire' | 'graphql' | 'auto';
  title?: string;
  description?: string;
  author?: string;
  genres?: string[];
}

function detectSource(url: string): 'tachiyomi' | 'mangafire' | 'graphql' {
  const hostname = new URL(url).hostname.toLowerCase();
  
  // Check if it's a Sukuyami GraphQL endpoint or ID
  if (url.includes('graphql') || url.includes('sukuyami') || !url.startsWith('http')) {
    return 'graphql';
  }
  
  // Tachiyomi-supported sources
  if (hostname.includes('mangadex') || 
      hostname.includes('mangasee') || 
      hostname.includes('mangakakalot') || 
      hostname.includes('readmanga') || 
      hostname.includes('manganelo')) {
    return 'tachiyomi';
  }
  
  // MangaFire
  if (hostname.includes('mangafire')) {
    return 'mangafire';
  }
  
  // Default to GraphQL for Sukuyami integration
  return 'graphql';
}

class WebtoonDownloaderController {
  // Remove unused downloader property

  // Get webtoon information from URL (supports multiple sources)
  async getWebtoonInfo(req: Request, res: Response, next: NextFunction) {
    let downloader: SimpleMangaDownloader | TachiyomiDownloader | GraphQLWebtoonDownloader | null = null;
    
    try {
      const { url, source } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'URL parameter is required'
        });
      }

      // Detect source or use specified source
      const detectedSource = source === 'auto' || !source ? detectSource(url) : source as 'tachiyomi' | 'mangafire' | 'graphql';
      
      logger.info(`Fetching webtoon info from: ${url} (source: ${detectedSource})`);

      // Use appropriate downloader
      if (detectedSource === 'mangafire') {
        downloader = new SimpleMangaDownloader();
      } else if (detectedSource === 'graphql') {
        downloader = new GraphQLWebtoonDownloader();
      } else {
        downloader = new TachiyomiDownloader();
      }
      
      const webtoonInfo = await downloader.getWebtoonInfo(url);
      const chapters = await downloader.getChapterList(url);
      
      await downloader.cleanup();

      res.json({
        success: true,
        data: {
          webtoon: {
            ...webtoonInfo,
            source: detectedSource
          },
          chapters: chapters.map(ch => ({ ...ch, source: detectedSource })),
          detectedSource
        }
      });

    } catch (error: any) {
      logger.error('Get webtoon info failed:', error);
      if (downloader) {
        await downloader.cleanup();
      }
      return next(error);
    }
  }

  // Download webtoon and start processing (supports multiple sources)
  async downloadAndProcessWebtoon(req: Request, res: Response, next: NextFunction) {
    let downloader: SimpleMangaDownloader | TachiyomiDownloader | GraphQLWebtoonDownloader | null = null;
    
    try {
      const userId = req.user?.id;
      const downloadRequest: DownloadRequest = req.body;

      if (!downloadRequest.url) {
        return res.status(400).json({
          success: false,
          message: 'URL is required'
        });
      }

      // Detect source or use specified source
      const detectedSource = downloadRequest.source === 'auto' || !downloadRequest.source ? 
        detectSource(downloadRequest.url) : downloadRequest.source;

      logger.info(`Starting webtoon download for user: ${userId}, URL: ${downloadRequest.url} (source: ${detectedSource})`);

      // Create webtoon record with initial status
      const webtoon = new Webtoon({
        userId,
        title: downloadRequest.title || 'Downloading...',
        description: downloadRequest.description || '',
        author: downloadRequest.author || '',
        genres: downloadRequest.genres || [],
        sourceUrl: downloadRequest.url,
        sourceType: detectedSource,
        status: 'ongoing',
        totalChapters: 0,
        processingStatus: 'downloading',
        processingProgress: 0,
        metadata: {
          downloadFormat: downloadRequest.format || 'zip',
          downloadQuality: downloadRequest.quality || 'high',
          source: detectedSource
        }
      });

      await webtoon.save();
      webtoon.processingProgress = 10;
      await webtoon.save();

      // Use appropriate downloader
      if (detectedSource === 'mangafire') {
        downloader = new SimpleMangaDownloader();
      } else if (detectedSource === 'graphql') {
        downloader = new GraphQLWebtoonDownloader();
      } else {
        downloader = new TachiyomiDownloader();
      }

      // Download the webtoon
      const downloadOptions: EnhancedDownloadOptions = {
        chapters: downloadRequest.chapters,
        format: downloadRequest.format || 'zip',
        quality: downloadRequest.quality || 'high',
        source: detectedSource
      };

      const downloadResult = await downloader.downloadWebtoon(downloadRequest.url, downloadOptions as any);

      // Update webtoon with actual information
      webtoon.title = downloadRequest.title || downloadResult.webtoon.title;
      webtoon.description = downloadRequest.description || downloadResult.webtoon.description;
      webtoon.author = downloadRequest.author || downloadResult.webtoon.author;
      webtoon.genres = downloadRequest.genres || downloadResult.webtoon.genres;
      webtoon.totalChapters = downloadResult.chapters.length;
      webtoon.archiveFileName = downloadResult.archive.name;
      webtoon.archiveFilePath = downloadResult.archive.path;
      webtoon.archiveFileSize = downloadResult.archive.size;
      webtoon.processingStatus = 'pending';
      webtoon.processingProgress = 100;
      webtoon.metadata = {
        ...webtoon.metadata,
        sourceInfo: downloadResult.webtoon,
        totalSourceChapters: downloadResult.chapters.length
      };

      await webtoon.save();

      // Start the explanation workflow
      await rabbitMQService.produceMessage(
        'ai-video-exchange',
        ROUTING_KEYS.AI_VIDEO.UPLOAD_ARCHIVE,
        {
          webtoonId: webtoon._id,
          archivePath: downloadResult.archive.path,
          userId
        }
      );

      logger.info(`Webtoon download and processing started: ${webtoon._id}`);

      res.status(201).json({
        success: true,
        message: 'Webtoon downloaded successfully and processing started',
        data: {
          webtoonId: webtoon._id,
          title: webtoon.title,
          status: webtoon.processingStatus,
          chapters: {
            total: downloadResult.chapters.length,
            downloaded: downloadResult.downloaded,
            failed: downloadResult.downloadStats.failedChapters.length,
            successRate: downloadResult.downloadStats.successRate.toFixed(1)
          },
          archive: {
            name: downloadResult.archive.name,
            size: downloadResult.archive.size,
            totalImages: downloadResult.archive.totalImages,
            totalSize: downloadResult.archive.totalSize
          },
          downloadStats: {
            totalTime: downloadResult.downloadStats.totalTime,
            totalImages: downloadResult.downloadStats.totalImages,
            successRate: downloadResult.downloadStats.successRate,
            failedChapters: downloadResult.downloadStats.failedChapters
          }
        }
      });

    } catch (error: any) {
      logger.error('Download and process webtoon failed:', error);
      if (downloader) {
        await downloader.cleanup();
      }
      return next(error);
    }
  }

  // Get download status
  async getDownloadStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { webtoonId } = req.params;
      const userId = req.user?.id;

      const webtoon = await Webtoon.findOne({ _id: webtoonId, userId });
      if (!webtoon) {
        return res.status(404).json({
          success: false,
          message: 'Webtoon not found'
        });
      }

      const isDownloaded = webtoon.archiveFilePath && fs.existsSync(webtoon.archiveFilePath);

      res.json({
        success: true,
        data: {
          webtoonId: webtoon._id,
          title: webtoon.title,
          processingStatus: webtoon.processingStatus,
          processingProgress: webtoon.processingProgress,
          sourceType: webtoon.sourceType,
          sourceUrl: webtoon.sourceUrl,
          archiveDownloaded: isDownloaded,
          metadata: webtoon.metadata
        }
      });

    } catch (error) {
      logger.error('Get download status failed:', error);
      return next(error);
    }
  }

  // Retry failed download
  async retryDownload(req: Request, res: Response, next: NextFunction) {
    let downloader: SimpleMangaDownloader | TachiyomiDownloader | GraphQLWebtoonDownloader | null = null;
    
    try {
      const { webtoonId } = req.params;
      const userId = req.user?.id;

      const webtoon = await Webtoon.findOne({ _id: webtoonId, userId });
      if (!webtoon) {
        return res.status(404).json({
          success: false,
          message: 'Webtoon not found'
        });
      }

      if (!webtoon.sourceUrl) {
        return res.status(400).json({
          success: false,
          message: 'This webtoon cannot be retried as it has no source URL'
        });
      }

      // Use appropriate downloader based on source type
      if (webtoon.sourceType === 'mangafire') {
        downloader = new SimpleMangaDownloader();
      } else if (webtoon.sourceType === 'graphql') {
        downloader = new GraphQLWebtoonDownloader();
      } else {
        downloader = new TachiyomiDownloader();
      }

      // Reset status and retry download
      webtoon.processingStatus = 'downloading';
      webtoon.processingProgress = 0;
      await webtoon.save();

      // Retry download
      const downloadOptions: EnhancedDownloadOptions = {
        format: (webtoon.metadata?.downloadFormat as 'zip' | 'cbz') || 'zip',
        quality: (webtoon.metadata?.downloadQuality as 'low' | 'medium' | 'high') || 'high',
        source: webtoon.sourceType as 'tachiyomi' | 'mangafire' | 'graphql'
      };

      const downloadResult = await downloader.downloadWebtoon(webtoon.sourceUrl, downloadOptions as any);

      // Update webtoon and restart processing
      webtoon.archiveFileName = downloadResult.archive.name;
      webtoon.archiveFilePath = downloadResult.archive.path;
      webtoon.archiveFileSize = downloadResult.archive.size;
      webtoon.processingStatus = 'pending';
      webtoon.processingProgress = 100;

      await webtoon.save();

      // Restart the explanation workflow
      await rabbitMQService.produceMessage(
        'ai-video-exchange',
        ROUTING_KEYS.AI_VIDEO.UPLOAD_ARCHIVE,
        {
          webtoonId: webtoon._id,
          archivePath: downloadResult.archive.path,
          userId,
          isRetry: true
        }
      );

      logger.info(`Webtoon download retry started: ${webtoon._id}`);

      res.json({
        success: true,
        message: 'Download retry started successfully',
        data: {
          webtoonId: webtoon._id,
          status: webtoon.processingStatus
        }
      });

    } catch (error: any) {
      logger.error('Retry download failed:', error);
      if (downloader) {
        await downloader.cleanup();
      }
      return next(error);
    }
  }

  // Search manga using GraphQL API
  async searchManga(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, limit = 20, source } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      // Only GraphQL supports search functionality
      if (source && source !== 'graphql') {
        return res.status(400).json({
          success: false,
          message: 'Search functionality is only available with GraphQL source'
        });
      }

      logger.info(`Searching manga with query: ${query}`);

      const downloader = new GraphQLWebtoonDownloader();
      const searchResults = await (downloader as any).graphqlService.searchManga(
        query, 
        parseInt(limit as string)
      );
      
      await downloader.cleanup();

      res.json({
        success: true,
        data: {
          query,
          results: searchResults,
          total: searchResults.length,
          source: 'graphql'
        }
      });

    } catch (error: any) {
      logger.error('Search manga failed:', error);
      return next(error);
    }
  }

  // Health check for all downloader services
  async healthCheck(_req: Request, res: Response, next: NextFunction) {
    try {
      const healthStatus = {
        mangafire: false,
        tachiyomi: false,
        graphql: false,
        overall: false
      };

      // Test MangaFire downloader
      try {
        const mangafireDownloader = new SimpleMangaDownloader();
        // Basic test - just instantiate
        healthStatus.mangafire = true;
        await mangafireDownloader.cleanup();
      } catch (error) {
        logger.warn('MangaFire downloader health check failed:', error);
      }

      // Test Tachiyomi downloader
      try {
        const tachiyomiDownloader = new TachiyomiDownloader();
        // Basic test - just instantiate
        healthStatus.tachiyomi = true;
        await tachiyomiDownloader.cleanup();
      } catch (error) {
        logger.warn('Tachiyomi downloader health check failed:', error);
      }

      // Test GraphQL downloader
      try {
        const graphqlDownloader = new GraphQLWebtoonDownloader();
        healthStatus.graphql = await graphqlDownloader.healthCheck();
        await graphqlDownloader.cleanup();
      } catch (error) {
        logger.warn('GraphQL downloader health check failed:', error);
      }

      healthStatus.overall = healthStatus.mangafire || healthStatus.tachiyomi || healthStatus.graphql;

      res.json({
        success: true,
        data: healthStatus
      });

    } catch (error: any) {
      logger.error('Health check failed:', error);
      return next(error);
    }
  }
}

export default new WebtoonDownloaderController();
