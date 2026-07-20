import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import VoiceService from '../services/VoiceService';
import VoiceSampleService from '../services/VoiceSampleService';
import logger from '../config/logger';

class VoiceController {
  // GET /api/voice/samples
  async getSamples(_req: Request, res: Response, next: NextFunction) {
    try {
      const samples = VoiceSampleService.getAllVoiceSamples().map((sample) => ({
        ...sample,
        fileExists: VoiceSampleService.voiceSampleFileExists(sample),
      }));

      res.json({
        success: true,
        data: { samples },
      });
    } catch (error) {
      logger.error('Get voice samples failed:', error);
      return next(error);
    }
  }

  // POST /api/voice/clone
  async cloneVoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { sampleId } = req.body;
      if (!sampleId) {
        return res.status(400).json({
          success: false,
          message: 'sampleId is required',
        });
      }

      const sample = VoiceSampleService.getVoiceSampleForAI(sampleId);
      if (!sample) {
        return res.status(404).json({
          success: false,
          message: 'Voice sample not found or audio file missing',
        });
      }

      const filePath = VoiceSampleService.getVoiceSampleFilePath(sample);
      const voiceProfileId = `vp_${sample.id}_${uuidv4().slice(0, 8)}`;

      const embeddingPath = await VoiceService.cloneVoice(filePath, voiceProfileId);

      res.json({
        success: true,
        data: {
          voiceProfileId,
          embeddingPath,
          sample,
        },
      });
    } catch (error) {
      logger.error('Clone voice failed:', error);
      return next(error);
    }
  }

  // POST /api/voice/narrate
  async narrate(req: Request, res: Response, next: NextFunction) {
    try {
      const { voiceProfileId, segments, language = 'en' } = req.body;

      if (!voiceProfileId) {
        return res.status(400).json({
          success: false,
          message: 'voiceProfileId is required',
        });
      }
      if (!Array.isArray(segments) || segments.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'segments array is required',
        });
      }

      const outputDir = path.join(process.cwd(), 'storage', 'narrations', voiceProfileId);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const audioFiles: { segmentIndex: number; url: string }[] = [];
      for (let i = 0; i < segments.length; i++) {
        const text = typeof segments[i] === 'string' ? segments[i] : segments[i].text;
        if (!text || !text.trim()) continue;

        const outputPath = path.join(outputDir, `segment_${i + 1}.wav`);
        await VoiceService.generateSpeech(text, voiceProfileId, outputPath, language);

        const relativeUrl = `/storage/narrations/${voiceProfileId}/segment_${i + 1}.wav`;
        audioFiles.push({ segmentIndex: i, url: relativeUrl });
      }

      res.json({
        success: true,
        data: {
          audioFiles,
          voiceProfileId,
          language,
        },
      });
    } catch (error) {
      logger.error('Narrate failed:', error);
      return next(error);
    }
  }
}

export default new VoiceController();
