import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Webtoon from '../models/Webtoon';
import Chapter from '../models/Chapter';
import ScriptGenerationService from '../services/scriptGenerationService';
import SukuyamiGraphQLService from '../services/sukuyamiGraphQLService';
import logger from '../config/logger';

function mapSukuyamiStatus(status?: string): string {
  if (!status) return 'unknown';
  const lower = status.toLowerCase();
  if (lower === 'on_hiatus') return 'hiatus';
  if (lower === 'publishing_finished') return 'completed';
  return lower;
}

function mapSukuyamiMangaToWebtoon(manga: any): any {
  return {
    _id: String(manga.id),
    title: manga.title || '',
    description: manga.description || '',
    author: manga.author || '',
    coverImage: manga.thumbnailUrl || '',
    status: mapSukuyamiStatus(manga.status),
    totalChapters: manga.chapters?.totalCount ?? 0,
    genres: manga.genre || [],
    sukuyamiData: {
      sukuyamiId: String(manga.id),
      rating: 0,
      popularity: 0,
    },
    createdAt: manga.inLibraryAt || '',
    updatedAt: manga.lastFetchedAt || '',
  };
}

function mapSukuyamiChapterToChapter(chapter: any): any {
  return {
    _id: String(chapter.id),
    webtoonId: String(chapter.mangaId),
    chapterNumber: chapter.chapterNumber,
    title: chapter.name || `Chapter ${chapter.chapterNumber}`,
    status: chapter.isRead ? 'completed' : 'pending',
    isRead: !!chapter.isRead,
    isBookmarked: !!chapter.isBookmarked,
    panelCount: chapter.pageCount ?? 0,
    scriptGenerated: false,
    videoGenerated: false,
    videoUrl: undefined,
    createdAt: chapter.fetchedAt || '',
    updatedAt: chapter.lastReadAt || '',
  };
}

  const scriptService = new ScriptGenerationService();
  const graphqlService = new SukuyamiGraphQLService();
class SukuyamiController {

  constructor() {
  
  }

  // Get all webtoons from SUKUYAMI library with pagination and filtering
  async getWebtoons(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const genre = req.query.genre as string;
      const search = req.query.search as string;
      const sortBy = req.query.sortBy as string || 'updatedAt';
      const sortOrder = req.query.sortOrder as string || 'desc';

      const result = await graphqlService.getLibraryMangas(
        page,
        limit,
        status,
        genre,
        search,
        sortBy,
        sortOrder
      );

      const webtoons = result.mangas.map(mapSukuyamiMangaToWebtoon);

      res.json({
        success: true,
        data: {
          webtoons,
          pagination: {
            page,
            limit,
            total: result.totalCount,
            pages: Math.ceil(result.totalCount / limit),
            hasNext: result.hasNextPage,
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

      const manga = await graphqlService.getManga(webtoonId);

      if (!manga) {
        return res.status(404).json({
          success: false,
          message: 'Webtoon not found'
        });
      }

      const totalChapters = manga.chapters?.totalCount ?? 0;
      const unreadCount = manga.unreadCount ?? 0;

      res.json({
        success: true,
        data: {
          webtoon: mapSukuyamiMangaToWebtoon(manga),
          stats: {
            totalChapters,
            completedChapters: Math.max(0, totalChapters - unreadCount),
            chaptersWithVideo: 0,
            latestChapter: manga.highestNumberedChapter?.chapterNumber ?? 0,
            completionRate: totalChapters > 0 ? ((totalChapters - unreadCount) / totalChapters) * 100 : 0
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

      const result = await graphqlService.getChaptersWithTotal(
        webtoonId,
        page,
        limit,
        status
      );

      const chapters = result.chapters.map(mapSukuyamiChapterToChapter);

      res.json({
        success: true,
        data: {
          chapters,
          pagination: {
            page,
            limit,
            total: result.totalCount,
            pages: Math.ceil(result.totalCount / limit),
            hasNext: result.hasNextPage,
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
    
      const chapter = await graphqlService.getChapterInfo(chapterId);

      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: 'Chapter not found'
        });
      }

      res.json({
        success: true,
        data: { chapter: mapSukuyamiChapterToChapter(chapter) }
      });

    } catch (error) {
      logger.error('Get chapter failed:', error);
      return next(error);
    }
  }

  // Get chapter page images
  async getChapterPages(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId } = req.params;

      const pages = await graphqlService.getChapterPages(chapterId);

      res.json({
        success: true,
        data: { pages, panelCount: pages.length }
      });

    } catch (error) {
      logger.error('Get chapter pages failed:', error);
      return next(error);
    }
  }

  // Mark a chapter as read
  async markChapterAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId } = req.params;

      const chapter = await graphqlService.markChapterAsRead(chapterId);

      res.json({
        success: true,
        message: 'Chapter marked as read',
        data: { chapter: mapSukuyamiChapterToChapter(chapter) }
      });

    } catch (error) {
      logger.error('Mark chapter as read failed:', error);
      return next(error);
    }
  }

  // Mark all chapters of a manga as read
  async markAllChaptersAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { webtoonId } = req.params;

      const chapters = await graphqlService.markAllChaptersAsRead(webtoonId);

      res.json({
        success: true,
        message: 'All chapters marked as read',
        data: {
          chapters: chapters.map(mapSukuyamiChapterToChapter)
        }
      });

    } catch (error) {
      logger.error('Mark all chapters as read failed:', error);
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
