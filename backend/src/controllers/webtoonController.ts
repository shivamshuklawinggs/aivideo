import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import Webtoon, { IWebtoon } from '../models/Webtoon';
import Chapter from '../models/Chapter';
import Panel from '../models/Panel';
import GeneratedScript from '../models/GeneratedScript';
import logger from '../config/logger';
import { Document } from 'mongoose';
import { rabbitMQQueueManager } from '../queues/RabbitMQQueueManager';
import { withTransactionRetry } from '../utils/database';
import { addUploadedFile, addCreatedFolder, createUploadsDir } from '../utils/fileCleanup';

// Get webtoons (paginated, with search)
export const fetchWebtoons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const search = req.query.search as string || '';
    const userId = req.user?.id;

    const query: any = {};
    if (userId) {
      query.userId = userId;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const webtoons = await Webtoon.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email');

    const total = await Webtoon.countDocuments(query);

    res.json({
      success: true,
      data: {
        webtoons,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error('Fetch webtoons error:', error);
    return next(error);
  }
};

// Get webtoon by ID
export const fetchWebtoonById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const webtoon = await Webtoon.findById(id)
      .populate('userId', 'name email')
      .populate({
        path: 'chapters',
        options: { sort: { chapterNumber: 1 } },
      });

    if (!webtoon) {
      return res.status(404).json({
        success: false,
        message: 'Webtoon not found',
      });
    }

    return res.json({
      success: true,
      data: { webtoon },
    });
  } catch (error: any) {
    logger.error('Fetch webtoon by ID error:', error);
    return next(error);
  }
};

// Upload webtoon
export const uploadWebtoon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { title, description, author, genres, tags } = req.body;
    const archiveFile = req.file;

    if (!archiveFile) {
      return res.status(400).json({
        success: false,
        message: 'Archive file is required',
      });
    }

    // Track uploaded file for cleanup on error
    addUploadedFile(req, {
      path: archiveFile.path,
      filename: archiveFile.filename,
      originalname: archiveFile.originalname
    });

    // Use transaction for database operations
    const result = await withTransactionRetry(async (session) => {
      // Create webtoon record
      const payload :Omit<IWebtoon,keyof Document>= {
        title,
        description,
        author,
        genres: genres || [],
        tags: tags || [],
        userId,
        archiveFileName: archiveFile.originalname,
        archiveFilePath: archiveFile.path,
        archiveFileSize: archiveFile.size,
        status: "ongoing",
        isPublic: false,
        views: 0,
        totalChapters: 0,
        metadata: {
          totalPanels: undefined,
          averagePanelsPerChapter: undefined,
          estimatedReadTime: undefined
        },
        isProcessed: false,
        processingStatus: 'completed',
        processingProgress: 0,
      };
      
      const webtoon = new Webtoon(payload);
      await webtoon.save({ session });

      // Trigger background job after successful transaction
      await rabbitMQQueueManager.addExtractComicJob({
        webtoonId: webtoon._id,
        archivePath: archiveFile.path,
        userId,
      });

      logger.info(`Webtoon uploaded: ${title} by user ${userId}`);
      return webtoon;
    });

    return res.status(201).json({
      success: true,
      message: 'Webtoon uploaded successfully',
      data: { webtoon: result },
    });
  } catch (error: any) {
    logger.error('Upload webtoon error:', error);
    return next(error);
  }
};

// Update webtoon
export const updateWebtoon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    const webtoon = await Webtoon.findOne({ _id: id, userId });
    if (!webtoon) {
      return res.status(404).json({
        success: false,
        message: 'Webtoon not found',
      });
    }

    Object.assign(webtoon, updates);
    await webtoon.save();

    return res.json({
      success: true,
      message: 'Webtoon updated successfully',
      data: { webtoon },
    });
  } catch (error: any) {
    logger.error('Update webtoon error:', error);
    return next(error);
  }
};

// Delete webtoon
export const deleteWebtoon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const webtoon = await Webtoon.findOne({ _id: id, userId });
    if (!webtoon) {
      return res.status(404).json({
        success: false,
        message: 'Webtoon not found',
      });
    }

    // Delete related chapters and panels
    await Chapter.deleteMany({ webtoonId: id });
    await Panel.deleteMany({ webtoonId: id });
    await GeneratedScript.deleteMany({ webtoonId: id });

    await Webtoon.findByIdAndDelete(id);

    logger.info(`Webtoon deleted: ${id}`);

    return res.json({
      success: true,
      message: 'Webtoon deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete webtoon error:', error);
    return next(error);
  }
};

