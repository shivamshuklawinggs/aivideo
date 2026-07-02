import archiver from 'archiver';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import logger from '../config/logger';
import SukuyamiGraphQLService, { MangaInfo, ChapterInfo } from './sukuyamiGraphQLService';

export interface WebtoonInfo {
  title: string;
  description?: string;
  author?: string;
  genres: string[];
  coverImage?: string;
  url: string;
  source: string;
}

export interface DownloadOptions {
  chapters?: number[];
  format?: 'zip' | 'cbz';
  quality?: 'low' | 'medium' | 'high';
  source?: 'graphql';
}

export interface DownloadResult {
  webtoon: WebtoonInfo;
  chapters: ChapterInfo[];
  archive: {
    name: string;
    size: number;
    path: string;
    totalImages: number;
    totalSize: number;
  };
  downloaded: number;
  downloadStats: {
    totalTime: number;
    totalImages: number;
    successRate: number;
    failedChapters: number[];
  };
}

export class GraphQLWebtoonDownloader {
  private graphqlService: SukuyamiGraphQLService;

  constructor(graphqlUrl?: string) {
    this.graphqlService = new SukuyamiGraphQLService(graphqlUrl);
  }

  async getWebtoonInfo(urlOrId: string): Promise<WebtoonInfo> {
    try {
      logger.info(`Fetching webtoon info from GraphQL API: ${urlOrId}`);
      
      let mangaInfo: MangaInfo | null = null;
      
      // Try to get by URL first, then by ID
      if (urlOrId.startsWith('http')) {
        mangaInfo = await this.graphqlService.getMangaByUrl(urlOrId);
      }
      
      if (!mangaInfo) {
        mangaInfo = await this.graphqlService.getManga(urlOrId);
      }
      
      if (!mangaInfo) {
        throw new Error(`Webtoon not found: ${urlOrId}`);
      }

      return {
        title: mangaInfo.title,
        description: mangaInfo.description,
        author: mangaInfo.author,
        genres: mangaInfo.genres,
        coverImage: mangaInfo.coverImage,
        url: mangaInfo.url,
        source: 'graphql'
      };
    } catch (error: any) {
      logger.error('Error fetching webtoon info from GraphQL:', error);
      throw new Error(`Failed to fetch webtoon information: ${error.message}`);
    }
  }

  async getChapterList(urlOrId: string): Promise<ChapterInfo[]> {
    try {
      logger.info('Fetching chapter list from GraphQL API...');
      
      let mangaInfo: MangaInfo | null = null;
      
      // Try to get by URL first, then by ID
      if (urlOrId.startsWith('http')) {
        mangaInfo = await this.graphqlService.getMangaByUrl(urlOrId);
      }
      
      if (!mangaInfo) {
        mangaInfo = await this.graphqlService.getManga(urlOrId);
      }
      
      if (!mangaInfo) {
        throw new Error(`Webtoon not found: ${urlOrId}`);
      }

      const chapters = await this.graphqlService.getChapters(mangaInfo.id);
      logger.info(`Found ${chapters.length} chapters`);
      return chapters;
    } catch (error: any) {
      logger.error('Error fetching chapter list from GraphQL:', error);
      throw new Error(`Failed to fetch chapter list: ${error.message}`);
    }
  }

  async downloadChapter(chapter: ChapterInfo): Promise<{
    chapterNumber: number;
    title: string;
    images: Array<{ page: number; path: string; url: string; size?: number }>;
    directory: string;
    totalPages: number;
    downloadTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      logger.info(`Downloading Chapter ${chapter.number}: ${chapter.title} from GraphQL API`);
      
      // Get pages from GraphQL API
      const pages = await this.graphqlService.getChapterPages(chapter.id);
      
      if (pages.length === 0) {
        throw new Error('No pages found in chapter');
      }

      // Create chapter directory
      const chapterDir = path.join(process.cwd(), 'temp', `Chapter_${chapter.number.toString().padStart(3, '0')}`);
      await fs.mkdir(chapterDir, { recursive: true });
      
      // Download images
      const downloadedImages = [];
      const maxRetries = 3;
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const imageName = `page_${(i + 1).toString().padStart(3, '0')}.jpg`;
        const imagePath = path.join(chapterDir, imageName);
        
        let downloaded = false;
        for (let retry = 0; retry < maxRetries && !downloaded; retry++) {
          try {
            // Download image using GraphQL service
            const imageBuffer = await this.graphqlService.downloadPageImage(page.imageUrl);
            await fs.writeFile(imagePath, imageBuffer);
            
            // Verify file was created and has content
            const stats = await fs.stat(imagePath);
            if (stats.size > 0) {
              downloaded = true;
            }
            
            if (downloaded) {
              downloadedImages.push({
                page: i + 1,
                path: imagePath,
                url: page.imageUrl,
                size: stats.size
              });
              
              logger.info(`Downloaded image ${i + 1}/${pages.length} for Chapter ${chapter.number} (${stats.size} bytes)`);
            }
          } catch (error: any) {
            logger.warn(`Failed to download image ${i + 1} for Chapter ${chapter.number} (attempt ${retry + 1}/${maxRetries}):`, error.message);
            if (retry === maxRetries - 1) {
              logger.error(`Failed to download image ${i + 1} for Chapter ${chapter.number} after ${maxRetries} attempts`);
            } else {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
            }
          }
        }
      }
      
      if (downloadedImages.length === 0) {
        throw new Error('No images were successfully downloaded');
      }
      
      const downloadTime = Date.now() - startTime;
      
