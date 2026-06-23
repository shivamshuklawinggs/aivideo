import mongoose, { Document, Schema } from 'mongoose';

export interface IRenderJob extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
  jobType: 'video_generation' | 'audio_generation' | 'subtitle_generation' | 'final_render';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  progress: number;
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletionTime?: Date;
  processingTime?: number;
  errorMessage?: string;
  errorStack?: string;
  retryCount: number;
  maxRetries: number;
  metadata: {
    inputFiles?: string[];
    outputFiles?: string[];
    resolution?: string;
    duration?: number;
    fileSize?: number;
  };
  logs: {
    timestamp: Date;
    level: 'info' | 'warning' | 'error';
    message: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const RenderJobSchema = new Schema<IRenderJob>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedVideo',
      required: true,
      index: true,
    },
    jobType: {
      type: String,
      enum: ['video_generation', 'audio_generation', 'subtitle_generation', 'final_render'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'queued',
      index: true,
    },
    priority: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    currentStep: String,
    totalSteps: Number,
    completedSteps: {
      type: Number,
      default: 0,
    },
    startedAt: Date,
    completedAt: Date,
    estimatedCompletionTime: Date,
    processingTime: Number,
    errorMessage: String,
    errorStack: String,
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    metadata: {
      inputFiles: [String],
      outputFiles: [String],
      resolution: String,
      duration: Number,
      fileSize: Number,
    },
    logs: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        level: {
          type: String,
          enum: ['info', 'warning', 'error'],
          default: 'info',
        },
        message: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

RenderJobSchema.index({ userId: 1, status: 1, createdAt: -1 });
RenderJobSchema.index({ videoId: 1, jobType: 1 });
RenderJobSchema.index({ status: 1, priority: -1, createdAt: 1 });

export default mongoose.model<IRenderJob>('RenderJob', RenderJobSchema);
