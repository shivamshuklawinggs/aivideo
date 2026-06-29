import Webtoon from '../models/Webtoon';
import Chapter from '../models/Chapter';
import Panel from '../models/Panel';
import ArchiveService from '../services/ArchiveService';
import MinIOClient from '../config/minio';
import logger from '../config/logger';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { rabbitMQService } from '../config/rabbitmq/rabbitmq.service';
import { QUEUE_NAMES, EXCHANGE_NAMES, ROUTING_KEYS } from '../config/rabbitmq/constants';

interface ExtractComicJobData {
  webtoonId: string;
  jobId?: string;
}

class RabbitMQExtractComicWorker {
  constructor() {
    this.initializeConsumer();
  }

  private async initializeConsumer(): Promise<void> {
    await rabbitMQService.consumeMessages(
      QUEUE_NAMES.EXTRACT_COMIC,
      async (message) => {
        await this.processExtractComic(message);
      }
    );

    logger.info('RabbitMQ Extract Comic Worker consumer initialized');
  }

  private async processExtractComic(jobData: ExtractComicJobData): Promise<void> {
    const { webtoonId, jobId } = jobData;

    try {
      logger.info(`Starting comic extraction for webtoon: ${webtoonId}`);

      const webtoon = await Webtoon.findById(webtoonId);
      if (!webtoon) {
        throw new Error('Webtoon not found');
      }

      webtoon.processingStatus = 'extracting';
      await webtoon.save();

      const extractPath = path.join(
        process.cwd(),
        'storage',
        'extracted',
        webtoonId.toString()
      );

      await ArchiveService.extractArchive(webtoon.archiveFilePath, extractPath);

      webtoon.extractedPath = extractPath;
      webtoon.processingStatus = 'processing';
      webtoon.processingProgress = 30;
      await webtoon.save();

      const chapters = await ArchiveService.detectChapters(extractPath);

      webtoon.processingProgress = 50;
      await webtoon.save();

      let totalPanels = 0;

      for (let i = 0; i < chapters.length; i++) {
        const chapterData = chapters[i];

        const chapter = await Chapter.create({
          webtoonId: webtoon._id,
          userId: webtoon.userId,
          chapterNumber: chapterData.chapterNumber,
          title: chapterData.title,
          panelCount: chapterData.panelCount,
          sequence: chapterData.sequence,
          folderPath: chapterData.folderPath,
          processingStatus: 'processing',
        });

        for (let j = 0; j < chapterData.panels.length; j++) {
          const panelData = chapterData.panels[j];

          const thumbnailPath = await this.generateThumbnail(
            panelData.imagePath,
            extractPath
          );

          const imageUrl = await this.uploadToMinIO(
            panelData.imagePath,
            `webtoons/${webtoonId}/chapters/${chapter._id}/panels/${panelData.fileName}`
          );

          const thumbnailUrl = thumbnailPath
            ? await this.uploadToMinIO(
                thumbnailPath,
                `webtoons/${webtoonId}/chapters/${chapter._id}/thumbnails/${panelData.fileName}`
              )
            : undefined;

          const imageMetadata = await this.getImageMetadata(panelData.imagePath);

          await Panel.create({
            chapterId: chapter._id,
            webtoonId: webtoon._id,
            userId: webtoon.userId,
            panelNumber: panelData.panelNumber,
            sequence: panelData.sequence,
            imageUrl,
            imagePath: panelData.imagePath,
            thumbnailUrl,
            metadata: imageMetadata,
            isProcessed: true,
          });

          totalPanels++;
        }

        chapter.isProcessed = true;
        chapter.processingStatus = 'completed';
        await chapter.save();

        const progress = 50 + ((i + 1) / chapters.length) * 40;
        webtoon.processingProgress = progress;
        await webtoon.save();
      }

      webtoon.totalChapters = chapters.length;
      webtoon.metadata.totalPanels = totalPanels;
      webtoon.metadata.averagePanelsPerChapter = totalPanels / chapters.length;
      webtoon.isProcessed = true;
      webtoon.processingStatus = 'completed';
      webtoon.processingProgress = 100;
      await webtoon.save();

      logger.info(`Comic extraction completed for webtoon: ${webtoonId}`);
      
      // Optionally publish completion message
      await this.publishCompletionMessage({
        success: true,
        webtoonId,
        totalChapters: chapters.length,
        totalPanels,
        jobId
      });

    } catch (error: any) {
      logger.error(`Comic extraction failed for webtoon ${webtoonId}:`, error);

      await Webtoon.findByIdAndUpdate(webtoonId, {
        processingStatus: 'failed',
        errorMessage: error.message,
      });

      // Optionally publish failure message
      await this.publishCompletionMessage({
        success: false,
        webtoonId,
        error: error.message,
        jobId
      });
    }
  }

  private async generateThumbnail(imagePath: string, outputDir: string): Promise<string> {
    try {
      const thumbnailPath = path.join(
        outputDir,
        'thumbnails',
        `thumb_${path.basename(imagePath)}`
      );

      const thumbnailDir = path.dirname(thumbnailPath);
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }

      await sharp(imagePath).resize(300, 400, { fit: 'inside' }).toFile(thumbnailPath);

      return thumbnailPath;
    } catch (error) {
      logger.error('Thumbnail generation error:', error);
      return '';
    }
  }

  private async uploadToMinIO(filePath: string, objectName: string): Promise<string> {
    try {
      await MinIOClient.uploadFile(objectName, filePath);
      return await MinIOClient.getPresignedUrl(objectName, 7 * 24 * 3600);
    } catch (error) {
      logger.error('MinIO upload error:', error);
      throw error;
    }
  }

  private async getImageMetadata(imagePath: string): Promise<any> {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = fs.statSync(imagePath);

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        fileSize: stats.size,
        aspectRatio: metadata.width && metadata.height ? metadata.width / metadata.height : 1,
      };
    } catch (error) {
      logger.error('Image metadata extraction error:', error);
      return {};
    }
  }

  private async publishCompletionMessage(result: any): Promise<void> {
    // Optionally publish completion/failure message to a results queue
    try {
      await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.AI_VIDEO,
        'ai-video.extract-comic.completed',
        result
      );
    } catch (error) {
      logger.error('Failed to publish completion message:', error);
    }
  }

  // Method to add a new job (for external use)
  async addJob(webtoonId: string): Promise<{ id: string }> {
    const jobId = `extract_comic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const jobData: ExtractComicJobData = {
      webtoonId,
      jobId
    };

    const success = await rabbitMQService.produceMessage(
      EXCHANGE_NAMES.AI_VIDEO,
      ROUTING_KEYS.AI_VIDEO.EXTRACT_COMIC,
      jobData
    );

    if (!success) {
      throw new Error('Failed to publish extract comic job to RabbitMQ');
    }

    logger.info(`Added extract comic job ${jobId} for webtoon: ${webtoonId}`);
    return { id: jobId };
  }

  async close(): Promise<void> {
    await rabbitMQService.closeConnection();
    logger.info('RabbitMQ Extract Comic Worker closed');
  }
}

// Export singleton instance
export default new RabbitMQExtractComicWorker();
