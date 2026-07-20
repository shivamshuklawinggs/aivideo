import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Webtoon from '../models/Webtoon';
import Chapter from '../models/Chapter';
import SukuyamiSyncService, { SyncOptions } from '../services/sukuyamiSyncService';
import ScriptGenerationService from '../services/scriptGenerationService';
import VideoGenerationService from '../services/videoGenerationService';
import SukuyamiCronService from '../services/sukuyamiCronService';
import SukuyamiGraphQLService from '../services/sukuyamiGraphQLService';
import logger from '../config/logger';
  const syncService = new SukuyamiSyncService();
  const scriptService = new ScriptGenerationService();
  const videoService = new VideoGenerationService();
  const cronService = new SukuyamiCronService();
  const graphqlService = new SukuyamiGraphQLService();
class SukuyamiController {

  constructor() {
  
  }

  // Get all webtoons from database with pagination and filtering
  async getWebtoons(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const genre = req.query.genre as string;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder as string || 'desc';

      const skip = (page - 1) * limit;

      // Build filter
      const filter: Record<string, any> = { };
      
      if (status && status !== 'all') {
        filter.status = status;
      }
      
      if (genre && genre !== 'all') {
        filter.genres = { $in: [genre] };
      }
      
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { author: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort
      const sort: Record<string, 1 | -1> = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
     console.log('Filter:', filter);
     console.log('Sort:', sort);
      const webtoons = await Webtoon.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Webtoon.countDocuments(filter);

      res.json({
        success: true,
        data: {
          webtoons,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      logger.error('Get webtoons failed:', error);
      return next(error);
    }
  }

  // Get webtoon details by ID
  async getWebtoon(req: Request, res: Response, next: NextFunction) {
    try {
      const { webtoonId } = req.params;

      const webtoon = await Webtoon.findOne({ _id: webtoonId })

      if (!webtoon) {
        return res.status(404).json({
          success: false,
          message: 'Webtoon not found'
        });
      }

      // Get chapter count and latest chapter info
      const chapterStats = await Chapter.aggregate([
        { $match: { webtoonId: webtoon._id } },
        {
          $group: {
            _id: null,
            totalChapters: { $sum: 1 },
            completedChapters: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            chaptersWithVideo: {
              $sum: { $cond: [{ $ne: ['$videoUrl', null] }, 1, 0] }
            },
            latestChapter: { $max: '$chapterNumber' }
          }
        }
      ]);

      const stats = chapterStats[0] || {
        totalChapters: 0,
        completedChapters: 0,
        chaptersWithVideo: 0,
        latestChapter: 0
      };

      res.json({
        success: true,
        data: {
          webtoon,
          stats: {
            totalChapters: stats.totalChapters,
            completedChapters: stats.completedChapters,
            chaptersWithVideo: stats.chaptersWithVideo,
            latestChapter: stats.latestChapter,
            completionRate: stats.totalChapters > 0 ? (stats.completedChapters / stats.totalChapters) * 100 : 0
          }
        }
      });

    } catch (error) {
      logger.error('Get webtoon failed:', error);
      return next(error);
    }
  }

  // Get chapters for a webtoon
  async getChapters(req: Request, res: Response, next: NextFunction) {
    try {
      const { webtoonId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;

      // Verify webtoon belongs to user
      const webtoon = await Webtoon.findOne({ _id: webtoonId });
      if (!webtoon) {
        return res.status(404).json({
          success: false,
          message: 'Webtoon not found'
        });
      }

      const skip = (page - 1) * limit;
      const filter: any = { webtoonId };
      
      if (status && status !== 'all') {
        filter.status = status;
      }

      const chapters = await Chapter.find(filter)
        .sort({ chapterNumber: -1 })
        .skip(skip)
        .limit(limit)
        .select('-panels') // Exclude panels by default for performance
        .lean();

      const total = await Chapter.countDocuments(filter);

      res.json({
        success: true,
        data: {
          chapters,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      logger.error('Get chapters failed:', error);
      return next(error);
    }
  }

  // Get chapter details with panels
  async getChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId } = req.params;
    
      const chapter = await Chapter.findById(chapterId)
      
        .lean();

      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: 'Chapter not found'
        });
      }

    
      res.json({
        success: true,
        data: { chapter }
      });

    } catch (error) {
      logger.error('Get chapter failed:', error);
      return next(error);
    }
  }

  // Sync webtoons from SUKUYAMI
  async syncWebtoons(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { webtoonIds, forceUpdate, syncChapters } = req.body;

      const options: SyncOptions = {
        webtoonIds,
        forceUpdate: forceUpdate || false,
        syncChapters: syncChapters !== false
      };

      logger.info(`Starting webtoon sync for user: ${userId}`);

      const result = await syncService.syncAllWebtoons(options);

      res.json({
        success: true,
        message: 'Webtoon sync completed',
        data: result
      });

    } catch (error) {
      logger.error('Sync webtoons failed:', error);
      return next(error);
    }
  }

  // Generate script for a chapter
  async generateScript(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId } = req.params;
      const { style, durationPerPanel, model } = req.body;

