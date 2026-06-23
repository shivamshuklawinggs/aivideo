import { Worker, Job } from 'bullmq';
import Webtoon from '../models/Webtoon';
import Chapter from '../models/Chapter';
import Panel from '../models/Panel';
import ArchiveService from '../services/ArchiveService';
import MinIOClient from '../config/minio';
import logger from '../config/logger';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

import { redisConnectionConfig } from '../config/redisConnection';

const extractComicWorker = new Worker(
  'extract-comic',
  async (job: Job) => {
    const { webtoonId, } = job.data;

    try {
      logger.info(`Starting comic extraction for webtoon: ${webtoonId}`);
      await job.updateProgress(10);

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
      await job.updateProgress(30);

      webtoon.extractedPath = extractPath;
      webtoon.processingStatus = 'processing';
      await webtoon.save();

      const chapters = await ArchiveService.detectChapters(extractPath);
      await job.updateProgress(50);

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

          const thumbnailPath = await generateThumbnail(
            panelData.imagePath,
            extractPath
          );

          const imageUrl = await uploadToMinIO(
            panelData.imagePath,
            `webtoons/${webtoonId}/chapters/${chapter._id}/panels/${panelData.fileName}`
          );

          const thumbnailUrl = thumbnailPath
            ? await uploadToMinIO(
                thumbnailPath,
                `webtoons/${webtoonId}/chapters/${chapter._id}/thumbnails/${panelData.fileName}`
              )
            : undefined;

          const imageMetadata = await getImageMetadata(panelData.imagePath);

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
        await job.updateProgress(progress);
      }

      webtoon.totalChapters = chapters.length;
      webtoon.metadata.totalPanels = totalPanels;
      webtoon.metadata.averagePanelsPerChapter = totalPanels / chapters.length;
      webtoon.isProcessed = true;
      webtoon.processingStatus = 'completed';
      webtoon.processingProgress = 100;
      await webtoon.save();

      await job.updateProgress(100);

      logger.info(`Comic extraction completed for webtoon: ${webtoonId}`);
      return { success: true, webtoonId, totalChapters: chapters.length, totalPanels };
    } catch (error: any) {
      logger.error(`Comic extraction failed for webtoon ${webtoonId}:`, error);

      await Webtoon.findByIdAndUpdate(webtoonId, {
        processingStatus: 'failed',
        errorMessage: error.message,
      });

      throw error;
    }
  },
  { connection: redisConnectionConfig, concurrency: 2 }
);

async function generateThumbnail(imagePath: string, outputDir: string): Promise<string> {
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

async function uploadToMinIO(filePath: string, objectName: string): Promise<string> {
  try {
    await MinIOClient.uploadFile(objectName, filePath);
    return await MinIOClient.getPresignedUrl(objectName, 7 * 24 * 3600);
  } catch (error) {
    logger.error('MinIO upload error:', error);
    throw error;
  }
}

async function getImageMetadata(imagePath: string): Promise<any> {
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

extractComicWorker.on('completed', (job) => {
  logger.info(`Extract comic job ${job.id} completed`);
});

extractComicWorker.on('failed', (job, err) => {
  logger.error(`Extract comic job ${job?.id} failed:`, err);
});

export default extractComicWorker;
