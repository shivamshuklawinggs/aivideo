import fs from 'fs';
import logger from '../config/logger';

interface SubtitleWord {
  word: string;
  startTime: number;
  endTime: number;
}

interface SubtitleSegment {
  index: number;
  text: string;
  startTime: number;
  endTime: number;
  duration: number;
  words: SubtitleWord[];
}

class SubtitleService {
  async generateSubtitles(
    scriptSegments: any[],
  ): Promise<SubtitleSegment[]> {
    const segments: SubtitleSegment[] = [];
    let currentTime = 0;

    for (let i = 0; i < scriptSegments.length; i++) {
      const segment = scriptSegments[i];
      const duration = segment.duration || 5;
      
      const words = this.splitIntoWords(segment.narration);
      const wordTimings = this.calculateWordTimings(words, currentTime, duration);

      segments.push({
        index: i + 1,
        text: segment.narration,
        startTime: currentTime,
        endTime: currentTime + duration,
        duration,
        words: wordTimings,
      });

      currentTime += duration;
    }

    return segments;
  }

  private splitIntoWords(text: string): string[] {
    return text
      .split(/\s+/)
      .filter((word) => word.length > 0)
      .map((word) => word.trim());
  }

  private calculateWordTimings(
    words: string[],
    startTime: number,
    totalDuration: number
  ): SubtitleWord[] {
    const wordTimings: SubtitleWord[] = [];
    const wordDuration = totalDuration / words.length;

    for (let i = 0; i < words.length; i++) {
      const wordStart = startTime + i * wordDuration;
      const wordEnd = wordStart + wordDuration;

      wordTimings.push({
        word: words[i],
        startTime: wordStart,
        endTime: wordEnd,
      });
    }

    return wordTimings;
  }

  async exportToSRT(segments: SubtitleSegment[], outputPath: string): Promise<string> {
    try {
      let srtContent = '';

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        srtContent += `${i + 1}\n`;
        srtContent += `${this.formatSRTTime(segment.startTime)} --> ${this.formatSRTTime(
          segment.endTime
        )}\n`;
        srtContent += `${segment.text}\n\n`;
      }

      fs.writeFileSync(outputPath, srtContent, 'utf-8');
      logger.info(`SRT file created: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('SRT export error:', error);
      throw new Error('Failed to export SRT file');
    }
  }

  async exportToVTT(segments: SubtitleSegment[], outputPath: string): Promise<string> {
    try {
      let vttContent = 'WEBVTT\n\n';

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        vttContent += `${i + 1}\n`;
        vttContent += `${this.formatVTTTime(segment.startTime)} --> ${this.formatVTTTime(
          segment.endTime
        )}\n`;
        vttContent += `${segment.text}\n\n`;
      }

      fs.writeFileSync(outputPath, vttContent, 'utf-8');
      logger.info(`VTT file created: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('VTT export error:', error);
      throw new Error('Failed to export VTT file');
    }
  }

  async exportToJSON(segments: SubtitleSegment[], outputPath: string): Promise<string> {
    try {
      const jsonContent = JSON.stringify(segments, null, 2);
      fs.writeFileSync(outputPath, jsonContent, 'utf-8');
      logger.info(`JSON subtitle file created: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('JSON export error:', error);
      throw new Error('Failed to export JSON subtitle file');
    }
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${this.pad(hours, 2)}:${this.pad(minutes, 2)}:${this.pad(secs, 2)},${this.pad(
      ms,
      3
    )}`;
  }

  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${this.pad(hours, 2)}:${this.pad(minutes, 2)}:${this.pad(secs, 2)}.${this.pad(
      ms,
      3
    )}`;
  }

  private pad(num: number, size: number): string {
    let s = num.toString();
    while (s.length < size) s = '0' + s;
    return s;
  }

  async generateKaraokeSubtitles(segments: SubtitleSegment[]): Promise<any[]> {
    const karaokeData = [];

    for (const segment of segments) {
      karaokeData.push({
        startTime: segment.startTime,
        endTime: segment.endTime,
        text: segment.text,
        words: segment.words.map((word) => ({
          word: word.word,
          startTime: word.startTime,
          endTime: word.endTime,
          duration: word.endTime - word.startTime,
        })),
      });
    }

    return karaokeData;
  }
}

export default new SubtitleService();
