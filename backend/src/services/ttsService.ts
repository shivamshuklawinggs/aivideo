import axios, { AxiosInstance } from 'axios';
import fs from 'fs-extra';
import path from 'path';
import logger from '../config/logger';

export interface TTSOptions {
  text: string;
  outputPath: string;
  speakerId?: string;
  language?: string;
  speed?: number;
}

export interface TTSResult {
  filePath: string;
  duration: number; // seconds
  format: string;
}

class TTSService {
  private client: AxiosInstance;
  private xttsUrl: string;
  private outputDir: string;

  constructor() {
    this.xttsUrl = process.env.XTTS_API_URL || 'http://localhost:8000';
    this.outputDir = path.resolve(process.env.VIDEO_OUTPUT_DIR || './storage/videos');

    this.client = axios.create({
      baseURL: this.xttsUrl,
      timeout: 120000, // 2 min for TTS
    });

    fs.ensureDirSync(this.outputDir);
    logger.info(`TTS Service initialized: url=${this.xttsUrl}`);
  }

  /**
   * Generate narration audio from text using XTTS
   */
  async generateNarration(options: TTSOptions): Promise<TTSResult> {
    const { text, outputPath, speakerId, language = 'en', speed = 1.0 } = options;

    try {
      // First try XTTS API
      const result = await this.generateWithXTTS(text, outputPath, speakerId, language, speed);
      return result;
    } catch (xttsError: any) {
      logger.warn(`XTTS failed, trying fallback: ${xttsError.message}`);
      // Fallback: try edge-tts style or return estimated duration
      return this.generateFallback(text, outputPath);
    }
  }

  /**
   * Generate audio using XTTS API
   */
  private async generateWithXTTS(
    text: string,
    outputPath: string,
    speakerId?: string,
    language: string = 'en',
    speed: number = 1.0
  ): Promise<TTSResult> {
    const response = await this.client.post('/tts_to_audio/', {
      text,
      speaker_wav: speakerId || 'default',
      language,
      speed,
    }, {
      responseType: 'arraybuffer',
    });

    const audioBuffer = Buffer.from(response.data);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, audioBuffer);

    // Estimate duration from buffer size (WAV: ~176400 bytes/sec at 44.1kHz 16bit stereo)
    const duration = this.estimateDuration(audioBuffer.length, 'wav');

    logger.info(`XTTS audio generated: ${outputPath} (${duration.toFixed(1)}s)`);
    return { filePath: outputPath, duration, format: 'wav' };
  }

  /**
   * Fallback: estimate audio duration from text length
   * Average speaking rate: ~150 words per minute
   */
  private async generateFallback(text: string, outputPath: string): Promise<TTSResult> {
    const wordCount = text.split(/\s+/).length;
    const duration = (wordCount / 150) * 60; // seconds

    // Create a silent WAV placeholder so the pipeline can continue
    const silentWav = this.createSilentWav(duration);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, silentWav);

    logger.warn(`TTS fallback: generated silent placeholder (${duration.toFixed(1)}s) at ${outputPath}`);
    return { filePath: outputPath, duration, format: 'wav' };
  }

  /**
   * Generate narration for entire chapter (segment by panel)
   */
  async generateChapterNarration(
    segments: string[],
    chapterId: number
  ): Promise<{ files: TTSResult[]; totalDuration: number; combinedFile: string }> {
    const chapterDir = path.join(this.outputDir, 'chapters', String(chapterId), 'audio');
    await fs.ensureDir(chapterDir);

    const files: TTSResult[] = [];
    let totalDuration = 0;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment.trim()) continue;

      const outputPath = path.join(chapterDir, `segment_${String(i).padStart(3, '0')}.wav`);
      const result = await this.generateNarration({ text: segment, outputPath });
      files.push(result);
      totalDuration += result.duration;

      logger.info(`TTS segment ${i + 1}/${segments.length}: ${result.duration.toFixed(1)}s`);
    }

    // Combine all segments into one file
    const combinedFile = path.join(chapterDir, 'narration_full.wav');
    await this.combineAudioFiles(files.map(f => f.filePath), combinedFile);

    logger.info(`Chapter narration complete: ${totalDuration.toFixed(1)}s total, ${files.length} segments`);
    return { files, totalDuration, combinedFile };
  }

  /**
   * Combine multiple WAV files into one (simple concatenation for same-format files)
   */
  private async combineAudioFiles(inputFiles: string[], outputPath: string): Promise<void> {
    if (inputFiles.length === 0) return;

    if (inputFiles.length === 1) {
      await fs.copy(inputFiles[0], outputPath);
      return;
    }

    // Simple binary concatenation for WAV (skip headers of subsequent files)
    // For production, you'd use FFmpeg here
    const buffers: Buffer[] = [];
    for (let i = 0; i < inputFiles.length; i++) {
      const data = await fs.readFile(inputFiles[i]);
      if (i === 0) {
        buffers.push(data); // Keep full first file with header
      } else {
        buffers.push(data.subarray(44)); // Skip WAV header (44 bytes)
      }
    }

    const combined = Buffer.concat(buffers);
    // Update the data size in the WAV header
    const dataSize = combined.length - 44;
    combined.writeUInt32LE(dataSize + 36, 4); // RIFF chunk size
    combined.writeUInt32LE(dataSize, 40); // data chunk size

    await fs.writeFile(outputPath, combined);
  }

  /**
   * Create a silent WAV file of specified duration
   */
  private createSilentWav(durationSec: number): Buffer {
    const sampleRate = 44100;
    const channels = 1;
    const bitsPerSample = 16;
    const numSamples = Math.ceil(sampleRate * durationSec);
    const dataSize = numSamples * channels * (bitsPerSample / 8);
    const headerSize = 44;

    const buffer = Buffer.alloc(headerSize + dataSize);

    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(dataSize + 36, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // fmt chunk size
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28); // byte rate
    buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32); // block align
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    // Data is already zeroed (silence)

    return buffer;
  }

  /**
   * Estimate audio duration from buffer size
   */
  private estimateDuration(bufferSize: number, format: string): number {
    switch (format) {
      case 'wav':
        // 44100 Hz, 16-bit, mono = 88200 bytes/sec; stereo = 176400 bytes/sec
        return Math.max(0, (bufferSize - 44) / 88200);
      case 'mp3':
        // ~16000 bytes/sec at 128kbps
        return bufferSize / 16000;
      default:
        return bufferSize / 88200;
    }
  }

  /**
   * Health check for TTS service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/');
      return true;
    } catch {
      return false;
    }
  }
}

export default new TTSService();
