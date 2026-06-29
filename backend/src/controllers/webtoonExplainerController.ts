import { Request, Response, NextFunction } from 'express';
import Webtoon from '../models/Webtoon';
import Chapter from '../models/Chapter';
import Panel from '../models/Panel';
import GeneratedScript from '../models/GeneratedScript';
import OllamaService from '../services/OllamaService';
import { rabbitMQService } from '../config/rabbitmq/rabbitmq.service';
import { ROUTING_KEYS } from '../config/rabbitmq/constants';
import logger from '../config/logger';

// Upload webtoon and start explanation workflow
export const uploadWebtoonForExplanation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, author, genres } = req.body;
    const userId = req.user?.id;
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Archive file is required' 
      });
    }

    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }

    // Create webtoon record
    const webtoon = new Webtoon({
      title,
      description: description || '',
      author: author || 'Unknown',
      genres: genres || [],
      userId,
      archiveFilePath: req.file.path,
      processingStatus: 'uploading',
      processingProgress: 0,
      totalChapters: 0,
      isProcessed: false,
      metadata: {
        totalPanels: 0,
        averagePanelsPerChapter: 0
      }
    });

    await webtoon.save();

    // Start the explanation workflow
    await rabbitMQService.produceMessage(
      'ai-video-exchange',
      ROUTING_KEYS.AI_VIDEO.UPLOAD_ARCHIVE,
      {
        webtoonId: webtoon._id,
        archivePath: req.file.path,
        userId
      }
    );

    logger.info(`Started webtoon explanation workflow for: ${webtoon._id}`);

    return res.status(201).json({
      success: true,
      message: 'Webtoon uploaded successfully. Explanation workflow started.',
      data: {
        webtoonId: webtoon._id,
        title: webtoon.title,
        processingStatus: webtoon.processingStatus,
        processingProgress: webtoon.processingProgress
      }
    });

  } catch (error) {
    logger.error('Upload webtoon for explanation failed:', error);
    return next(error);
  }
};

// Update webtoon with new chapters
export const updateWebtoonWithNewChapters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { webtoonId } = req.params;
    const { title, description, author, genres } = req.body;
    const userId = req.user?.id;
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Archive file is required for updating webtoon' 
      });
    }

    // Find existing webtoon
    const webtoon = await Webtoon.findOne({ _id: webtoonId, userId });
    if (!webtoon) {
      return res.status(404).json({ 
        success: false, 
        message: 'Webtoon not found' 
      });
    }

    // Update webtoon metadata if provided
    if (title) webtoon.title = title;
    if (description) webtoon.description = description;
    if (author) webtoon.author = author;
    if (genres) webtoon.genres = genres;

    // Update processing status for new chapter addition
    webtoon.processingStatus = 'pending';
    webtoon.processingProgress = 0;
    webtoon.archiveFilePath = req.file.path;
    await webtoon.save();

    // Start the update workflow
    await rabbitMQService.produceMessage(
      'ai-video-exchange',
      ROUTING_KEYS.AI_VIDEO.UPLOAD_ARCHIVE,
      {
        webtoonId: webtoon._id,
        archivePath: req.file.path,
        userId,
        isUpdate: true // Flag to indicate this is an update
      }
    );

    logger.info(`Started webtoon update workflow for: ${webtoon._id}`);

    return res.status(200).json({
      success: true,
      message: 'Webtoon update started. New chapters will be processed and added.',
      data: {
        webtoonId: webtoon._id,
        title: webtoon.title,
        processingStatus: webtoon.processingStatus,
        processingProgress: webtoon.processingProgress,
        totalChapters: webtoon.totalChapters
      }
    });

  } catch (error) {
    logger.error('Update webtoon with new chapters failed:', error);
    return next(error);
  }
};

// Get webtoon explanation status
export const getExplanationStatus = async (req: Request, res: Response, next: NextFunction) => {
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

    // Get generated script if available
    let generatedScript = null;
    if (webtoon.processingStatus === 'completed') {
      generatedScript = await GeneratedScript.findOne({ webtoonId });
    }

    return res.status(200).json({
      success: true,
      data: {
        webtoonId: webtoon._id,
        title: webtoon.title,
        processingStatus: webtoon.processingStatus,
        processingProgress: webtoon.processingProgress,
        totalChapters: webtoon.totalChapters,
        totalPanels: webtoon.metadata.totalPanels,
        errorMessage: webtoon.errorMessage,
        generatedScript: generatedScript ? {
          id: generatedScript._id,
          createdAt: generatedScript.createdAt
        } : null
      }
    });

  } catch (error) {
    logger.error('Get explanation status failed:', error);
    return next(error);
  }
};

