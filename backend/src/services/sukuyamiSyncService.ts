import mongoose from 'mongoose';
import Webtoon, { IWebtoon } from '../models/Webtoon';
import Chapter, { IChapter } from '../models/Chapter';
import SukuyamiGraphQLService, { MangaInfo, ChapterInfo } from './sukuyamiGraphQLService';
import logger from '../config/logger';

export interface SyncOptions {
  webtoonIds?: string[]; // Specific webtoon IDs to sync
  forceUpdate?: boolean; // Force update even if recently synced
  syncChapters?: boolean; // Sync chapters as well
}

export interface SyncResult {
  webtoons: {
    added: number;
    updated: number;
    failed: number;
    total: number;
  };
  chapters: {
    added: number;
    updated: number;
    failed: number;
    total: number;
  };
  errors: string[];
  duration: number;
}

export class SukuyamiSyncService {
  private graphqlService: SukuyamiGraphQLService;

  constructor(graphqlUrl?: string) {
    this.graphqlService = new SukuyamiGraphQLService(graphqlUrl);
  }

  async syncAllWebtoons(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      webtoons: { added: 0, updated: 0, failed: 0, total: 0 },
      chapters: { added: 0, updated: 0, failed: 0, total: 0 },
      errors: [],
      duration: 0
    };