      // Verify chapter belongs to user
      const chapter = await Chapter.findById(chapterId).populate('webtoonId');
      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: 'Chapter not found'
        });
      }

    
      const script = await scriptService.generateScriptForChapter(
        new mongoose.Types.ObjectId(chapterId),
        { style, durationPerPanel, model }
      );

      res.json({
        success: true,
        message: 'Script generated successfully',
        data: { script }
      });

    } catch (error) {
      logger.error('Generate script failed:', error);
      return next(error);
    }
  }

  // Generate video for a chapter
  async generateVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId } = req.params;
      const { format, quality, fps } = req.body;

      // Verify chapter belongs to user
      const chapter = await Chapter.findById(chapterId).populate('webtoonId');
      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: 'Chapter not found'
        });
      }

      

      const video = await videoService.generateVideoForChapter(
        new mongoose.Types.ObjectId(chapterId),
        { format, quality, fps }
      );

      res.json({
        success: true,
        message: 'Video generated successfully',
        data: { video }
      });

    } catch (error) {
      logger.error('Generate video failed:', error);
      return next(error);
    }
  }

  // Search webtoons via SUKUYAMI API
  async searchWebtoons(req: Request, res: Response, next: NextFunction) {
    try {
      const { query,page=1, } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const results = await graphqlService.searchManga(
        query,
        parseInt(page as string),
      );

      res.json({
        success: true,
        data: {
          query,
          results,
          total: results.length
        }
      });

    } catch (error) {
      logger.error('Search webtoons failed:', error);
      return next(error);
    }
  }

  // Add webtoon to user's collection
  async addWebtoon(req: Request, res: Response, next: NextFunction) {
    try {
      const { sukuyamiId } = req.body;

      if (!sukuyamiId) {
        return res.status(400).json({
          success: false,
          message: 'SUKUYAMI ID is required'
        });
      }

      // Check if webtoon already exists for user
      const existing = await Webtoon.findOne({
       
        sukuyamiId
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Webtoon already in your collection'
        });
      }

      // Get webtoon info from SUKUYAMI
      const webtoonInfo = await graphqlService.getManga(sukuyamiId);
      if (!webtoonInfo) {
        return res.status(404).json({
          success: false,
          message: 'Webtoon not found in SUKUYAMI'
        });
      }
    console.log("webtoonInfo",webtoonInfo)
      // Create webtoon in database
      const webtoon = await syncService.createWebtoon(
        webtoonInfo,
      );

      // Sync chapters
      await syncService.syncChapters(sukuyamiId,);

      res.status(201).json({
        success: true,
        message: 'Webtoon added successfully',
        data: { webtoon }
      });

    } catch (error) {
      logger.error('Add webtoon failed:', error);
      return next(error);
    }
  }

  // Get cron job status
  async getCronStatus(_req: Request, res: Response, next: NextFunction) {
    try {
      const status = cronService.getStatus();

      res.json({
        success: true,
        data: { status }
      });

    } catch (error) {
      logger.error('Get cron status failed:', error);
      return next(error);
    }
  }

  // Run cron job manually
  async runCronJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobName } = req.params;

      await cronService.runJobManually(jobName as any);

      res.json({
        success: true,
        message: `Job ${jobName} executed successfully`
      });

    } catch (error) {
      logger.error(`Run cron job ${req.params.jobName} failed:`, error);
      return next(error);
    }
  }

  // Get dashboard stats
  async getDashboardStats(_req: Request, res: Response, next: NextFunction) {
    try {

      const [
        totalWebtoons,
        ongoingWebtoons,
        completedWebtoons,
        totalChapters,
        completedChapters,
        chaptersWithVideo,
        recentActivity
      ] = await Promise.all([
        Webtoon.countDocuments({  }),
        Webtoon.countDocuments({  status: 'ongoing' }),
        Webtoon.countDocuments({  status: 'completed' }),
        Chapter.countDocuments({  }),
        Chapter.countDocuments({  status: 'completed' }),
        Chapter.countDocuments({  videoUrl: { $exists: true } }),
        Chapter.find({  })
          .sort({ updatedAt: -1 })
          .limit(5)
          .select('title chapterNumber status updatedAt videoGeneratedAt')
          .lean()
      ]);

      const stats = {
        webtoons: {
          total: totalWebtoons,
          ongoing: ongoingWebtoons,
          completed: completedWebtoons
        },
        chapters: {
          total: totalChapters,
          completed: completedChapters,
          withVideo: chaptersWithVideo,
          completionRate: totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0
        },
        recentActivity
      };

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      logger.error('Get dashboard stats failed:', error);
      return next(error);
    }
  }

  // Health check for SUKUYAMI services
  async healthCheck(_req: Request, res: Response, next: NextFunction) {
    try {
      const [syncHealth, graphqlHealth] = await Promise.all([
        syncService.healthCheck(),
        graphqlService.healthCheck()
      ]);

      const health = {
        syncService: syncHealth,
        graphqlService: graphqlHealth,
        overall: syncHealth && graphqlHealth
      };

      res.json({
        success: true,
        data: { health }
      });

    } catch (error) {
      logger.error('Health check failed:', error);
      return next(error);
    }
  }
  // List available sources from SUKUYAMI server
  async getSources(_req: Request, res: Response, next: NextFunction) {
    try {
      const sources = await graphqlService.getSukumaiSources();

      res.json({
        success: true,
        data: sources
      });
    } catch (error) {
      logger.error('Get sources failed:', error);
      return next(error);
    }
  }
}

export default new SukuyamiController();
