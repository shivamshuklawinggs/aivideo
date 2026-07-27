import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import VoiceRecording from '../models/VoiceRecording';
import logger from '../config/logger';

class UploadController {
  // POST /api/upload-audio
  async uploadAudio(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No audio file uploaded',
        });
      }

      const uploadDir = path.join(process.cwd(), 'storage', 'voice-recordings');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileId = uuidv4();
      const fileExtension = path.extname(req.file.originalname) || '.wav';
      const fileName = `${fileId}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);

      // Move the uploaded file to storage
      fs.renameSync(req.file.path, filePath);

      // Get the file URL
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:5000';
      const fileUrl = `${protocol}://${host}/storage/voice-recordings/${fileName}`;

      // Get chapterId and pageId from request body
      const { chapterId, pageId } = req.body;

      let recording = null;
      
      // Save to database if chapterId and pageId are provided
      if (chapterId && pageId !== undefined) {
        recording = await VoiceRecording.findOneAndUpdate(
          { chapterId, pageId: parseInt(pageId) },
          {
            chapterId,
            pageId: parseInt(pageId),
            audioFile: `/storage/voice-recordings/${fileName}`,
            duration: 0,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        logger.info(`Voice recording saved to database: chapterId=${chapterId}, pageId=${pageId}`);
      }

      logger.info(`Audio file uploaded: ${fileName}`);

      res.json({
        success: true,
        data: {
          filePath: `/storage/voice-recordings/${fileName}`,
          fileUrl,
          fileName,
          recording,
        },
      });
    } catch (error) {
      logger.error('Failed to upload audio:', error);
      return next(error);
    }
  }
}

export default new UploadController();
