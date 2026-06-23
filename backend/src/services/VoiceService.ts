import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import logger from '../config/logger';

class VoiceService {
  private xttsApiUrl: string;

  constructor() {
    this.xttsApiUrl = process.env.XTTS_API_URL || 'http://localhost:8000';
  }

  async cloneVoice(audioFilePath: string, voiceProfileId: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('audio', fs.createReadStream(audioFilePath));
      formData.append('voice_id', voiceProfileId);

      const response = await axios.post(`${this.xttsApiUrl}/api/clone`, formData, {
        headers: formData.getHeaders(),
        timeout: 300000,
      });

      logger.info(`Voice cloned successfully: ${voiceProfileId}`);
      return response.data.embedding_path;
    } catch (error) {
      logger.error('Voice cloning error:', error);
      throw new Error('Failed to clone voice');
    }
  }

  async generateSpeech(
    text: string,
    voiceProfileId: string,
    outputPath: string
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${this.xttsApiUrl}/api/tts`,
        {
          text,
          voice_id: voiceProfileId,
          language: 'en',
        },
        {
          responseType: 'arraybuffer',
          timeout: 120000,
        }
      );

      fs.writeFileSync(outputPath, response.data);
      logger.info(`Speech generated: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('Speech generation error:', error);
      throw new Error('Failed to generate speech');
    }
  }

  async generateNarration(
    scriptSegments: any[],
    voiceProfileId: string,
    outputDir: string
  ): Promise<string[]> {
    const audioFiles: string[] = [];

    for (let i = 0; i < scriptSegments.length; i++) {
      const segment = scriptSegments[i];
      const outputPath = path.join(outputDir, `segment_${i + 1}.wav`);

      try {
        await this.generateSpeech(segment.narration, voiceProfileId, outputPath);
        audioFiles.push(outputPath);
      } catch (error) {
        logger.error(`Failed to generate narration for segment ${i + 1}:`, error);
        throw error;
      }
    }

    return audioFiles;
  }

  async analyzeAudio(audioFilePath: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('audio', fs.createReadStream(audioFilePath));

      const response = await axios.post(`${this.xttsApiUrl}/api/analyze`, formData, {
        headers: formData.getHeaders(),
      });

      return response.data;
    } catch (error) {
      logger.error('Audio analysis error:', error);
      return {
        duration: 0,
        sampleRate: 22050,
        channels: 1,
      };
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.xttsApiUrl}/health`);
      return response.status === 200;
    } catch (error) {
      logger.error('XTTS health check failed:', error);
      return false;
    }
  }

  async concatenateAudio(audioFiles: string[], outputPath: string): Promise<string> {
    try {
      const response = await axios.post(`${this.xttsApiUrl}/api/concatenate`, {
        audio_files: audioFiles,
        output_path: outputPath,
      });

      return response.data.output_path;
    } catch (error) {
      logger.error('Audio concatenation error:', error);
      throw new Error('Failed to concatenate audio files');
    }
  }
}

export default new VoiceService();