// Get chapters for a webtoon
export const fetchChapters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { webtoonId } = req.params;
    
    const chapters = await Chapter.find({ webtoonId })
      .sort({ chapterNumber: 1 })
      .populate('panels');

    res.json({
      success: true,
      data: { chapters },
    });
  } catch (error: any) {
    logger.error('Fetch chapters error:', error);
    return next(error);
  }
};

// Get chapter by ID
export const fetchChapterById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { webtoonId, chapterId } = req.params;
    
    const chapter = await Chapter.findOne({ _id: chapterId, webtoonId })
      .populate('panels');

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    return res.json({
      success: true,
      data: { chapter },
    });
  } catch (error: any) {
    logger.error('Fetch chapter by ID error:', error);
    return next(error);
  }
};

// Update chapter
export const updateChapter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { webtoonId, chapterId } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    // Verify ownership
    const webtoon = await Webtoon.findOne({ _id: webtoonId, userId });
    if (!webtoon) {
      return res.status(404).json({
        success: false,
        message: 'Webtoon not found',
      });
    }

    const chapter = await Chapter.findOne({ _id: chapterId, webtoonId });
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    Object.assign(chapter, updates);
    await chapter.save();

    return res.json({
      success: true,
      message: 'Chapter updated successfully',
      data: { chapter },
    });
  } catch (error: any) {
    logger.error('Update chapter error:', error);
    return next(error);
  }
};

// Delete chapter
export const deleteChapter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { webtoonId, chapterId } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const webtoon = await Webtoon.findOne({ _id: webtoonId, userId });
    if (!webtoon) {
      return res.status(404).json({
        success: false,
        message: 'Webtoon not found',
      });
    }

    const chapter = await Chapter.findOne({ _id: chapterId, webtoonId });
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: 'Chapter not found',
      });
    }

    // Delete related panels
    await Panel.deleteMany({ chapterId });
    await GeneratedScript.deleteMany({ chapterId });

    await Chapter.findByIdAndDelete(chapterId);

    logger.info(`Chapter deleted: ${chapterId}`);

    return res.json({
      success: true,
      message: 'Chapter deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete chapter error:', error);
    return next(error);
  }
};

// Get panels for a chapter
export const fetchPanels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { webtoonId, chapterId } = req.params;
    
    const panels = await Panel.find({ webtoonId, chapterId })
      .sort({ panelNumber: 1 });

    res.json({
      success: true,
      data: { panels },
    });
  } catch (error: any) {
    logger.error('Fetch panels error:', error);
    return next(error);
  }
};

// Generate script for webtoon/chapter
export const generateScript = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { webtoonId } = req.params;
    const { chapterId, voiceProfileId, options } = req.body;
    const userId = req.user!.id;

    // Verify ownership
    const webtoon = await Webtoon.findOne({ _id: webtoonId, userId });
    if (!webtoon) {
      return res.status(404).json({
        success: false,
        message: 'Webtoon not found',
      });
    }

    // Trigger script generation job
    await rabbitMQQueueManager.addGenerateScriptJob({
      webtoonId,
      chapterId,
      voiceProfileId,
      options,
      userId,
    });

    logger.info(`Script generation started for webtoon: ${webtoonId}`);

    return res.json({
      success: true,
      message: 'Script generation started',
    });
  } catch (error: any) {
    logger.error('Generate script error:', error);
    return next(error);
  }
};

// Update metadata
export const updateMetadata = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    const webtoon = await Webtoon.findOne({ _id: id, userId });
    if (!webtoon) {
      return res.status(404).json({
        success: false,
        message: 'Webtoon not found',
      });
    }

    Object.assign(webtoon, updates);
    await webtoon.save();

    return res.json({
      success: true,
      message: 'Metadata updated successfully',
      data: { webtoon },
    });
  } catch (error: any) {
    logger.error('Update metadata error:', error);
    return next(error);
  }
};

