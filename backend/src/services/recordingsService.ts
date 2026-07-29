import fs from 'fs-extra';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
// Use environment FFMPEG_PATH/FFPROBE_PATH if provided; otherwise fluent-ffmpeg looks on PATH.
import logger from '../config/logger';
import PanelRecording, { IPanelRecording } from '../models/PanelRecording';
import RecordingSession from '../models/RecordingSession';
import MergedAudio from '../models/MergedAudio';
import RecordingTimestamp from '../models/RecordingTimestamp';
import ChapterAnalysis from '../models/ChapterAnalysis';
import SukuyamiGraphQLService from './sukuyamiGraphQLService';
import { rabbitMQService } from '../config/rabbitmq/rabbitmq.service';
import { EXCHANGE_NAMES, ROUTING_KEYS } from '../config/rabbitmq/constants';

if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}
if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

const RECORDINGS_DIR = path.resolve(process.env.RECORDINGS_DIR || './storage/recordings');
const MIN_RECORDING_DURATION = 2; // seconds

export interface PanelInfo {
  panelId: string;
  panelOrder: number;
  imageUrl: string;
}

export interface RecordingInput {
  chapterId: number;
  mangaId?: number;
  panelId: string;
  panelOrder: number;
  audioFile: string;
  duration: number;
  fileSize: number;
}

export interface TimestampEntry {
  panelId: string;
  start: number;
  end: number;
}

class RecordingsService {
  private getChapterDir(chapterId: number): string {
    return path.join(RECORDINGS_DIR, 'chapters', String(chapterId));
  }

  private getPanelPath(chapterId: number, panelId: string, ext = 'webm'): string {
    const dir = path.join(this.getChapterDir(chapterId), 'panels');
    const safePanelId = panelId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(dir, `${safePanelId}.${ext}`);
  }

  private getMergedPath(chapterId: number): string {
    return path.join(this.getChapterDir(chapterId), 'chapter.mp3');
  }

  private getTimestampsPath(chapterId: number): string {
    return path.join(this.getChapterDir(chapterId), 'timestamps.json');
  }

  /**
   * Fetch chapter panels. Tries ChapterAnalysis first, then falls back to Sukuyami.
   */
  async getChapterPanels(chapterId: number): Promise<PanelInfo[]> {
    const analysis = await ChapterAnalysis.findOne({ chapterId });
    if (analysis && analysis.panels.length > 0) {
      return analysis.panels.map((p) => ({
        panelId: `panel_${p.panelIndex + 1}`,
        panelOrder: p.panelIndex,
        imageUrl: p.imageUrl,
      }));
    }

    try {
      const graphql = new SukuyamiGraphQLService();
      const urls = await graphql.getChapterPages(chapterId);
      return urls.map((url, idx) => ({
        panelId: `panel_${idx + 1}`,
        panelOrder: idx,
        imageUrl: url,
      }));
    } catch (error: any) {
      logger.warn(`Failed to fetch panels from Sukuyami for chapter ${chapterId}: ${error.message}`);
      throw new Error(`No panels found for chapter ${chapterId}. Run analysis first or check chapter id.`);
    }
  }

  /**
   * Get or create a recording session, resuming from the first unfinished panel.
   */
  async getOrCreateSession(chapterId: number, mangaId?: number): Promise<{ session: any; panels: PanelInfo[]; nextPanel: PanelInfo | null }> {
    const panels = await this.getChapterPanels(chapterId);

    let session = await RecordingSession.findOne({ chapterId });
    if (!session) {
      session = await RecordingSession.create({
        chapterId,
        mangaId,
        status: 'active',
        currentPanelOrder: 0,
        completedPanels: [],
        skippedPanels: [],
      });
    }

    const completedSet = new Set(session.completedPanels || []);
    const skippedSet = new Set(session.skippedPanels || []);

    const nextPanel = panels.find((p) => !completedSet.has(p.panelId) && !skippedSet.has(p.panelId)) || null;
    if (nextPanel) {
      session.currentPanelId = nextPanel.panelId;
      session.currentPanelOrder = nextPanel.panelOrder;
      await session.save();
    }

    return { session, panels, nextPanel };
  }

  /**
   * Validate a recording file: must exist, be non-empty, and longer than 2 seconds.
   */
  async validateRecording(filePath: string): Promise<{ valid: boolean; duration: number; error?: string }> {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        return { valid: false, duration: 0, error: 'Audio file is empty.' };
      }

      const duration = await this.getAudioDuration(filePath);
      if (duration < MIN_RECORDING_DURATION) {
        await fs.remove(filePath);
        return { valid: false, duration, error: `Recording is too short (${duration.toFixed(2)}s). Minimum is ${MIN_RECORDING_DURATION}s.` };
      }

