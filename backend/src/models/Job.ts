import mongoose, { Schema, Document, Model } from 'mongoose';

export type JobType = 'analyze' | 'story' | 'narration' | 'video' | 'full_pipeline';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PipelineStep = 'fetch_panels' | 'ocr' | 'vision_analysis' | 'story_generation' | 'voice_generation' | 'timeline' | 'subtitles' | 'video_render';

export interface IJobStep {
  step: PipelineStep;
  status: JobStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  progress: number; // 0-100
  metadata?: Record<string, any>;
}

export interface IJob extends Document {
  chapterId: number;
  mangaId: number;
  type: JobType;
  status: JobStatus;
  steps: IJobStep[];
  currentStep?: PipelineStep;
  progress: number; // 0-100 overall
  result?: {
    storyFile?: string;
    narrationFile?: string;
    audioFile?: string;
    subtitleFile?: string;
    timelineFile?: string;
    videoFile?: string;
    thumbnailFile?: string;
  };
  options?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobStepSchema = new Schema<IJobStep>({
  step: { type: String, required: true, enum: ['fetch_panels', 'ocr', 'vision_analysis', 'story_generation', 'voice_generation', 'timeline', 'subtitles', 'video_render'] },
  status: { type: String, required: true, enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'], default: 'queued' },
  startedAt: Date,
  completedAt: Date,
  error: String,
  progress: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed },
}, { _id: false });

const JobSchema = new Schema<IJob>(
  {
    chapterId: { type: Number, required: true, index: true },
    mangaId: { type: Number, required: true, index: true },
    type: { type: String, required: true, enum: ['analyze', 'story', 'narration', 'video', 'full_pipeline'] },
    status: { type: String, required: true, enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'], default: 'queued' },
    steps: { type: [JobStepSchema], default: [] },
    currentStep: { type: String, enum: ['fetch_panels', 'ocr', 'vision_analysis', 'story_generation', 'voice_generation', 'timeline', 'subtitles', 'video_render'] },
    progress: { type: Number, default: 0 },
    result: {
      storyFile: String,
      narrationFile: String,
      audioFile: String,
      subtitleFile: String,
      timelineFile: String,
      videoFile: String,
      thumbnailFile: String,
    },
    options: { type: Schema.Types.Mixed },
    error: String,
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ chapterId: 1, type: 1 });
JobSchema.index({ chapterId: 1, mangaId: 1, type: 1 }, { unique: true });

const Job: Model<IJob> = mongoose.model<IJob>('Job', JobSchema);

export default Job;