// Toggle public status
export const togglePublic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const webtoon = await Webtoon.findOne({ _id: id, userId });
    if (!webtoon) {
      return res.status(404).json({
        success: false,
        message: 'Webtoon not found',
      });
    }

    webtoon.isPublic = !webtoon.isPublic;
    await webtoon.save();

    return res.json({
      success: true,
      message: `Webtoon is now ${webtoon.isPublic ? 'public' : 'private'}`,
      data: { webtoon },
    });
  } catch (error: any) {
    logger.error('Toggle public status error:', error);
    return next(error);
  }
};

// Increment views
export const incrementViews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const webtoon = await Webtoon.findById(id);
    if (!webtoon) {
      return res.status(404).json({
        success: false,
        message: 'Webtoon not found',
      });
    }

    webtoon.views += 1;
    await webtoon.save();

    return res.json({
      success: true,
      message: 'Views incremented',
      data: { views: webtoon.views },
    });
  } catch (error: any) {
    logger.error('Increment views error:', error);
    return next(error);
  }
};

// Create new chapter (optimized for 4GB RAM with transactions)
export const createChapter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { webtoonId } = req.params;
    const { title, description, chapterNumber } = req.body;
    const userId = req.user?.id;

    // Use transaction for all database operations
    const result = await withTransactionRetry(async (session) => {
      // Step 1: Validate webtoon exists and belongs to user
      const webtoon = await Webtoon.findOne({ _id: webtoonId, userId })
        .select('_id totalChapters')
        .session(session);
      
      if (!webtoon) {
        throw new Error('Webtoon not found');
      }

      // Step 2: Determine chapter number and sequence
      let nextChapterNumber = chapterNumber;
      let nextSequence = 1;
      
      if (!nextChapterNumber) {
        const lastChapter = await Chapter.findOne({ webtoonId })
          .select('chapterNumber sequence')
          .sort({ chapterNumber: -1 })
          .session(session)
          .lean();
        nextChapterNumber = lastChapter ? lastChapter.chapterNumber + 1 : 1;
        nextSequence = lastChapter ? lastChapter.sequence + 1 : 1;
      } else {
        // Get the next sequence number for the given chapter number
        const lastSequence = await Chapter.findOne({ webtoonId })
          .select('sequence')
          .sort({ sequence: -1 })
          .session(session)
          .lean();
        nextSequence = lastSequence ? lastSequence.sequence + 1 : 1;
      }

      // Step 3: Check if chapter number already exists
      const existingChapter = await Chapter.findOne({
        webtoonId,
        chapterNumber: nextChapterNumber,
      }).select('_id').session(session).lean();

      if (existingChapter) {
        throw new Error('Chapter number already exists');
      }

      // Step 4: Create folder path in uploads directory and clean if exists
      const folderPath = createUploadsDir('chapters', webtoonId, nextChapterNumber.toString());
      
      // Clean if exists (createUploadsDir already handles creation)
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
        // Recreate after cleanup
        fs.mkdirSync(folderPath, { recursive: true });
      }
      
      // Track created folder for cleanup on error
      addCreatedFolder(req, folderPath);

      // Step 6: Create new chapter with minimal memory footprint
      const chapter = new Chapter({
        webtoonId,
        title: title || `Chapter ${nextChapterNumber}`,
        description: description || '',
        chapterNumber: nextChapterNumber,
        sequence: nextSequence,
        panels: [], // Start with empty array to save memory
        isProcessed: false,
        processingStatus: 'pending',
        processingProgress: 0,
        userId: userId,
        folderPath: folderPath,
      });

      // Step 7: Save chapter to database within transaction
      await chapter.save({ session });

      // Step 8: Update webtoon chapter count efficiently within transaction
      await Webtoon.updateOne(
        { _id: webtoonId },
        { $inc: { totalChapters: 1 } },
        { session }
      );

      logger.info(`Chapter created: ${chapter._id} for webtoon: ${webtoonId}`);
      return chapter;
    });

    // Return minimal data to reduce memory usage
    return res.status(201).json({
      success: true,
      message: 'Chapter created successfully',
      data: { 
        chapter: {
          _id: result._id,
          title: result.title,
          chapterNumber: result.chapterNumber,
          sequence: result.sequence,
          description: result.description,
          webtoonId: result.webtoonId,
          folderPath: result.folderPath
        }
      },
    });
  } catch (error: any) {
    logger.error('Create chapter error:', error);
    return next(error);
  }
};
