const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const archiver = require('archiver');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const Joi = require('joi');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 5, // Number of requests
  duration: 60, // Per 60 seconds
});

// Rate limiting middleware
const rateLimitMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000)
    });
  }
};

// Validation schemas
const downloadRequestSchema = Joi.object({
  url: Joi.string().uri().required(),
  chapters: Joi.array().items(Joi.number().integer().positive()).optional(),
  format: Joi.string().valid('zip', 'cbz').default('zip'),
  quality: Joi.string().valid('low', 'medium', 'high').default('high')
});

// MangaFire Downloader Class
class MangaFireDownloader {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    logger.info('Initializing browser for web scraping...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    this.page = await this.browser.newPage();
    
    // Set user agent and viewport
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    logger.info('Browser initialized successfully');
  }

  async getWebtoonInfo(url) {
    try {
      logger.info(`Fetching webtoon info from: ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      
      // Extract webtoon information
      const webtoonInfo = await this.page.evaluate(() => {
        const title = document.querySelector('h1.entry-title')?.textContent?.trim() || 
                     document.querySelector('.post-title h1')?.textContent?.trim() ||
                     document.querySelector('h1')?.textContent?.trim();
        
        const description = document.querySelector('.entry-content')?.textContent?.trim() ||
                          document.querySelector('.description')?.textContent?.trim() ||
                          document.querySelector('.summary')?.textContent?.trim();
        
        const author = document.querySelector('.author')?.textContent?.trim() ||
                      document.querySelector('.post-content_item:contains("Author") .summary-content')?.textContent?.trim();
        
        const genres = Array.from(document.querySelectorAll('.genres a, .genre a'))
          .map(genre => genre.textContent.trim())
          .filter(Boolean);
        
        const coverImage = document.querySelector('.summary_image img')?.src ||
                         document.querySelector('.cover img')?.src ||
                         document.querySelector('.poster img')?.src;
        
        return {
          title,
          description,
          author,
          genres,
          coverImage,
          url: window.location.href
        };
      });
      
      logger.info(`Webtoon info retrieved: ${webtoonInfo.title}`);
      return webtoonInfo;
    } catch (error) {
      logger.error('Error fetching webtoon info:', error);
      throw new Error('Failed to fetch webtoon information');
    }
  }

  async getChapterList(url) {
    try {
      logger.info('Fetching chapter list...');
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      
      // Wait for chapter list to load
      await this.page.waitForSelector('.listing-chapters_wrap, .chapter-list, .wp-manga-chapter', { timeout: 10000 });
      
      const chapters = await this.page.evaluate(() => {
        const chapterElements = document.querySelectorAll('.listing-chapters_wrap .wp-manga-chapter, .chapter-list .chapter-item, .chapter-item');
        
        return Array.from(chapterElements).map((chapter, index) => {
          const chapterLink = chapter.querySelector('a');
          const chapterNumber = index + 1;
          const chapterTitle = chapter.querySelector('.chapter-num, .entry-title')?.textContent?.trim() ||
                              `Chapter ${chapterNumber}`;
          
          return {
            number: chapterNumber,
            title: chapterTitle,
            url: chapterLink?.href,
            releaseDate: chapter.querySelector('.chapter-release-date, .post-on')?.textContent?.trim()
          };
        }).reverse(); // Reverse to get chronological order
      });
      
      logger.info(`Found ${chapters.length} chapters`);
      return chapters;
    } catch (error) {
      logger.error('Error fetching chapter list:', error);
      throw new Error('Failed to fetch chapter list');
    }
  }

  async downloadChapter(chapter, quality = 'high') {
    try {
      logger.info(`Downloading Chapter ${chapter.number}: ${chapter.title}`);
      
      if (!chapter.url) {
        throw new Error('Chapter URL not found');
      }
      
      await this.page.goto(chapter.url, { waitUntil: 'networkidle2' });
      
      // Wait for images to load
      await this.page.waitForSelector('.reading-content img, .chapter-content img, .manga-page img', { timeout: 10000 });
      
      // Extract image URLs
      const imageUrls = await this.page.evaluate(() => {
        const images = document.querySelectorAll('.reading-content img, .chapter-content img, .manga-page img');
        return Array.from(images).map(img => img.src).filter(src => 
          src && (src.includes('http') || src.includes('data:image'))
        );
      });
      
      logger.info(`Found ${imageUrls.length} images in Chapter ${chapter.number}`);
      
      // Create chapter directory
      const chapterDir = path.join('/app/temp', `Chapter_${chapter.number.toString().padStart(3, '0')}`);
      await fs.ensureDir(chapterDir);
      
      // Download images
      const downloadedImages = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        const imageName = `page_${(i + 1).toString().padStart(3, '0')}.jpg`;
        const imagePath = path.join(chapterDir, imageName);
        
        try {
          if (imageUrl.startsWith('data:image')) {
            // Handle base64 images
            const base64Data = imageUrl.split(',')[1];
            await fs.writeFile(imagePath, base64Data, 'base64');
          } else {
            // Download from URL
            const response = await axios({
              method: 'GET',
              url: imageUrl,
              responseType: 'stream',
              timeout: 30000
            });
            
            const writer = fs.createWriteStream(imagePath);
            response.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });
          }
          
          downloadedImages.push({
            page: i + 1,
            path: imagePath,
            url: imageUrl
          });
          
          logger.info(`Downloaded image ${i + 1}/${imageUrls.length} for Chapter ${chapter.number}`);
        } catch (error) {
          logger.error(`Failed to download image ${i + 1} for Chapter ${chapter.number}:`, error.message);
        }
      }
      
      return {
        chapterNumber: chapter.number,
        title: chapter.title,
        images: downloadedImages,
        directory: chapterDir
      };
    } catch (error) {
      logger.error(`Error downloading Chapter ${chapter.number}:`, error);
      throw new Error(`Failed to download Chapter ${chapter.number}: ${error.message}`);
    }
  }

  async createArchive(chapters, format = 'zip', webtoonTitle) {
    try {
      logger.info(`Creating ${format.toUpperCase()} archive for ${chapters.length} chapters...`);
      
      const archiveName = `${webtoonTitle.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
      const archivePath = path.join('/app/downloads', archiveName);
      const output = fs.createWriteStream(archivePath);
      const archive = archiver(format, { zlib: { level: 9 } });
      
      return new Promise((resolve, reject) => {
        output.on('close', () => {
          logger.info(`Archive created: ${archiveName} (${archive.pointer()} bytes)`);
          resolve({
            path: archivePath,
            name: archiveName,
            size: archive.pointer()
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
    } catch (error) {
      logger.error('Error creating archive:', error);
      throw new Error('Failed to create archive');
    }
  }

  async cleanup() {
    try {
      logger.info('Cleaning up temporary files...');
      await fs.emptyDir('/app/temp');
      if (this.browser) {
        await this.browser.close();
      }
      logger.info('Cleanup completed');
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }
}

// API Routes
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Webtoon Downloader Service is running' });
});

app.post('/download', rateLimitMiddleware, async (req, res) => {
  const downloader = new MangaFireDownloader();
  
  try {
    // Validate request
    const { error, value } = downloadRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters',
        details: error.details
      });
    }
    
    const { url, chapters, format, quality } = value;
    
    // Initialize downloader
    await downloader.initialize();
    
    // Get webtoon information
    const webtoonInfo = await downloader.getWebtoonInfo(url);
    
    // Get chapter list
    const allChapters = await downloader.getChapterList(url);
    
    // Filter chapters if specified
    const chaptersToDownload = chapters && chapters.length > 0 
      ? allChapters.filter(ch => chapters.includes(ch.number))
      : allChapters;
    
    logger.info(`Downloading ${chaptersToDownload.length} chapters out of ${allChapters.length} total`);
    
    // Download chapters
    const downloadedChapters = [];
    for (const chapter of chaptersToDownload) {
      try {
        const downloadedChapter = await downloader.downloadChapter(chapter, quality);
        downloadedChapters.push(downloadedChapter);
      } catch (error) {
        logger.error(`Failed to download Chapter ${chapter.number}:`, error);
        // Continue with other chapters
      }
    }
    
    if (downloadedChapters.length === 0) {
      throw new Error('No chapters were successfully downloaded');
    }
    
    // Create archive
    const archive = await downloader.createArchive(downloadedChapters, format, webtoonInfo.title);
    
    // Cleanup
    await downloader.cleanup();
    
    res.json({
      success: true,
      message: 'Webtoon downloaded successfully',
      data: {
        webtoon: webtoonInfo,
        archive: {
          name: archive.name,
          size: archive.size,
          downloadUrl: `/download/${archive.name}`
        },
        chapters: {
          total: allChapters.length,
          downloaded: downloadedChapters.length,
          requested: chaptersToDownload.length
        }
      }
    });
    
  } catch (error) {
    logger.error('Download error:', error);
    await downloader.cleanup();
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to download webtoon'
    });
  }
});

app.get('/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('/app/downloads', filename);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.download(filePath, filename);
  } catch (error) {
    logger.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file'
    });
  }
});

app.get('/info', rateLimitMiddleware, async (req, res) => {
  const downloader = new MangaFireDownloader();
  
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL parameter is required'
      });
    }
    
    await downloader.initialize();
    
    const webtoonInfo = await downloader.getWebtoonInfo(url);
    const chapters = await downloader.getChapterList(url);
    
    await downloader.cleanup();
    
    res.json({
      success: true,
      data: {
        webtoon: webtoonInfo,
        chapters: chapters
      }
    });
    
  } catch (error) {
    logger.error('Info error:', error);
    await downloader.cleanup();
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch webtoon information'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Webtoon Downloader Service started on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
