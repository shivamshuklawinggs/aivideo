import axios from 'axios';
import * as cheerio from 'cheerio';
import archiver from 'archiver';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import logger from '../config/logger';

export interface WebtoonInfo {
  title: string;
  description?: string;
  author?: string;
  genres: string[];
  coverImage?: string;
  url: string;
  source: string;
}

export interface ChapterInfo {
  number: number;
  title: string;
  url: string;
  releaseDate?: string;
  source: string;
}

export interface DownloadOptions {
  chapters?: number[];
  format?: 'zip' | 'cbz';
  quality?: 'low' | 'medium' | 'high';
  source?: 'tachiyomi' | 'mangafire' | 'auto';
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

export class TachiyomiDownloader {
  private readonly headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };

  private detectSource(url: string): string {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('mangadex')) return 'mangadex';
    if (hostname.includes('mangasee')) return 'mangasee';
    if (hostname.includes('mangakakalot')) return 'mangakakalot';
    if (hostname.includes('mangafire')) return 'mangafire';
    if (hostname.includes('readmanga')) return 'readmanga';
    if (hostname.includes('manganelo')) return 'manganelo';
    
    return 'generic';
  }

  async getWebtoonInfo(url: string): Promise<WebtoonInfo> {
    try {
      logger.info(`Fetching webtoon info from: ${url}`);
      
      const source = this.detectSource(url);
      logger.info(`Detected source: ${source}`);
      
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      let title, description, author, genres: string[], coverImage;
      
      // Use source-specific selectors
      switch (source) {
        case 'mangadex':
          title = $('h1.title, .post-title h1, h1').first().text().trim();
          description = $('.description, .summary, .entry-content').first().text().trim();
          author = $('.author, .manga-author').first().text().trim();
          genres = this.extractGenres($, '.genres a, .genre a, .manga-genres a');
          coverImage = $('.cover img, .poster img, .summary_image img').first().attr('src') || '';
          break;
          
        case 'mangasee':
          title = $('.InfoName, .manga-title, h1').first().text().trim();
          description = $('.InfoDescription, .summary').first().text().trim();
          author = $('.InfoAuthor, .author').first().text().trim();
          genres = this.extractGenres($, '.genre a, .InfoGenre a');
          coverImage = $('.InfoImage img, .cover img').first().attr('src') || '';
          break;
          
        case 'mangakakalot':
          title = $('.manga-info-text h1, .entry-title h1, h1').first().text().trim();
          description = $('.manga-info-text .manga-info-description, .description').first().text().trim();
          author = $('.manga-info-text .manga-info-name:last, .author').first().text().trim();
          genres = this.extractGenres($, '.manga-info-text .manga-info-genre a, .genres a');
          coverImage = $('.manga-info-pic img, .cover img').first().attr('src') || '';
          break;
          
        case 'mangafire':
          title = 
            $('h1.entry-title').text().trim() || 
            $('.post-title h1').text().trim() ||
            $('h1').first().text().trim() ||
            $('.manga-title').text().trim() ||
            'Unknown Title';
          description = 
            $('.entry-content').text().trim() ||
            $('.description').text().trim() ||
            $('.summary').text().trim() ||
            $('.manga-summary').text().trim() ||
            '';
          author = 
            $('.author').text().trim() ||
            $('.post-content_item:contains("Author") .summary-content').text().trim() ||
            $('.manga-author').text().trim() ||
            '';
          genres = this.extractGenres($, '.genres a, .genre a, .manga-genres a');
          coverImage = 
            $('.summary_image img').attr('src') ||
            $('.cover img').attr('src') ||
            $('.poster img').attr('src') ||
            $('.manga-cover img').attr('src') ||
            '';
          break;
          
        case 'readmanga':
          title = $('.manga-title h1, .header-stats h1, h1').first().text().trim();
          description = $('.manga-description, .description').first().text().trim();
          author = $('.manga-author, .author').first().text().trim();
          genres = this.extractGenres($, '.manga-genres a, .genres a');
          coverImage = $('.manga-cover img, .poster img').first().attr('src') || '';
          break;
          
        case 'manganelo':
          title = $('.manga-info-text h1, .story-info-right h1, h1').first().text().trim();
          description = $('.manga-info-text .manga-info-description, .description').first().text().trim();
          author = $('.manga-info-text .manga-info-name:last, .author').first().text().trim();
          genres = this.extractGenres($, '.manga-info-text .manga-info-genre a, .genres a');
          coverImage = $('.manga-info-pic img, .info-image img').first().attr('src') || '';
          break;
          
        default: // generic
          title = $('h1').first().text().trim() || 'Unknown Title';
          description = $('.description, .summary, .entry-content').first().text().trim();
          author = $('.author, .manga-author, .creator').first().text().trim();
          genres = this.extractGenres($, '.genres a, .genre a, .manga-genres a, .tags a');
          coverImage = $('img[src*="cover"], img[src*="poster"], .cover img, .poster img').first().attr('src') || '';
          break;
      }

      return {
        title: title || 'Unknown Title',
        description,
        author,
        genres,
        coverImage,
        url,
        source
      };
    } catch (error: any) {
      logger.error('Error fetching webtoon info:', error);
      throw new Error(`Failed to fetch webtoon information: ${error.message}`);
    }
  }

  private extractGenres($: cheerio.CheerioAPI, selector: string): string[] {
    const genres: string[] = [];
    $(selector).each((_, element) => {
      const genre = $(element).text().trim();
      if (genre) genres.push(genre);
    });
    return genres;
  }

  async getChapterList(url: string): Promise<ChapterInfo[]> {
    try {
      logger.info('Fetching chapter list...');
      
      const source = this.detectSource(url);
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const chapters: ChapterInfo[] = [];
      
      // Use source-specific selectors
      let chapterSelector: string;
      switch (source) {
        case 'mangadex':
          chapterSelector = '.chapter-item, .chapter-list-item, .wp-manga-chapter';
          break;
        case 'mangasee':
          chapterSelector = '.Chapter, .chapter-row, .list-chapter-item';
          break;
        case 'mangakakalot':
          chapterSelector = '.chapter-list .row, .list-chapter li, .chapter-item';
          break;
        case 'mangafire':
          chapterSelector = '.listing-chapters_wrap .wp-manga-chapter, .chapter-list .chapter-item, .chapter-item';
          break;
        case 'readmanga':
          chapterSelector = '.chapter-item, .chapters-list-item, .table-chapter-list tr';
          break;
        case 'manganelo':
          chapterSelector = '.chapter-list .row, .list-chapter li, .chapter-item';
          break;
        default:
          chapterSelector = '.chapter-list a, .chapters a, .episode-list a, a[href*="chapter"], a[href*="episode"]';
          break;
      }
      
      $(chapterSelector).each((index, element) => {
        const $chapter = $(element);
        const chapterLink = $chapter.find('a').attr('href') || $chapter.attr('href');
        let chapterTitle: string;
        
        if (source === 'generic' && $chapter.is('a')) {
          chapterTitle = $chapter.text().trim() || `Chapter ${index + 1}`;
        } else {
          chapterTitle = $chapter.find('.chapter-title, .entry-title, .title, .ChapterName, .chapter-num').text().trim() || `Chapter ${index + 1}`;
        }
        
        if (chapterLink) {
          chapters.push({
            number: index + 1,
            title: chapterTitle,
            url: chapterLink.startsWith('http') ? chapterLink : new URL(chapterLink, url).href,
            source
          });
        }
      });

      logger.info(`Found ${chapters.length} chapters`);
      return chapters.reverse();
    } catch (error: any) {
      logger.error('Error fetching chapter list:', error);
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
      logger.info(`Downloading Chapter ${chapter.number}: ${chapter.title} from ${chapter.source}`);
      
      if (!chapter.url) {
        throw new Error('Chapter URL not found');
      }
      
      const response = await axios.get(chapter.url, {
        headers: this.headers,
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      
      // Enhanced image selectors for different sources
      const imageSelectors = [
        '.reading-content img',
        '.chapter-content img',
        '.manga-page img',
        '.page img',
        '.comic-page img',
        '.wp-manga-chapter-img img',
        '.manga-reading-area img',
        '.reader-area img',
        '.container-chapter-reader img',
        '.vung-doc img',
        '.img-chapter img',
        '.chapter-img img',
        '.ChapterImages img',
        '.img-manga img'
      ];
      
      let imageUrls: string[] = [];
      for (const selector of imageSelectors) {
        $(selector).each((_, element) => {
          const src = $(element).attr('src');
          const dataSrc = $(element).attr('data-src') || $(element).attr('data-lazy-src') || $(element).attr('data-original');
          const actualSrc = dataSrc || src;
          
          if (actualSrc && (actualSrc.includes('http') || actualSrc.includes('data:image'))) {
            // Normalize URL
            let normalizedUrl = actualSrc;
            if (actualSrc.startsWith('//')) {
              normalizedUrl = 'https:' + actualSrc;
            } else if (actualSrc.startsWith('/')) {
              const baseUrl = new URL(chapter.url);
              normalizedUrl = baseUrl.origin + actualSrc;
            }
            
            if (!imageUrls.includes(normalizedUrl)) {
              imageUrls.push(normalizedUrl);
            }
          }
        });
        if (imageUrls.length > 0) break;
      }

      logger.info(`Found ${imageUrls.length} images in Chapter ${chapter.number}`);
      
      if (imageUrls.length === 0) {
        // Try alternative approach - look for any img tags
        $('img').each((_, element) => {
          const src = $(element).attr('src');
          if (src && (src.includes('manga') || src.includes('chapter') || src.includes('page')) && !src.includes('avatar')) {
            if (!imageUrls.includes(src)) {
              imageUrls.push(src);
            }
          }
        });
        
        if (imageUrls.length === 0) {
          throw new Error('No images found in chapter after trying all selectors');
        }
      }

      // Create chapter directory
      const chapterDir = path.join(process.cwd(), 'temp', `Chapter_${chapter.number.toString().padStart(3, '0')}`);
      await fs.mkdir(chapterDir, { recursive: true });
      
      // Download images with better error handling
      const downloadedImages = [];
      const maxRetries = 3;
      
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        const imageName = `page_${(i + 1).toString().padStart(3, '0')}.jpg`;
        const imagePath = path.join(chapterDir, imageName);
        
        let downloaded = false;
        for (let retry = 0; retry < maxRetries && !downloaded; retry++) {
          try {
            if (imageUrl.startsWith('data:image')) {
              // Handle base64 images
              const base64Data = imageUrl.split(',')[1];
              await fs.writeFile(imagePath, base64Data, 'base64');
              downloaded = true;
            } else {
              // Download from URL
              const imageResponse = await axios({
                method: 'GET',
                url: imageUrl,
                responseType: 'stream',
                timeout: 30000,
                headers: {
                  'User-Agent': this.headers['User-Agent'],
                  'Referer': chapter.url,
                  'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                }
              });
              
              const writer = fsSync.createWriteStream(imagePath);
              imageResponse.data.pipe(writer);
              
              await new Promise<void>((resolve, reject) => {
                writer.on('finish', () => resolve());
                writer.on('error', reject);
              });
              
              // Verify file was created and has content
              const stats = await fs.stat(imagePath);
              if (stats.size > 0) {
                downloaded = true;
              }
            }
            
            if (downloaded) {
              const stats = await fs.stat(imagePath);
              downloadedImages.push({
                page: i + 1,
                path: imagePath,
                url: imageUrl,
                size: stats.size
              });
              
              logger.info(`Downloaded image ${i + 1}/${imageUrls.length} for Chapter ${chapter.number} (${stats.size} bytes)`);
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
    url: string,
    options: DownloadOptions = {}
  ): Promise<DownloadResult> {
    const startTime = Date.now();
    
    try {
      // Get webtoon information
      logger.info('Fetching webtoon information...');
      const webtoonInfo = await this.getWebtoonInfo(url);
      
      // Get chapter list
      logger.info('Fetching chapter list...');
      const allChapters = await this.getChapterList(url);
      
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
      logger.info('Cleaning up Tachiyomi downloader...');
      
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
      
      logger.info('Tachiyomi downloader cleanup completed');
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }
}

export default TachiyomiDownloader;
