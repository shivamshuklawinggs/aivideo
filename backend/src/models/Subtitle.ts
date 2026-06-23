import mongoose, { Document, Schema } from 'mongoose';

export interface ISubtitleWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface ISubtitleSegment {
  index: number;
  text: string;
  startTime: number;
  endTime: number;
  duration: number;
  words: ISubtitleWord[];
}

export interface ISubtitle extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
  scriptId: mongoose.Types.ObjectId;
  language: string;
  segments: ISubtitleSegment[];
  style: {
    fontFamily: string;
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
    outlineColor?: string;
    outlineWidth?: number;
    position: 'top' | 'center' | 'bottom';
    alignment: 'left' | 'center' | 'right';
    karaokeEffect: boolean;
    highlightColor?: string;
  };
  format: 'srt' | 'vtt' | 'ass' | 'json';
  fileUrl?: string;
  filePath?: string;
  metadata: {
    totalSegments: number;
    totalWords: number;
    totalDuration: number;
    averageSegmentDuration: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubtitleSchema = new Schema<ISubtitle>(
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
    scriptId: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedScript',
      required: true,
      index: true,
    },
    language: {
      type: String,
      default: 'en',
    },
    segments: [
      {
        index: {
          type: Number,
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        startTime: {
          type: Number,
          required: true,
        },
        endTime: {
          type: Number,
          required: true,
        },
        duration: {
          type: Number,
          required: true,
        },
        words: [
          {
            word: {
              type: String,
              required: true,
            },
            startTime: {
              type: Number,
              required: true,
            },
            endTime: {
              type: Number,
              required: true,
            },
            confidence: Number,
          },
        ],
      },
    ],
    style: {
      fontFamily: {
        type: String,
        default: 'Arial',
      },
      fontSize: {
        type: Number,
        default: 48,
      },
      fontColor: {
        type: String,
        default: '#FFFFFF',
      },
      backgroundColor: {
        type: String,
        default: 'rgba(0, 0, 0, 0.7)',
      },
      outlineColor: String,
      outlineWidth: Number,
      position: {
        type: String,
        enum: ['top', 'center', 'bottom'],
        default: 'bottom',
      },
      alignment: {
        type: String,
        enum: ['left', 'center', 'right'],
        default: 'center',
      },
      karaokeEffect: {
        type: Boolean,
        default: true,
      },
      highlightColor: String,
    },
    format: {
      type: String,
      enum: ['srt', 'vtt', 'ass', 'json'],
      default: 'srt',
    },
    fileUrl: String,
    filePath: String,
    metadata: {
      totalSegments: {
        type: Number,
        required: true,
      },
      totalWords: {
        type: Number,
        required: true,
      },
      totalDuration: {
        type: Number,
        required: true,
      },
      averageSegmentDuration: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    errorMessage: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

SubtitleSchema.index({ userId: 1, createdAt: -1 });
SubtitleSchema.index({ videoId: 1 });
SubtitleSchema.index({ status: 1 });

export default mongoose.model<ISubtitle>('Subtitle', SubtitleSchema);
