import fs from 'fs-extra';
import path from 'path';
import logger from '../config/logger';
import ChapterAnalysis from '../models/ChapterAnalysis';
import storyService from './storyService';

export interface TimelineEntry {
  panelIndex: number;
  startTime: number; // seconds
  endTime: number; // seconds
  duration: number; // seconds
  narrationSegment: string;
}

export interface SubtitleEntry {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

class TimelineService {
  private outputDir: string;
  private minPanelDuration: number;
  private maxPanelDuration: number;

  constructor() {
    this.outputDir = path.resolve(process.env.VIDEO_OUTPUT_DIR || './storage/videos');
    this.minPanelDuration = 3; // seconds
    this.maxPanelDuration = 15; // seconds
  }

  /**
   * Calculate timeline based on narration duration per panel
   */
  async generateTimeline(chapterId: number, audioDurations?: number[]): Promise<TimelineEntry[]> {
    const analysis = await ChapterAnalysis.findOne({ chapterId });
    if (!analysis || analysis.panels.length === 0) {
      throw new Error(`No analysis found for chapter ${chapterId}`);
    }

    const segments = await storyService.getNarrationSegments(chapterId);
    const panelCount = analysis.panels.length;
    const timeline: TimelineEntry[] = [];
    let currentTime = 0;

    for (let i = 0; i < panelCount; i++) {
      let duration: number;

      if (audioDurations && audioDurations[i]) {
        // Use actual audio duration + small buffer
        duration = audioDurations[i] + 0.5;
      } else {
        // Estimate from text length
        const segment = segments[i] || '';
        const wordCount = segment.split(/\s+/).length;
        duration = Math.max(this.minPanelDuration, Math.min((wordCount / 150) * 60 + 1, this.maxPanelDuration));
      }

      duration = Math.round(duration * 10) / 10; // Round to 0.1s

      timeline.push({
        panelIndex: i,
        startTime: Math.round(currentTime * 100) / 100,
        endTime: Math.round((currentTime + duration) * 100) / 100,
        duration,
        narrationSegment: segments[i] || '',
      });

      currentTime += duration;
    }

    // Save timeline to database
    await ChapterAnalysis.findOneAndUpdate(
      { chapterId },
      {
        $set: {
          timeline,
          totalDuration: currentTime,
        },
      }
    );

    logger.info(`Timeline generated for chapter ${chapterId}: ${panelCount} panels, ${currentTime.toFixed(1)}s total`);
    return timeline;
  }

  /**
   * Export timeline as JSON file
   */
  async exportTimelineJSON(chapterId: number): Promise<string> {
    const analysis = await ChapterAnalysis.findOne({ chapterId });
    if (!analysis || analysis.timeline.length === 0) {
      throw new Error(`No timeline found for chapter ${chapterId}`);
    }

    const chapterDir = path.join(this.outputDir, 'chapters', String(chapterId));
    await fs.ensureDir(chapterDir);

    const timelineData = {
      chapterId,
      totalDuration: analysis.totalDuration,
      panelCount: analysis.panelCount,
      entries: analysis.timeline.map((entry: any) => ({
        panel: entry.panelIndex + 1,
        start: this.formatTime(entry.startTime),
        end: this.formatTime(entry.endTime),
        duration: `${entry.duration.toFixed(1)}s`,
        narration: entry.narrationSegment,
      })),
    };

    const outputPath = path.join(chapterDir, 'timeline.json');
    await fs.writeJson(outputPath, timelineData, { spaces: 2 });

    logger.info(`Timeline JSON exported: ${outputPath}`);
    return outputPath;
  }

  /**
   * Generate SRT subtitle file
   */
  async generateSRT(chapterId: number): Promise<string> {
    const subtitles = await this.getSubtitleEntries(chapterId);
    const chapterDir = path.join(this.outputDir, 'chapters', String(chapterId));
    await fs.ensureDir(chapterDir);

    let srt = '';
    subtitles.forEach((sub, i) => {
      srt += `${i + 1}\n`;
      srt += `${this.formatSRTTime(sub.startTime)} --> ${this.formatSRTTime(sub.endTime)}\n`;
      srt += `${sub.text}\n\n`;
    });

    const outputPath = path.join(chapterDir, 'subtitles.srt');
    await fs.writeFile(outputPath, srt.trim(), 'utf-8');

    logger.info(`SRT subtitles generated: ${outputPath} (${subtitles.length} entries)`);
    return outputPath;
  }

  /**
   * Generate VTT subtitle file
   */
  async generateVTT(chapterId: number): Promise<string> {
    const subtitles = await this.getSubtitleEntries(chapterId);
    const chapterDir = path.join(this.outputDir, 'chapters', String(chapterId));
    await fs.ensureDir(chapterDir);

    let vtt = 'WEBVTT\n\n';
    subtitles.forEach((sub, i) => {
      vtt += `${i + 1}\n`;
      vtt += `${this.formatVTTTime(sub.startTime)} --> ${this.formatVTTTime(sub.endTime)}\n`;
      vtt += `${sub.text}\n\n`;
    });

    const outputPath = path.join(chapterDir, 'subtitles.vtt');
    await fs.writeFile(outputPath, vtt.trim(), 'utf-8');

    logger.info(`VTT subtitles generated: ${outputPath} (${subtitles.length} entries)`);
    return outputPath;
  }

  /**
   * Get subtitle entries from timeline
   */
  private async getSubtitleEntries(chapterId: number): Promise<SubtitleEntry[]> {
    const analysis = await ChapterAnalysis.findOne({ chapterId });
    if (!analysis || analysis.timeline.length === 0) {
      throw new Error(`No timeline found for chapter ${chapterId}`);
    }

    const subtitles: SubtitleEntry[] = [];
    let index = 1;

    for (const entry of analysis.timeline) {
      const text = entry.narrationSegment?.trim();
      if (!text) continue;

      // Split long narration into multiple subtitle entries (max ~10 words per line)
      const words = text.split(/\s+/);
      const maxWordsPerSub = 12;
      const totalDuration = entry.endTime - entry.startTime;
      const chunks = Math.ceil(words.length / maxWordsPerSub);
      const chunkDuration = totalDuration / chunks;

      for (let c = 0; c < chunks; c++) {
        const chunkWords = words.slice(c * maxWordsPerSub, (c + 1) * maxWordsPerSub);
        const startTime = entry.startTime + c * chunkDuration;
        const endTime = startTime + chunkDuration;

        subtitles.push({
          index: index++,
          startTime,
          endTime: Math.min(endTime, entry.endTime),
          text: chunkWords.join(' '),
        });
      }
    }

    return subtitles;
  }

  /**
   * Format seconds as HH:MM:SS
   */
  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Format seconds as SRT timestamp (HH:MM:SS,mmm)
   */
  private formatSRTTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  /**
   * Format seconds as VTT timestamp (HH:MM:SS.mmm)
   */
  private formatVTTTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }
}

export default new TimelineService();
