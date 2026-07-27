import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import VoiceRecording from '../models/VoiceRecording';
import logger from '../config/logger';

class VoiceRecordingController {
  // POST /api/voice-recordings
  async saveRecording(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId, pageId, audioFile, duration } = req.body;

      if (!chapterId || pageId === undefined || !audioFile) {
        return res.status(400).json({
          success: false,
          message: 'chapterId, pageId, and audioFile are required',
        });
      }

      // Find existing recording or create new one
      const recording = await VoiceRecording.findOneAndUpdate(
        { chapterId, pageId },
        {
          chapterId,
          pageId,
          audioFile,
          duration: duration || 0,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      logger.info(`Voice recording saved: chapterId=${chapterId}, pageId=${pageId}`);

      res.json({
        success: true,
        data: recording,
      });
    } catch (error) {
      logger.error('Failed to save voice recording:', error);
      return next(error);
    }
  }

  // GET /api/voice-recordings/:chapterId
  async getChapterRecordings(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId } = req.params;

      const recordings = await VoiceRecording.find({ chapterId }).sort({ pageId: 1 });

      res.json({
        success: true,
        data: recordings,
      });
    } catch (error) {
      logger.error('Failed to get chapter recordings:', error);
      return next(error);
    }
  }

  // GET /api/voice-recordings/:chapterId/:pageId
  async getPageRecording(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId } = req.params;
      const pageId = parseInt(req.params.pageId);

      const recording = await VoiceRecording.findOne({
        chapterId,
        pageId,
      });

      if (!recording) {
        return res.status(404).json({
          success: false,
          message: 'Recording not found',
        });
      }

      res.json({
        success: true,
        data: recording,
      });
    } catch (error) {
      logger.error('Failed to get page recording:', error);
      return next(error);
    }
  }

  // DELETE /api/voice-recordings/:chapterId/:pageId
  async deleteRecording(req: Request, res: Response, next: NextFunction) {
    try {
      const { chapterId } = req.params;
      const pageId = parseInt(req.params.pageId);

      const recording = await VoiceRecording.findOne({
        chapterId,
        pageId,
      });

      if (!recording) {
        return res.status(404).json({
          success: false,
          message: 'Recording not found',
        });
      }

      // Delete the audio file if it exists
      if (recording.audioFile) {
        const audioPath = path.join(process.cwd(), recording.audioFile);
        if (fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
        }
      }

      await VoiceRecording.deleteOne({ chapterId, pageId });

      logger.info(`Voice recording deleted: chapterId=${chapterId}, pageId=${pageId}`);

      res.json({
        success: true,
        message: 'Recording deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete voice recording:', error);
      return next(error);
    }
  }
}

export default new VoiceRecordingController();