      return {
        chapterNumber: chapter.number,
        title: chapter.title,
        images: downloadedImages,
        directory: chapterDir,
        totalPages: downloadedImages.length,
        downloadTime
      };
    } catch (error: any) {
      const downloadTime = Date.now() - startTime;
      logger.error(`Error downloading Chapter ${chapter.number} after ${downloadTime}ms:`, error);
      throw new Error(`Failed to download Chapter ${chapter.number}: ${error.message}`);
    }
  }

  async createArchive(
    chapters: Array<{
      chapterNumber: number;
      title: string;
      images: Array<{ page: number; path: string; url: string; size?: number }>;
      directory: string;
      totalPages: number;
      downloadTime: number;
    }>,
    format: string = 'zip',
    webtoonTitle: string
  ): Promise<{ name: string; size: number; path: string; totalImages: number; totalSize: number }> {
    try {
      logger.info(`Creating ${format.toUpperCase()} archive for ${chapters.length} chapters...`);
      
      const archiveName = `${webtoonTitle.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
      const archiveDir = path.join(process.cwd(), 'downloads');
      const archivePath = path.join(archiveDir, archiveName);
      
      // Ensure downloads directory exists
      await fs.mkdir(archiveDir, { recursive: true });
      
      const output = fsSync.createWriteStream(archivePath);
      const archive = archiver(format as any, { zlib: { level: 9 } });
      
      // Calculate total images and size
      let totalImages = 0;
      let totalSize = 0;
      chapters.forEach(chapter => {
        totalImages += chapter.images.length;
        chapter.images.forEach(image => {
          if (image.size) {
            totalSize += image.size;
          }
        });
      });

      return new Promise((resolve, reject) => {
        output.on('close', () => {
          logger.info(`Archive created: ${archiveName} (${archive.pointer()} bytes) - ${totalImages} images, ${totalSize} bytes total`);
          resolve({
            name: archiveName,
            size: archive.pointer(),
            path: archivePath,
            totalImages,
            totalSize
          });
        });
        
        archive.on('error', reject);
        archive.pipe(output);
        
        // Add chapters to archive
        chapters.forEach(chapter => {
          if (chapter.images && chapter.images.length > 0) {
            const chapterDir = `Chapter_${chapter.chapterNumber.toString().padStart(3, '0')}/`;
            archive.directory(chapter.directory, chapterDir);
          }
        });
        
        archive.finalize();
      });
    } catch (error: any) {
      logger.error('Error creating archive:', error);
      throw new Error(`Failed to create archive: ${error.message}`);
    }
  }

  async downloadWebtoon(
    urlOrId: string,
    options: DownloadOptions = {}
  ): Promise<DownloadResult> {
    const startTime = Date.now();
    
    try {
      // Get webtoon information
      logger.info('Fetching webtoon information from GraphQL API...');
      const webtoonInfo = await this.getWebtoonInfo(urlOrId);
      
      // Get chapter list
      logger.info('Fetching chapter list from GraphQL API...');
      const allChapters = await this.getChapterList(urlOrId);
      
      // Filter chapters if specified
      const chaptersToDownload = options.chapters && options.chapters.length > 0 
        ? allChapters.filter(ch => options.chapters!.includes(ch.number))
        : allChapters;
      
      logger.info(`Downloading ${chaptersToDownload.length} chapters out of ${allChapters.length} total`);
      
      // Download chapters with progress tracking
      const downloadedChapters = [];
      const failedChapters: number[] = [];
      let totalImages = 0;
      
      for (let i = 0; i < chaptersToDownload.length; i++) {
        const chapter = chaptersToDownload[i];
        logger.info(`Processing chapter ${i + 1}/${chaptersToDownload.length}: Chapter ${chapter.number}`);
        
        try {
          const downloadedChapter = await this.downloadChapter(chapter);
          downloadedChapters.push(downloadedChapter);
          totalImages += downloadedChapter.totalPages;
          
          logger.info(`Successfully downloaded Chapter ${chapter.number} - ${downloadedChapter.totalPages} pages in ${downloadedChapter.downloadTime}ms`);
        } catch (error) {
          logger.error(`Failed to download Chapter ${chapter.number}:`, error);
          failedChapters.push(chapter.number);
          // Continue with other chapters
        }
      }
      
      if (downloadedChapters.length === 0) {
        throw new Error('No chapters were successfully downloaded');
      }
      
      // Create archive
      logger.info('Creating archive...');
      const archive = await this.createArchive(
        downloadedChapters, 
        options.format || 'zip', 
        webtoonInfo.title
      );
      
      const totalTime = Date.now() - startTime;
      const successRate = (downloadedChapters.length / chaptersToDownload.length) * 100;
      
      logger.info(`Download completed in ${totalTime}ms - ${downloadedChapters.length}/${chaptersToDownload.length} chapters (${successRate.toFixed(1)}%) - ${totalImages} images`);
      
      return {
        webtoon: webtoonInfo,
        chapters: allChapters,
        archive,
        downloaded: downloadedChapters.length,
        downloadStats: {
          totalTime,
          totalImages,
          successRate,
          failedChapters
        }
      };
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      logger.error(`Download webtoon failed after ${totalTime}ms:`, error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async cleanup(): Promise<void> {
    try {
      logger.info('Cleaning up GraphQL webtoon downloader...');
      
      // Clean up temp directory
      const tempDir = path.join(process.cwd(), 'temp');
      try {
        await fs.access(tempDir);
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          await fs.rm(path.join(tempDir, file), { recursive: true });
        }
      } catch {
        // Directory doesn't exist, nothing to clean
      }
      
      logger.info('GraphQL webtoon downloader cleanup completed');
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await this.graphqlService.healthCheck();
    } catch (error) {
      logger.error('GraphQL webtoon downloader health check failed:', error);
      return false;
    }
  }
}

export default GraphQLWebtoonDownloader;
