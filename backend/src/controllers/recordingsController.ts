import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs-extra';
import recordingsService from '../services/recordingsService';
import { toNumericId } from '../utils/numericId';
import logger from '../config/logger';

class RecordingsController {
  // GET /api/recordings/chapters/:chapterId/panels
  async getChapterPanels(req: Request, res: Response, next: NextFunction) {
    try {
      const chapterId = toNumericId(req.params.chapterId);
      const panels = await recordingsService.getChapterPanels(chapterId);
      res.json({ success: true, data: panels });
    } catch (error) {
      logger.error('Failed to get chapter panels:', error);
      next(error);
    }
  }

  // GET /api/recordings/chapters/:chapterId/session
  async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const chapterId = toNumericId(req.params.chapterId);
      const mangaId = req.query.mangaId ? toNumericId(req.query.mangaId) : undefined;
      const sessionData = await recordingsService.getOrCreateSession(chapterId, mangaId);
      res.json({ success: true, data: sessionData });
    } catch (error) {
      logger.error('Failed to get recording session:', error);
      next(error);
    }
  }

  // POST /api/recordings
  async saveRecording(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Audio file is required' });
      }

      const chapterId = toNumericId(req.body.chapterId);
      const mangaId = req.body.mangaId ? toNumericId(req.body.mangaId) : undefined;
      const { panelId, panelOrder } = req.body;

      if (!chapterId || !panelId || panelOrder === undefined) {
        await fs.remove(req.file.path);
        return res.status(400).json({ success: false, message: 'chapterId, panelId, and panelOrder are required' });
      }

      const recording = await recordingsService.saveRecording(
        {
          chapterId,
          mangaId,
          panelId,
          panelOrder: parseInt(panelOrder, 10),
          audioFile: req.file.path,
          duration: 0,
          fileSize: req.file.size,
        },
        req.file.path
      );

      return res.json({ success: true, data: recording });
    } catch (error: any) {
      if (req.file?.path) await fs.remove(req.file.path).catch(() => {});
      logger.error('Failed to save recording:', error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  // PUT /api/recordings/:panelId
  async updateRecording(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Audio file is required' });
      }

      const chapterId = toNumericId(req.body.chapterId);
      const mangaId = req.body.mangaId ? toNumericId(req.body.mangaId) : undefined;
      const panelId = req.params.panelId;
      const panelOrder = req.body.panelOrder;

      if (!chapterId || !panelId || panelOrder === undefined) {
        await fs.remove(req.file.path);
        return res.status(400).json({ success: false, message: 'chapterId, panelId, and panelOrder are required' });
      }

      const recording = await recordingsService.saveRecording(
        {
          chapterId,
          mangaId,
          panelId,
          panelOrder: parseInt(panelOrder, 10),
          audioFile: req.file.path,
          duration: 0,
          fileSize: req.file.size,
        },
        req.file.path
      );

      return res.json({ success: true, data: recording });
    } catch (error: any) {
      if (req.file?.path) await fs.remove(req.file.path).catch(() => {});
      logger.error('Failed to update recording:', error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/recordings/:panelId
  async deleteRecording(req: Request, res: Response, next: NextFunction) {
    try {
      const chapterId = toNumericId(req.query.chapterId);
      const panelId = req.params.panelId;

      if (!chapterId || !panelId) {
        return res.status(400).json({ success: false, message: 'chapterId and panelId are required' });
      }

      await recordingsService.deleteRecording(chapterId, panelId);
      return res.json({ success: true, message: 'Recording deleted successfully' });
    } catch (error) {
      logger.error('Failed to delete recording:', error);
      return next(error);
    }
  }

  // POST /api/recordings/chapters/:chapterId/panels/:panelId/skip
  async skipPanel(req: Request, res: Response, next: NextFunction) {
    try {
      const chapterId = toNumericId(req.params.chapterId);
      const panelId = req.params.panelId;

      if (!chapterId || !panelId) {
        return res.status(400).json({ success: false, message: 'chapterId and panelId are required' });
      }

      await recordingsService.skipPanel(chapterId, panelId);
      return res.json({ success: true, message: 'Panel skipped' });
    } catch (error) {
      logger.error('Failed to skip panel:', error);
      return next(error);
    }
  }

  // POST /api/recordings/chapters/:chapterId/merge
  async mergeChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const chapterId = toNumericId(req.params.chapterId);
      const merged = await recordingsService.queueMerge(chapterId);
      res.status(202).json({
        success: true,
        message: 'Merge job queued',
        data: merged,
      });
    } catch (error) {
      logger.error('Failed to queue merge:', error);
      next(error);
    }
  }

  // GET /api/recordings/chapters/:chapterId/merge-status
  async getMergeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const chapterId = toNumericId(req.params.chapterId);
      const status = await recordingsService.getMergeStatus(chapterId);
      res.json({ success: true, data: status });
    } catch (error) {
      logger.error('Failed to get merge status:', error);
      next(error);
    }
  }

  // GET /api/recordings/chapters/:chapterId/audio
  async getChapterAudio(req: Request, res: Response, next: NextFunction) {
    try {
      const chapterId = toNumericId(req.params.chapterId);
      const filePath = await recordingsService.getMergedAudio(chapterId);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="chapter-${chapterId}.mp3"`);
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      logger.error('Failed to get chapter audio:', error);
      next(error);
    }
  }

  // GET /api/recordings/chapters/:chapterId/timestamps
  async getTimestamps(req: Request, res: Response, next: NextFunction) {
    try {
      const chapterId = toNumericId(req.params.chapterId);
      const timestamps = await recordingsService.getTimestamps(chapterId);
      res.json({ success: true, data: timestamps });
    } catch (error) {
      logger.error('Failed to get timestamps:', error);
      next(error);
    }
  }

  // GET /api/recordings/chapters/:chapterId/recordings
  async listRecordings(req: Request, res: Response, next: NextFunction) {
    try {
      const chapterId = toNumericId(req.params.chapterId);
      const recordings = await recordingsService.listRecordings(chapterId);
      res.json({ success: true, data: recordings });
    } catch (error) {
      logger.error('Failed to list recordings:', error);
      next(error);
    }
  }
}

export default new RecordingsController();