      return { valid: true, duration };
    } catch (error: any) {
      logger.error(`Recording validation failed for ${filePath}:`, error.message);
      return { valid: false, duration: 0, error: 'Corrupted or invalid audio file.' };
    }
  }

  private getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata.format.duration || 0);
      });
    });
  }

  /**
   * Save or overwrite a panel recording. Stores the file in a predictable path.
   */
  async saveRecording(input: RecordingInput, tempFilePath: string): Promise<IPanelRecording> {
    const { chapterId, panelId, panelOrder, mangaId } = input;

    const chapterDir = this.getChapterDir(chapterId);
    const panelDir = path.join(chapterDir, 'panels');
    await fs.ensureDir(panelDir);

    const ext = path.extname(tempFilePath).slice(1) || 'webm';
    const targetPath = this.getPanelPath(chapterId, panelId, ext);
    await fs.move(tempFilePath, targetPath, { overwrite: true });

    const validation = await this.validateRecording(targetPath);
    if (!validation.valid) {
      await PanelRecording.findOneAndUpdate(
        { chapterId, panelId },
        {
          $setOnInsert: { chapterId, panelId, panelOrder, mangaId },
          $set: { status: 'failed', audioFile: '', duration: 0, fileSize: 0 },
        },
        { upsert: true, new: true }
      );
      throw new Error(validation.error);
    }

    const stats = await fs.stat(targetPath);
    const relativeAudioFile = path.relative(process.cwd(), targetPath);

    const recording = await PanelRecording.findOneAndUpdate(
      { chapterId, panelId },
      {
        $setOnInsert: { chapterId, panelId, panelOrder, mangaId },
        $set: {
          audioFile: relativeAudioFile,
          duration: validation.duration,
          fileSize: stats.size,
          status: 'completed',
        },
      },
      { upsert: true, new: true }
    );

    await this.updateSessionProgress(chapterId, panelId, 'completed');

    logger.info(`Recording saved: chapter=${chapterId}, panel=${panelId}, duration=${validation.duration.toFixed(2)}s`);
    return recording;
  }

  private async updateSessionProgress(chapterId: number, panelId: string, action: 'completed' | 'skipped'): Promise<void> {
    const session = await RecordingSession.findOne({ chapterId });
    if (!session) return;

    const list = action === 'completed' ? 'completedPanels' : 'skippedPanels';
    if (!session[list].includes(panelId)) {
      session[list].push(panelId);
    }

    const panels = await this.getChapterPanels(chapterId);
    const completedSet = new Set(session.completedPanels);
    const skippedSet = new Set(session.skippedPanels);

    const nextPanel = panels.find((p) => !completedSet.has(p.panelId) && !skippedSet.has(p.panelId));
    if (nextPanel) {
      session.currentPanelId = nextPanel.panelId;
      session.currentPanelOrder = nextPanel.panelOrder;
    } else {
      session.currentPanelId = '';
      session.currentPanelOrder = panels.length;
      if (session.completedPanels.length === panels.length) {
        session.status = 'finished';
      }
    }

    await session.save();
  }

  async skipPanel(chapterId: number, panelId: string): Promise<void> {
    await this.updateSessionProgress(chapterId, panelId, 'skipped');
    await PanelRecording.findOneAndUpdate(
      { chapterId, panelId },
      { $set: { status: 'skipped' } },
      { upsert: true }
    );
  }

  async deleteRecording(chapterId: number, panelId: string): Promise<void> {
    const recording = await PanelRecording.findOneAndDelete({ chapterId, panelId });
    if (recording && recording.audioFile) {
      const filePath = path.join(process.cwd(), recording.audioFile);
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
      }
    }

    const session = await RecordingSession.findOne({ chapterId });
    if (session) {
      session.completedPanels = session.completedPanels.filter((id) => id !== panelId);
      session.skippedPanels = session.skippedPanels.filter((id) => id !== panelId);
      await session.save();
    }

    logger.info(`Recording deleted: chapter=${chapterId}, panel=${panelId}`);
  }

  async getRecording(chapterId: number, panelId: string): Promise<IPanelRecording | null> {
    return PanelRecording.findOne({ chapterId, panelId });
  }

  async listRecordings(chapterId: number): Promise<IPanelRecording[]> {
    return PanelRecording.find({ chapterId }).sort({ panelOrder: 1 });
  }

  async getSession(chapterId: number): Promise<any | null> {
    return RecordingSession.findOne({ chapterId });
  }

  async getMergeStatus(chapterId: number): Promise<any | null> {
    return MergedAudio.findOne({ chapterId });
  }

  /**
   * Merge all completed panel recordings into a single chapter mp3 and generate timestamps.
   */
  async mergeChapterAudio(chapterId: number): Promise<{ merged: any; timestamps: TimestampEntry[] }> {
    const recordings = await this.listRecordings(chapterId);
    const completed = recordings.filter((r) => r.status === 'completed');

    if (completed.length === 0) {
      throw new Error('No completed recordings to merge.');
    }

    await MergedAudio.findOneAndUpdate(
      { chapterId },
      { $set: { status: 'merging', progress: 0 }, $setOnInsert: { chapterId } },
      { upsert: true, new: true }
    );

    const chapterDir = this.getChapterDir(chapterId);
    await fs.ensureDir(chapterDir);
    const outputPath = this.getMergedPath(chapterId);

    try {
      await this.normalizeAndMerge(completed, outputPath);

      const timestamps: TimestampEntry[] = [];
      let currentTime = 0;
      for (const rec of completed) {
        const start = currentTime;
        const end = start + rec.duration;
        timestamps.push({
          panelId: rec.panelId,
          start: parseFloat(start.toFixed(3)),
          end: parseFloat(end.toFixed(3)),
        });
        currentTime = end;
      }

      const timestampsPath = this.getTimestampsPath(chapterId);
      await fs.writeJson(timestampsPath, timestamps, { spaces: 2 });

      const duration = await this.getAudioDuration(outputPath);

      const merged = await MergedAudio.findOneAndUpdate(
        { chapterId },
        {
          $set: {
            audioFile: path.relative(process.cwd(), outputPath),
            duration,
            status: 'completed',
            progress: 100,
            timestampsFile: path.relative(process.cwd(), timestampsPath),
          },
        },
        { upsert: true, new: true }
      );

      if (merged) {
        await RecordingTimestamp.deleteMany({ chapterId });
        await RecordingTimestamp.insertMany(
          timestamps.map((t) => {
            const recording = completed.find((c) => c.panelId === t.panelId);
            return {
              chapterId,
              mergedAudioId: merged._id,
              panelId: t.panelId,
              panelOrder: recording?.panelOrder ?? 0,
              start: t.start,
              end: t.end,
            };
          })
        );
      }

      logger.info(`Chapter audio merged: chapter=${chapterId}, duration=${duration.toFixed(2)}s`);
      return { merged, timestamps };
    } catch (error: any) {
      logger.error(`Merge failed for chapter ${chapterId}:`, error.message);
      await MergedAudio.findOneAndUpdate(
        { chapterId },
        { $set: { status: 'failed', error: error.message, progress: 0 } }
      );
      throw error;
    }
  }

  private async normalizeAndMerge(recordings: IPanelRecording[], outputPath: string): Promise<string[]> {
    const normalizedFiles: string[] = [];
    const tempDir = path.join(path.dirname(outputPath), 'temp');
    await fs.ensureDir(tempDir);

    for (const rec of recordings) {
      const inputPath = path.join(process.cwd(), rec.audioFile);
      const outputFile = path.join(tempDir, `${rec.panelId.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp3`);
      await this.convertToMp3(inputPath, outputFile);
      normalizedFiles.push(outputFile);
    }

    if (normalizedFiles.length === 1) {
      await fs.copy(normalizedFiles[0], outputPath);
    } else {
      const listPath = path.join(tempDir, 'concat_list.txt');
      const listContent = normalizedFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
      await fs.writeFile(listPath, listContent);

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(listPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy'])
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });
    }

    await fs.remove(tempDir);
    return normalizedFiles;
  }

  private async convertToMp3(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .audioFrequency(44100)
        .audioChannels(2)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  async getMergedAudio(chapterId: number): Promise<string> {
    const merged = await MergedAudio.findOne({ chapterId });
    if (!merged || !merged.audioFile) {
      throw new Error('Merged audio not found.');
    }
    return path.join(process.cwd(), merged.audioFile);
  }

  async getTimestamps(chapterId: number): Promise<TimestampEntry[]> {
    const merged = await MergedAudio.findOne({ chapterId });
    if (!merged || !merged.timestampsFile) {
      throw new Error('Timestamps not found.');
    }
    return fs.readJson(path.join(process.cwd(), merged.timestampsFile));
  }

  /**
   * Queue a chapter audio merge job. Falls back to immediate merge if RabbitMQ is unavailable.
   */
  async queueMerge(chapterId: number): Promise<any> {
    await MergedAudio.findOneAndUpdate(
      { chapterId },
      { $setOnInsert: { chapterId }, $set: { status: 'pending', progress: 0 } },
      { upsert: true, new: true }
    );

    const published = await rabbitMQService.produceMessage(
      EXCHANGE_NAMES.RECORDINGS,
      ROUTING_KEYS.RECORDINGS.MERGE,
      { chapterId }
    );

    if (!published) {
      logger.warn('RabbitMQ not available, merging synchronously');
      return this.mergeChapterAudio(chapterId);
    }

    return MergedAudio.findOne({ chapterId });
  }
}

export default new RecordingsService();
