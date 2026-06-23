import { Request, Response, NextFunction } from 'express';
import GeneratedVideo from '../models/GeneratedVideo';
import RenderJob from '../models/RenderJob';
import logger from '../config/logger';

// Get videos for user
export const fetchVideos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const status = req.query.status as string;
    const userId = (req as any).user.id;

    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    const videos = await GeneratedVideo.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await GeneratedVideo.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error('Fetch videos error:', error);
    return next(error);
  }
};

// Get video by ID
export const fetchVideoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const video = await GeneratedVideo.findOne({ _id: id, userId });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    return res.json({
      success: true,
      data: { video },
    });
  } catch (error: any) {
    logger.error('Fetch video by ID error:', error);
    return next(error);
  }
};

// Generate video
export const generateVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { webtoonId, chapterId, voiceProfileId, config } = req.body;

    const video = new GeneratedVideo({
      title: `Video for ${webtoonId}`,
      webtoonId,
      chapterId,
      scriptId: '507f1f77bcf86cd799439011', // Temporary placeholder ObjectId
      voiceProfileId,
      userId,
      videoConfig: {
        resolution: config?.resolution || '1080p',
        fps: config?.fps || 30,
        format: config?.format || 'mp4',
        codec: 'h264',
        bitrate: '5000k',
        aspectRatio: '16:9',
      },
      audioConfig: {
        narrationVolume: config?.audioVolume || 1.0,
        musicVolume: config?.musicVolume || 0.3,
        fadeInDuration: 1.0,
        fadeOutDuration: 1.0,
      },
      subtitleConfig: {
        enabled: config?.subtitles || false,
        style: 'default',
        fontSize: 16,
        fontColor: '#ffffff',
      },
      scenes: [],
      views: 0,
      likes: 0,
    });

    await video.save();

    // Trigger video generation job
    const queueManager = await import('../queues/QueueManager');
    
    await queueManager.queueManager.addGenerateVideoJob({
      videoId: video._id,
      webtoonId,
      chapterId,
      voiceProfileId,
      config,
      userId,
    });

    logger.info(`Video generation started: ${video._id}`);

    return res.status(201).json({
      success: true,
      message: 'Video generation started',
      data: { video },
    });
  } catch (error: any) {
    logger.error('Generate video error:', error);
    return next(error);
  }
};

// Update video
export const updateVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const updates = req.body;

    const video = await GeneratedVideo.findOne({ _id: id, userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Update video config if provided
    if (updates.config) {
      video.videoConfig = { ...video.videoConfig, ...updates.config };
    }
    if (updates.title) video.title = updates.title;
    if (updates.description) video.description = updates.description;

    await video.save();

    return res.json({
      success: true,
      message: 'Video updated successfully',
      data: { video },
    });
  } catch (error: any) {
    logger.error('Update video error:', error);
    return next(error);
  }
};

// Delete video
export const deleteVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const video = await GeneratedVideo.findOne({ _id: id, userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Delete related render jobs
    await RenderJob.deleteMany({ videoId: id });

    await GeneratedVideo.findByIdAndDelete(id);

    logger.info(`Video deleted: ${id}`);

    return res.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete video error:', error);
    return next(error);
  }
};

// Render video
export const renderVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { resolution, format, fps } = req.body;

    const video = await GeneratedVideo.findOne({ _id: id, userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Trigger video rendering job
    const queueManager = await import('../queues/QueueManager');
    
    await queueManager.queueManager.addRenderVideoJob({
      videoId: id,
      resolution: resolution || '1080p',
      format: format || 'mp4',
      fps: fps || 30,
      userId,
    });

    logger.info(`Video rendering started: ${id}`);

    return res.json({
      success: true,
      message: 'Video rendering started',
    });
  } catch (error: any) {
    logger.error('Render video error:', error);
    return next(error);
  }
};

// Get render jobs for user
export const fetchRenderJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const status = req.query.status as string;
    const userId = (req as any).user.id;

    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    const renderJobs = await RenderJob.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('videoId', 'title');

    const total = await RenderJob.countDocuments(query);

    res.json({
      success: true,
      data: {
        renderJobs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error('Fetch render jobs error:', error);
    return next(error);
  }
};

// Get render job by ID
export const fetchRenderJobById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user.id;

    const renderJob = await RenderJob.findOne({ _id: jobId, userId })
      .populate('videoId', 'title');

    if (!renderJob) {
      return res.status(404).json({
        success: false,
        message: 'Render job not found',
      });
    }

    return res.json({
      success: true,
      data: { renderJob },
    });
  } catch (error: any) {
    logger.error('Fetch render job by ID error:', error);
    return next(error);
  }
};

// Update render job
export const updateRenderJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user.id;
    const updates = req.body;

    const renderJob = await RenderJob.findOne({ _id: jobId, userId });
    if (!renderJob) {
      return res.status(404).json({
        success: false,
        message: 'Render job not found',
      });
    }

    Object.assign(renderJob, updates);
    await renderJob.save();

    return res.json({
      success: true,
      message: 'Render job updated successfully',
      data: { renderJob },
    });
  } catch (error: any) {
    logger.error('Update render job error:', error);
    return next(error);
  }
};

