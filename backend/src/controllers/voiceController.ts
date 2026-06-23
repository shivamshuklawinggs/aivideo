import { Request, Response, NextFunction } from 'express';
import VoiceProfile from '../models/VoiceProfile';
import logger from '../config/logger';

// Get voice profiles for user
export const fetchVoiceProfiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const userId = (req as any).user.id;

    const voiceProfiles = await VoiceProfile.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await VoiceProfile.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        voiceProfiles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error('Fetch voice profiles error:', error);
    return next(error);
  }
};

// Get voice profile by ID
export const fetchVoiceProfileById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const voiceProfile = await VoiceProfile.findOne({ _id: id, userId });

    if (!voiceProfile) {
      return res.status(404).json({
        success: false,
        message: 'Voice profile not found',
      });
    }

    return res.json({
      success: true,
      data: { voiceProfile },
    });
  } catch (error: any) {
    logger.error('Fetch voice profile by ID error:', error);
    return next(error);
  }
};

// Upload voice sample
export const uploadVoiceSample = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const voiceFile = req.file;

    if (!voiceFile) {
      return res.status(400).json({
        success: false,
        message: 'Voice sample file is required',
      });
    }

    // Trigger voice processing job
    const queueManager = await import('../queues/QueueManager');
    
    await queueManager.queueManager.addGenerateVoiceJob({
      voiceSamplePath: voiceFile.path,
      userId,
      filename: voiceFile.originalname,
    });

    logger.info(`Voice sample uploaded: ${voiceFile.originalname} by user ${userId}`);

    return res.status(201).json({
      success: true,
      message: 'Voice sample uploaded successfully',
      data: {
        filename: voiceFile.originalname,
        path: voiceFile.path,
      },
    });
  } catch (error: any) {
    logger.error('Upload voice sample error:', error);
    return next(error);
  }
};

// Create voice profile
export const createVoiceProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { name, description, voiceSamplePath } = req.body;

    const voiceProfile = new VoiceProfile({
      name,
      description,
      voiceSamplePath,
      userId,
      status: 'processing',
      isDefault: false,
      usageCount: 0,
    });

    await voiceProfile.save();

    logger.info(`Voice profile created: ${name} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Voice profile created successfully',
      data: { voiceProfile },
    });
  } catch (error: any) {
    logger.error('Create voice profile error:', error);
    return next(error);
  }
};

// Update voice profile
export const updateVoiceProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const updates = req.body;

    const voiceProfile = await VoiceProfile.findOne({ _id: id, userId });
    if (!voiceProfile) {
      return res.status(404).json({
        success: false,
        message: 'Voice profile not found',
      });
    }

    // If setting as default, unset other default profiles
    if (updates.isDefault) {
      await VoiceProfile.updateMany(
        { userId, isDefault: true },
        { isDefault: false }
      );
    }

    Object.assign(voiceProfile, updates);
    await voiceProfile.save();

    return res.json({
      success: true,
      message: 'Voice profile updated successfully',
      data: { voiceProfile },
    });
  } catch (error: any) {
    logger.error('Update voice profile error:', error);
    return next(error);
  }
};

// Delete voice profile
export const deleteVoiceProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const voiceProfile = await VoiceProfile.findOne({ _id: id, userId });
    if (!voiceProfile) {
      return res.status(404).json({
        success: false,
        message: 'Voice profile not found',
      });
    }

    await VoiceProfile.findByIdAndDelete(id);

    logger.info(`Voice profile deleted: ${id}`);

    return res.json({
      success: true,
      message: 'Voice profile deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete voice profile error:', error);
    return next(error);
  }
};

// Clone voice profile
export const cloneVoiceProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { name } = req.body;

    const originalProfile = await VoiceProfile.findOne({ _id: id, userId });
    if (!originalProfile) {
      return res.status(404).json({
        success: false,
        message: 'Original voice profile not found',
      });
    }

    const clonedProfile = new VoiceProfile({
      name,
      description: `Cloned from ${originalProfile.name}`,
      sampleAudioPath: originalProfile.sampleAudioPath,
      userId,
      status: originalProfile.status,
      isDefault: false,
      usageCount: 0,
      voiceCharacteristics: { ...originalProfile.voiceCharacteristics },
      metadata: { ...originalProfile.metadata },
    });

    await clonedProfile.save();

    logger.info(`Voice profile cloned: ${name} by user ${userId}`);

    return res.status(201).json({
      success: true,
      message: 'Voice profile cloned successfully',
      data: { voiceProfile: clonedProfile },
    });
  } catch (error: any) {
    logger.error('Clone voice profile error:', error);
    return next(error);
  }
};

// Test voice profile
export const testVoiceProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { text } = req.body;

    const voiceProfile = await VoiceProfile.findOne({ _id: id, userId });
    if (!voiceProfile) {
      return res.status(404).json({
        success: false,
        message: 'Voice profile not found',
      });
    }

    // Trigger voice synthesis job
    const queueManager = await import('../queues/QueueManager');
    
    await queueManager.queueManager.addGenerateVoiceJob({
      voiceProfileId: id,
      text,
      userId,
      isTest: true,
    });

    logger.info(`Voice test started for profile: ${id}`);

    return res.json({
      success: true,
      message: 'Voice test started',
    });
  } catch (error: any) {
    logger.error('Test voice profile error:', error);
    return next(error);
  }
};

// Analyze voice sample
export const analyzeVoiceSample = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const voiceFile = req.file;

    if (!voiceFile) {
      return res.status(400).json({
        success: false,
        message: 'Voice sample file is required',
      });
    }

    // Placeholder for voice analysis
    const analysis = {
      gender: 'neutral',
      ageRange: 'adult',
      accent: 'neutral',
      tone: 'neutral',
      duration: 0,
      sampleRate: 44100,
      bitrate: 128,
      format: 'mp3',
      fileSize: voiceFile.size,
    };

    logger.info(`Voice sample analyzed: ${voiceFile.originalname} by user ${userId}`);

    return res.json({
      success: true,
      message: 'Voice sample analyzed successfully',
      data: { analysis },
    });
  } catch (error: any) {
    logger.error('Analyze voice sample error:', error);
    return next(error);
  }
};

// Get voice presets
export const getVoicePresets = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const presets = [
      { id: 'male-deep', name: 'Male Deep Voice', description: 'Deep, masculine voice' },
      { id: 'male-medium', name: 'Male Medium Voice', description: 'Standard male voice' },
      { id: 'male-high', name: 'Male High Voice', description: 'Higher-pitched male voice' },
      { id: 'female-low', name: 'Female Low Voice', description: 'Lower-pitched female voice' },
      { id: 'female-medium', name: 'Female Medium Voice', description: 'Standard female voice' },
      { id: 'female-high', name: 'Female High Voice', description: 'Higher-pitched female voice' },
      { id: 'child', name: 'Child Voice', description: 'Child-like voice' },
      { id: 'elderly-male', name: 'Elderly Male', description: 'Older male voice' },
      { id: 'elderly-female', name: 'Elderly Female', description: 'Older female voice' },
    ];

    return res.json({
      success: true,
      data: { presets },
    });
  } catch (error: any) {
    logger.error('Get voice presets error:', error);
    return next(error);
  }
};