    try {
      // Get webtoons to sync
      let webtoonsToSync: MangaInfo[];
      
      if (options.webtoonIds && options.webtoonIds.length > 0) {
        // Sync specific webtoons
        webtoonsToSync = [];
        for (const id of options.webtoonIds) {
          try {
            const webtoon = await this.graphqlService.getManga(id);
            if (webtoon) {
              webtoonsToSync.push(webtoon);
            }
          } catch (error) {
            result.errors.push(`Failed to fetch webtoon ${id}: ${error}`);
            result.webtoons.failed++;
          }
        }
      } else {
        // Get popular/trending webtoons or all webtoons
        webtoonsToSync = await this.graphqlService.searchManga('', 100); // Empty search to get popular
      }

      result.webtoons.total = webtoonsToSync.length;
      logger.info(`Found ${webtoonsToSync.length} webtoons to sync`);

      // Sync each webtoon
      for (const webtoonInfo of webtoonsToSync) {
        try {
          const syncResult = await this.syncWebtoon(webtoonInfo, options);
          
          if (syncResult.isNew) {
            result.webtoons.added++;
          } else {
            result.webtoons.updated++;
          }

          if (options.syncChapters) {
            result.chapters.added += syncResult.chaptersAdded;
            result.chapters.updated += syncResult.chaptersUpdated;
            result.chapters.failed += syncResult.chaptersFailed;
          }

        } catch (error) {
          logger.error(`Failed to sync webtoon ${webtoonInfo.title}:`, error);
          result.errors.push(`Failed to sync ${webtoonInfo.title}: ${error}`);
          result.webtoons.failed++;
        }
      }

      result.duration = Date.now() - startTime;
      logger.info(`SUKUYAMI sync completed in ${result.duration}ms`, result);

      return result;

    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(`Sync failed: ${error}`);
      logger.error('SUKUYAMI sync failed:', error);
      return result;
    }
  }

  private async syncWebtoon(webtoonInfo: MangaInfo, options: SyncOptions): Promise<{
    isNew: boolean;
    chaptersAdded: number;
    chaptersUpdated: number;
    chaptersFailed: number;
  }> {
    let isNew = false;
    let chaptersAdded = 0;
    let chaptersUpdated = 0;
    let chaptersFailed = 0;

    try {
      // Check if webtoon already exists
      const existingWebtoon = await Webtoon.findOne({
        $or: [
          { sukuyamiId: webtoonInfo.id },
          { title: webtoonInfo.title}
        ]
      });

      if (existingWebtoon) {
        // Update existing webtoon
        const needsUpdate = this.shouldUpdateWebtoon(existingWebtoon, webtoonInfo, options.forceUpdate);
        
        if (needsUpdate) {
          await this.updateWebtoon(existingWebtoon, webtoonInfo);
          logger.info(`Updated webtoon: ${webtoonInfo.title}`);
        }
      } else {
        // Create new webtoon
        await this.createWebtoon(webtoonInfo);
        isNew = true;
        logger.info(`Added new webtoon: ${webtoonInfo.title}`);
      }

      // Sync chapters if requested
      if (options.syncChapters) {
        const chapterResult = await this.syncChapters(webtoonInfo.id);
        chaptersAdded = chapterResult.added;
        chaptersUpdated = chapterResult.updated;
        chaptersFailed = chapterResult.failed;
      }

      return { isNew, chaptersAdded, chaptersUpdated, chaptersFailed };

    } catch (error) {
      logger.error(`Failed to sync webtoon ${webtoonInfo.title}:`, error);
      throw error;
    }
  }

  private shouldUpdateWebtoon(existing: IWebtoon, newInfo: MangaInfo, forceUpdate?: boolean): boolean {
    if (forceUpdate) return true;

    // Check if it's been more than 24 hours since last update
    const lastUpdate = existing.updatedAt || existing.createdAt || new Date(0);
    const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate > 24) return true;

    // Check if there are new chapters
    if (newInfo.totalChapters > existing.sukuyamiData.totalSourceChapters) return true;

    // Check if basic info changed
    if (existing.title !== newInfo.title) return true;
    if (existing.description !== newInfo.description) return true;
    if (existing.status !== newInfo.status) return true;

    return false;
  }

  async createWebtoon(webtoonInfo: MangaInfo, ): Promise<IWebtoon> {
    const webtoon = new Webtoon({
      sukuyamiId: webtoonInfo.id,
      title: webtoonInfo.title,
      description: webtoonInfo.description,
      coverImage: webtoonInfo.coverImage,
      genres: webtoonInfo.genres,
      author: webtoonInfo.author,
      status: webtoonInfo.status as 'ongoing' | 'completed' | 'hiatus',
      totalChapters: webtoonInfo.totalChapters,
      sourceUrl: webtoonInfo.url,
      sourceType: 'sukuyami',
      sukuyamiData: {
        totalSourceChapters: webtoonInfo.totalChapters,
        lastChapterNumber: webtoonInfo.totalChapters,
        popularity: 0, // Will be updated later
        rating: 0, // Will be updated later
        year: new Date().getFullYear(),
        alternativeTitles: [],
      },
      processingStatus: 'pending',
      isPublic: true,
      isProcessed: false,
    });

    return await webtoon.save();
  }

  private async updateWebtoon(existing: IWebtoon, webtoonInfo: MangaInfo): Promise<IWebtoon> {
    existing.title = webtoonInfo.title;
    existing.description = webtoonInfo.description;
    existing.coverImage = webtoonInfo.coverImage;
    existing.genres = webtoonInfo.genres;
    existing.author = webtoonInfo.author;
    existing.status = webtoonInfo.status as 'ongoing' | 'completed' | 'hiatus';
    existing.totalChapters = webtoonInfo.totalChapters;
    existing.sourceUrl = webtoonInfo.url;
    existing.lastUpdated = new Date();
    
    // Update SUKUYAMI specific data
    existing.sukuyamiData.totalSourceChapters = webtoonInfo.totalChapters;
    existing.sukuyamiData.lastChapterNumber = webtoonInfo.totalChapters;

    return await existing.save();
  }

  async syncChapters(sukuyamiWebtoonId: string): Promise<{
    added: number;
    updated: number;
    failed: number;
  }> {
    const result = { added: 0, updated: 0, failed: 0 };

    try {
      // Get the webtoon from our database
      const webtoon = await Webtoon.findOne({ sukuyamiId: sukuyamiWebtoonId });
      if (!webtoon) {
        throw new Error(`Webtoon not found: ${sukuyamiWebtoonId}`);
      }

      // Get chapters from SUKUYAMI
      const chapters = await this.graphqlService.getChapters(sukuyamiWebtoonId);
      logger.info(`Syncing ${chapters.length} chapters for webtoon: ${webtoon.title}`);

      for (const chapterInfo of chapters) {
        try {
          const existingChapter = await Chapter.findOne({
            webtoonId: webtoon._id,
            chapterNumber: chapterInfo.number
          });

          if (existingChapter) {
            // Update existing chapter
            await this.updateChapter(existingChapter, chapterInfo);
            result.updated++;
          } else {
            // Create new chapter
            await this.createChapter(chapterInfo, webtoon._id,);
            result.added++;
          }

        } catch (error) {
          logger.error(`Failed to sync chapter ${chapterInfo.number}:`, error);
          result.failed++;
        }
      }

      // Update webtoon chapter count
      webtoon.totalChapters = await Chapter.countDocuments({ webtoonId: webtoon._id });
      await webtoon.save();

      return result;

    } catch (error) {
      logger.error(`Failed to sync chapters for webtoon ${sukuyamiWebtoonId}:`, error);
      throw error;
    }
  }

  private async createChapter(chapterInfo: ChapterInfo, webtoonId: mongoose.Types.ObjectId): Promise<IChapter> {
    // Get pages for this chapter
    const pages = await this.graphqlService.getChapterPages(chapterInfo.id);
    
    const panels = pages.map((page, index) => ({
      pageNumber: index + 1,
      imageUrl: page,
      sequence: index + 1,
      description: `Page ${index + 1}`,
      duration: 3, // 3 seconds per panel by default
      position: { x: 0, y: 0, width: 100, height: 100 }
    }));

    const chapter = new Chapter({
      webtoonId,
      sukuyamiChapterId: chapterInfo.id,
      chapterNumber: chapterInfo.number,
      title: chapterInfo.title,
      description: '', // Will be filled later
      totalPages: pages.length,
      releaseDate: chapterInfo.releaseDate ? new Date(chapterInfo.releaseDate) : undefined,
      sourceUrl: chapterInfo.url,
      status: 'completed', // Chapters are completed when synced
      processingProgress: 50, // 50% - panels synced, script and video pending
      panels,
      metadata: {
        totalPanels: panels.length,
        estimatedReadTime: panels.length * 3, // 3 seconds per panel
        sourceInfo: {
          sukuyamiChapterId: chapterInfo.id,
          totalPages: pages.length
        }
      },
      isProcessed: false,
      processingStatus: 'pending',
    });

    return await chapter.save();
  }

  private async updateChapter(existing: IChapter, chapterInfo: ChapterInfo): Promise<IChapter> {
    // Only update if necessary
    const needsUpdate = existing.title !== chapterInfo.title ||
                       existing.sourceUrl !== chapterInfo.url;

    if (needsUpdate) {
      existing.title = chapterInfo.title;
      existing.sourceUrl = chapterInfo.url;
      if (chapterInfo.releaseDate) {
        existing.releaseDate = new Date(chapterInfo.releaseDate);
      }
      return await existing.save();
    }

    return existing;
  }

  async checkForNewChapters(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      webtoons: { added: 0, updated: 0, failed: 0, total: 0 },
      chapters: { added: 0, updated: 0, failed: 0, total: 0 },
      errors: [],
      duration: 0
    };

    try {
      logger.info('Checking for new chapters...');

      // Get all ongoing webtoons from SUKUYAMI
      const ongoingWebtoons = await Webtoon.find({
        sourceType: 'sukuyami',
        status: 'ongoing',
        sukuyamiId: { $exists: true }
      });

      result.webtoons.total = ongoingWebtoons.length;

      for (const webtoon of ongoingWebtoons) {
        try {
          // Get latest chapter count from SUKUYAMI
          const mangaInfo = await this.graphqlService.getManga(webtoon.sukuyamiId!);
          
          if (mangaInfo && mangaInfo.totalChapters > webtoon.sukuyamiData.totalSourceChapters) {
            logger.info(`New chapters found for ${webtoon.title}: ${webtoon.sukuyamiData.totalSourceChapters} -> ${mangaInfo.totalChapters}`);
            
            // Sync chapters
            const chapterResult = await this.syncChapters(webtoon.sukuyamiId!);
            
            result.chapters.added += chapterResult.added;
            result.chapters.updated += chapterResult.updated;
            result.chapters.failed += chapterResult.failed;
            
            // Update webtoon
            webtoon.sukuyamiData.totalSourceChapters = mangaInfo.totalChapters;
            webtoon.sukuyamiData.lastChapterNumber = mangaInfo.totalChapters;
            webtoon.lastUpdated = new Date();
            await webtoon.save();
            
            result.webtoons.updated++;
          }

        } catch (error) {
          logger.error(`Failed to check chapters for ${webtoon.title}:`, error);
          result.errors.push(`Failed to check ${webtoon.title}: ${error}`);
          result.webtoons.failed++;
        }
      }

      result.duration = Date.now() - startTime;
      logger.info(`New chapter check completed in ${result.duration}ms`, result);

      return result;

    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(`Chapter check failed: ${error}`);
      logger.error('New chapter check failed:', error);
      return result;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await this.graphqlService.healthCheck();
    } catch (error) {
      logger.error('SUKUYAMI sync service health check failed:', error);
      return false;
    }
  }
}

export default SukuyamiSyncService;