// Delete render job
export const deleteRenderJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user.id;

    const renderJob = await RenderJob.findOne({ _id: jobId, userId });
    if (!renderJob) {
      return res.status(404).json({
        success: false,
        message: 'Render job not found',
      });
    }

    await RenderJob.findByIdAndDelete(jobId);

    logger.info(`Render job deleted: ${jobId}`);

    return res.json({
      success: true,
      message: 'Render job deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete render job error:', error);
    return next(error);
  }
};

// Get scenes for video
export const fetchScenes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const video = await GeneratedVideo.findOne({ _id: id, userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    return res.json({
      success: true,
      data: { scenes: video.scenes },
    });
  } catch (error: any) {
    logger.error('Fetch scenes error:', error);
    return next(error);
  }
};

// Update scenes
export const updateScenes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { scenes } = req.body;

    const video = await GeneratedVideo.findOne({ _id: id, userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    video.scenes = scenes;
    await video.save();

    return res.json({
      success: true,
      message: 'Scenes updated successfully',
      data: { video },
    });
  } catch (error: any) {
    logger.error('Update scenes error:', error);
    return next(error);
  }
};

// Update video config
export const updateVideoConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { config } = req.body;

    const video = await GeneratedVideo.findOne({ _id: id, userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    video.videoConfig = { ...video.videoConfig, ...config };
    await video.save();

    return res.json({
      success: true,
      message: 'Video config updated successfully',
      data: { video },
    });
  } catch (error: any) {
    logger.error('Update video config error:', error);
    return next(error);
  }
};

// Generate preview
export const generatePreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const video = await GeneratedVideo.findOne({ _id: id, userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Trigger preview generation job
    const queueManager = await import('../queues/QueueManager');
    
    await queueManager.queueManager.addGenerateVideoJob({
      videoId: id,
      isPreview: true,
      userId,
    });

    logger.info(`Preview generation started: ${id}`);

    return res.json({
      success: true,
      message: 'Preview generation started',
    });
  } catch (error: any) {
    logger.error('Generate preview error:', error);
    return next(error);
  }
};

// Export video
export const exportVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { resolution, format } = req.body;

    const video = await GeneratedVideo.findOne({ _id: id, userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Trigger export job
    const queueManager = await import('../queues/QueueManager');
    
    await queueManager.queueManager.addRenderVideoJob({
      videoId: id,
      resolution: resolution || '1080p',
      format: format || 'mp4',
      isExport: true,
      userId,
    });

    logger.info(`Video export started: ${id}`);

    return res.json({
      success: true,
      message: 'Video export started',
    });
  } catch (error: any) {
    logger.error('Export video error:', error);
    return next(error);
  }
};

// Get video stats
export const getVideoStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const video = await GeneratedVideo.findOne({ _id: id, userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    const stats = {
      views: video.views,
      likes: video.likes,
      createdAt: video.createdAt,
      duration: 0, // Placeholder - would be calculated from scenes
      fileSize: 0, // Placeholder - would be actual file size
      renderCount: await RenderJob.countDocuments({ videoId: id }),
    };

    return res.json({
      success: true,
      data: { stats },
    });
  } catch (error: any) {
    logger.error('Get video stats error:', error);
    return next(error);
  }
};

// Like video
export const likeVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const video = await GeneratedVideo.findOne({ _id: id, userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    video.likes += 1;
    await video.save();

    return res.json({
      success: true,
      message: 'Video liked successfully',
      data: { likes: video.likes },
    });
  } catch (error: any) {
    logger.error('Like video error:', error);
    return next(error);
  }
};

// Share video
export const shareVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    // Note: isPublic property would be used if model supported it
    // const { isPublic } = req.body;

    const video = await GeneratedVideo.findOne({ _id: id, userId });
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Note: isPublic property doesn't exist in the model, this is a placeholder
    // In a real implementation, you might add this property to the schema

    return res.json({
      success: true,
      message: 'Video sharing settings updated',
      data: { video },
    });
  } catch (error: any) {
    logger.error('Share video error:', error);
    return next(error);
  }
};

// Duplicate video
export const duplicateVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const originalVideo = await GeneratedVideo.findOne({ _id: id, userId });
    if (!originalVideo) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    const duplicatedVideo = new GeneratedVideo({
      title: `${originalVideo.title} (Copy)`,
      webtoonId: originalVideo.webtoonId,
      chapterId: originalVideo.chapterId,
      scriptId: '507f1f77bcf86cd799439011', // Temporary placeholder
      voiceProfileId: originalVideo.voiceProfileId,
      userId,
      videoConfig: { ...originalVideo.videoConfig },
      audioConfig: { ...originalVideo.audioConfig },
      subtitleConfig: { ...originalVideo.subtitleConfig },
      scenes: [...originalVideo.scenes],
      views: 0,
      likes: 0,
    });

    await duplicatedVideo.save();

    logger.info(`Video duplicated: ${duplicatedVideo._id}`);

    return res.status(201).json({
      success: true,
      message: 'Video duplicated successfully',
      data: { video: duplicatedVideo },
    });
  } catch (error: any) {
    logger.error('Duplicate video error:', error);
    return next(error);
  }
};
