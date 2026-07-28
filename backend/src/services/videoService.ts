import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import logger from '../config/logger';
import ChapterAnalysis from '../models/ChapterAnalysis';

const execAsync = promisify(exec);

export interface VideoOptions {
  width?: number;
  height?: number;
  fps?: number;
  format?: 'mp4' | 'webm';
  quality?: 'low' | 'medium' | 'high';
  effects?: {
    zoom?: boolean;
    pan?: boolean;
    fade?: boolean;
  };
  subtitles?: boolean;
  audio?: string; // path to audio file
  bgMusic?: string; // path to background music
  bgMusicVolume?: number; // 0-1
}

export interface VideoResult {
  videoPath: string;
  thumbnailPath: string;
  duration: number;
  format: string;
  fileSize: number;
}

class VideoService {
  private ffmpegPath: string;
  private outputDir: string;
  private tempDir: string;

  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.outputDir = path.resolve(process.env.VIDEO_OUTPUT_DIR || './storage/videos');
    this.tempDir = path.resolve(process.env.TEMP_DIR || './temp');

    fs.ensureDirSync(this.outputDir);
    fs.ensureDirSync(this.tempDir);
  }

  /**
   * Generate video from chapter analysis
   */
  async generateVideo(chapterId: number, options: VideoOptions = {}): Promise<VideoResult> {
    const analysis = await ChapterAnalysis.findOne({ chapterId });
    if (!analysis || analysis.timeline.length === 0) {
      throw new Error(`No timeline found for chapter ${chapterId}. Generate timeline first.`);
    }

    const {
      width = 1920,
      height = 1080,
      fps = 30,
      format = 'mp4',
      quality = 'medium',
      effects = { zoom: true, pan: true, fade: true },
      subtitles = true,
      audio,
      bgMusic,
      bgMusicVolume = 0.15,
    } = options;

    const chapterDir = path.join(this.outputDir, 'chapters', String(chapterId));
    const tempChapterDir = path.join(this.tempDir, String(chapterId));
    await fs.ensureDir(chapterDir);
    await fs.ensureDir(tempChapterDir);

    logger.info(`Starting video generation for chapter ${chapterId}: ${analysis.panelCount} panels, ${analysis.totalDuration.toFixed(1)}s`);

    try {
      // Step 1: Download all panel images
      const panelPaths = await this.downloadPanelImages(analysis.panels.map(p => p.imageUrl), tempChapterDir);

      // Step 2: Build FFmpeg filter complex with effects
      const filterComplex = this.buildFilterComplex(
        analysis.timeline,
        panelPaths,
        { width, height, fps, effects }
      );

      // Step 3: Build FFmpeg command
      const outputPath = path.join(chapterDir, `video.${format}`);
      const subtitlePath = subtitles ? path.join(chapterDir, 'subtitles.srt') : undefined;

      await this.runFFmpeg({
        panelPaths,
        timeline: analysis.timeline,
        filterComplex,
        outputPath,
        subtitlePath,
        audioPath: audio || analysis.audioFile,
        bgMusicPath: bgMusic,
        bgMusicVolume,
        width,
        height,
        fps,
        format,
        quality,
      });

      // Step 4: Generate thumbnail
      const thumbnailPath = path.join(chapterDir, 'thumbnail.png');
      await this.generateThumbnail(outputPath, thumbnailPath);

      // Get file size
      const stats = await fs.stat(outputPath);

      // Update analysis
      analysis.videoFile = outputPath;
      analysis.thumbnailFile = thumbnailPath;
      analysis.status = 'video_ready';
      await analysis.save();

      // Clean up temp files
      await fs.remove(tempChapterDir);

      logger.info(`Video generated: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);

      return {
        videoPath: outputPath,
        thumbnailPath,
        duration: analysis.totalDuration,
        format,
        fileSize: stats.size,
      };
    } catch (error: any) {
      // Clean up on failure
      await fs.remove(tempChapterDir).catch(() => {});
      logger.error(`Video generation failed for chapter ${chapterId}:`, error.message);
      throw error;
    }
  }

  /**
   * Download panel images to temp directory
   */
  private async downloadPanelImages(urls: string[], tempDir: string): Promise<string[]> {
    const paths: string[] = [];

    for (let i = 0; i < urls.length; i++) {
      const ext = '.jpg';
      const outputPath = path.join(tempDir, `panel_${String(i).padStart(4, '0')}${ext}`);

      try {
        const response = await axios.get(urls[i], {
          responseType: 'arraybuffer',
          timeout: 60000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        await fs.writeFile(outputPath, Buffer.from(response.data));
        paths.push(outputPath);
      } catch (error: any) {
        logger.error(`Failed to download panel ${i}: ${error.message}`);
        // Create a black placeholder image
        await this.createBlackImage(outputPath, 1920, 1080);
        paths.push(outputPath);
      }
    }

    return paths;
  }

  /**
   * Build FFmpeg filter complex for effects
   */
  private buildFilterComplex(
    timeline: any[],
    panelPaths: string[],
    opts: { width: number; height: number; fps: number; effects: VideoOptions['effects'] }
  ): string {
    const { width, height, fps, effects } = opts;
    const filters: string[] = [];

    timeline.forEach((entry, i) => {
      if (i >= panelPaths.length) return;
      const duration = entry.duration || entry.endTime - entry.startTime;
      const frames = Math.ceil(duration * fps);

      let filter = `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}`;

      // Add effects
      if (effects?.zoom) {
        const zoomFactor = 0.0005; // Slow zoom
        filter += `,zoompan=z='min(zoom+${zoomFactor},1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps}`;
      } else if (effects?.pan) {
        filter += `,zoompan=z='1':x='if(eq(on,1),0,x+1)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps}`;
      }

      // Trim to exact duration
      filter += `,trim=duration=${duration},setpts=PTS-STARTPTS`;

      // Fade in/out
      if (effects?.fade) {
        const fadeIn = Math.min(0.5, duration * 0.1);
        const fadeOut = Math.min(0.5, duration * 0.1);
        filter += `,fade=t=in:st=0:d=${fadeIn},fade=t=out:st=${duration - fadeOut}:d=${fadeOut}`;
      }

      filters.push(`${filter}[v${i}]`);
    });

    // Concatenate all video segments
    const concatInputs = timeline.map((_, i) => `[v${i}]`).join('');
    filters.push(`${concatInputs}concat=n=${timeline.length}:v=1:a=0[vout]`);

    return filters.join(';');
  }

  /**
   * Execute FFmpeg to render the video
   */
  private async runFFmpeg(opts: {
    panelPaths: string[];
    timeline: any[];
    filterComplex: string;
    outputPath: string;
    subtitlePath?: string;
    audioPath?: string;
    bgMusicPath?: string;
    bgMusicVolume: number;
    width: number;
    height: number;
    fps: number;
    format: string;
    quality: string;
  }): Promise<void> {
    const args: string[] = ['-y']; // Overwrite output

    // Input images
    opts.panelPaths.forEach((panelPath) => {
      args.push('-loop', '1', '-i', panelPath);
    });

    // Audio input
    if (opts.audioPath && await fs.pathExists(opts.audioPath)) {
      args.push('-i', opts.audioPath);
    }

    // Background music
    if (opts.bgMusicPath && await fs.pathExists(opts.bgMusicPath)) {
      args.push('-i', opts.bgMusicPath);
    }

    // Filter complex
    args.push('-filter_complex', opts.filterComplex);
    args.push('-map', '[vout]');

    // Audio mapping
    const audioIdx = opts.panelPaths.length;
    if (opts.audioPath && await fs.pathExists(opts.audioPath)) {
      if (opts.bgMusicPath && await fs.pathExists(opts.bgMusicPath)) {
        // Mix narration and background music
        args.push('-filter_complex', `[${audioIdx}:a][${audioIdx + 1}:a]amix=inputs=2:duration=first:weights=1 ${opts.bgMusicVolume}[aout]`);
        args.push('-map', '[aout]');
      } else {
        args.push('-map', `${audioIdx}:a`);
      }
    }

    // Subtitle overlay
    if (opts.subtitlePath && await fs.pathExists(opts.subtitlePath)) {
      // Use ASS subtitles filter (burns into video)
      args.push('-vf', `subtitles=${opts.subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:')}`);
    }

    // Encoding settings
    const qualityPresets: Record<string, string[]> = {
      low: ['-crf', '28', '-preset', 'fast'],
      medium: ['-crf', '23', '-preset', 'medium'],
      high: ['-crf', '18', '-preset', 'slow'],
    };

    if (opts.format === 'mp4') {
      args.push('-c:v', 'libx264', ...qualityPresets[opts.quality]);
      args.push('-c:a', 'aac', '-b:a', '192k');
      args.push('-pix_fmt', 'yuv420p');
      args.push('-movflags', '+faststart');
    } else {
      args.push('-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0');
      args.push('-c:a', 'libopus');
    }

    args.push('-shortest');
    args.push(opts.outputPath);

    logger.info(`Running FFmpeg with ${args.length} arguments`);
    logger.debug(`FFmpeg args: ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const proc = spawn(this.ffmpegPath, args);
      let stderr = '';

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          logger.error(`FFmpeg failed (code ${code}): ${stderr.slice(-500)}`);
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr.slice(-200)}`));
        }
      });

      proc.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
  }

  /**
   * Generate thumbnail from video
   */
  private async generateThumbnail(videoPath: string, outputPath: string): Promise<void> {
    try {
      await execAsync(
        `${this.ffmpegPath} -y -i "${videoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${outputPath}"`
      );
    } catch (error: any) {
      logger.warn(`Thumbnail generation failed: ${error.message}`);
      // Create a simple black placeholder
      await this.createBlackImage(outputPath, 640, 360);
    }
  }

  /**
   * Create a black placeholder image
   */
  private async createBlackImage(outputPath: string, width: number, height: number): Promise<void> {
    try {
      await execAsync(
        `${this.ffmpegPath} -y -f lavfi -i "color=c=black:s=${width}x${height}:d=1" -frames:v 1 "${outputPath}"`
      );
    } catch {
      // Write a minimal 1x1 black PNG as absolute fallback
      const blackPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      await fs.writeFile(outputPath, blackPng);
    }
  }

  /**
   * Check if FFmpeg is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await execAsync(`${this.ffmpegPath} -version`);
      return true;
    } catch {
      return false;
    }
  }
}

export default new VideoService();