// Get generated explanation
export const getExplanation = async (req: Request, res: Response, next: NextFunction) => {
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

    if (webtoon.processingStatus !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Explanation not ready yet. Current status: ' + webtoon.processingStatus 
      });
    }

    const generatedScript = await GeneratedScript.findOne({ webtoonId });
    if (!generatedScript) {
      return res.status(404).json({ 
        success: false, 
        message: 'Generated explanation not found' 
      });
    }

    // Get chapters and panels for context
    const chapters = await Chapter.find({ webtoonId }).sort({ chapterNumber: 1 });
    const panels = await Panel.find({ webtoonId }).sort({ sequence: 1 });

    return res.status(200).json({
      success: true,
      data: {
        webtoon: {
          id: webtoon._id,
          title: webtoon.title,
          description: webtoon.description,
          author: webtoon.author,
          genres: webtoon.genres
        },
        explanation: {
          hook: generatedScript.hook,
          summary: generatedScript.summary,
          detailedExplanation: generatedScript.detailedExplanation,
          ending: generatedScript.ending,
          scriptSegments: generatedScript.scriptSegments
        },
        metadata: generatedScript.metadata,
        characters: generatedScript.characters,
        keyEvents: generatedScript.keyEvents,
        emotions: generatedScript.emotions,
        chapters: chapters.map(chapter => ({
          id: chapter._id,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          panelCount: chapter.panelCount
        })),
        panels: panels.map(panel => ({
          id: panel._id,
          panelNumber: panel.panelNumber,
          sequence: panel.sequence,
          imageUrl: panel.imageUrl
        }))
      }
    });

  } catch (error) {
    logger.error('Get explanation failed:', error);
    return next(error);
  }
};

// Generate voice explanation
export const generateVoiceExplanation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { webtoonId } = req.params;
    const { voiceSampleId } = req.body;
    const userId = req.user?.id;

    const webtoon = await Webtoon.findOne({ _id: webtoonId, userId });
    if (!webtoon) {
      return res.status(404).json({ 
        success: false, 
        message: 'Webtoon not found' 
      });
    }

    if (webtoon.processingStatus !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Explanation not ready yet. Current status: ' + webtoon.processingStatus 
      });
    }

    const generatedScript = await GeneratedScript.findOne({ webtoonId });
    if (!generatedScript) {
      return res.status(404).json({ 
        success: false, 
        message: 'Generated explanation not found' 
      });
    }

    // Generate voice explanation using the detailed explanation
    const voiceExplanation = await OllamaService.generateVoiceExplanation(
      generatedScript.detailedExplanation,
      voiceSampleId
    );

    return res.status(200).json({
      success: true,
      message: 'Voice explanation generated successfully',
      data: {
        audioData: voiceExplanation.audioData,
        voiceSample: {
          id: voiceExplanation.voiceSample.id,
          name: voiceExplanation.voiceSample.name,
          description: voiceExplanation.voiceSample.description
        },
        duration: voiceExplanation.duration
      }
    });

  } catch (error) {
    logger.error('Generate voice explanation failed:', error);
    return next(error);
  }
};

// Get available voice samples
export const getVoiceSamples = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const voiceSamples = OllamaService.getAvailableVoiceSamples();
    
    return res.status(200).json({
      success: true,
      data: voiceSamples
    });

  } catch (error) {
    logger.error('Get voice samples failed:', error);
    return next(error);
  }
};

// Get recommended voice sample
export const getRecommendedVoiceSample = async (req: Request, res: Response, next: NextFunction) => {
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

    // Get context for recommendation
    const context = {
      type: 'explanation' as const,
      gender: undefined,
      ageRange: 'adult' as const
    };

    const recommendedSample = OllamaService.getRecommendedVoiceSample(context);

    if (!recommendedSample) {
      return res.status(404).json({ 
        success: false, 
        message: 'No voice sample available' 
      });
    }

    return res.status(200).json({
      success: true,
      data: recommendedSample
    });

  } catch (error) {
    logger.error('Get recommended voice sample failed:', error);
    return next(error);
  }
};

// Generate narration script
export const generateNarrationScript = async (req: Request, res: Response, next: NextFunction) => {
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

    if (webtoon.processingStatus !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Explanation not ready yet. Current status: ' + webtoon.processingStatus 
      });
    }

    // Get panels for narration
    const panels = await Panel.find({ webtoonId }).sort({ sequence: 1 });

    // Generate narration script
    const narrationScript = await OllamaService.generateNarrationScript(
      panels,
      webtoon
    );

    return res.status(200).json({
      success: true,
      message: 'Narration script generated successfully',
      data: {
        narrationScript,
        webtoonInfo: {
          title: webtoon.title,
          description: webtoon.description,
          author: webtoon.author,
          genres: webtoon.genres
        }
      }
    });

  } catch (error) {
    logger.error('Generate narration script failed:', error);
    return next(error);
  }
};
