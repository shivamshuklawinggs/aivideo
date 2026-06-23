import mongoose, { Document, Schema } from 'mongoose';

export interface IVideoScene {
  sceneNumber: number;
  panelId: mongoose.Types.ObjectId;
  panelUrl: string;
  duration: number;
  startTime: number;
  endTime: number;
  animationType: string;
  animationConfig: Record<string, any>;
  narrationSegment?: string;
  subtitleSegments?: {
    text: string;
    startTime: number;
    endTime: number;
    words?: {
      word: string;
      startTime: number;
      endTime: number;
    }[];
  }[];
}

export interface IGeneratedVideo extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  webtoonId: mongoose.Types.ObjectId;
  chapterId?: mongoose.Types.ObjectId;
  scriptId: mongoose.Types.ObjectId;
  voiceProfileId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  thumbnail?: string;
  videoUrl?: string;
  videoPath?: string;
  scenes: IVideoScene[];
  audioConfig: {
    narrationAudioUrl?: string;
    backgroundMusicUrl?: string;
    musicCategory?: string;
    narrationVolume: number;
    musicVolume: number;
    fadeInDuration: number;
    fadeOutDuration: number;
  };
  videoConfig: {
    resolution: '1080p' | '1440p' | '4K';
    fps: number;
    format: 'mp4' | 'mov';
    codec: string;
    bitrate: string;
    aspectRatio: string;
  };
  subtitleConfig: {
    enabled: boolean;
    style: string;
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
    position: 'top' | 'center' | 'bottom';
    karaokeEffect: boolean;
  };
  metadata: {
    totalDuration: number;
    fileSize?: number;
    sceneCount: number;
    generationTime?: number;
  };
  status: 'draft' | 'rendering' | 'completed' | 'failed';
  renderProgress: number;
  errorMessage?: string;
  views: number;
  likes: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GeneratedVideoSchema = new Schema<IGeneratedVideo>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    webtoonId: {
      type: Schema.Types.ObjectId,
      ref: 'Webtoon',
      required: true,
      index: true,
    },
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
      index: true,
    },
    scriptId: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedScript',
      required: true,
      index: true,
    },
    voiceProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'VoiceProfile',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    thumbnail: String,
    videoUrl: String,
    videoPath: String,
    scenes: [
      {
        sceneNumber: {
          type: Number,
          required: true,
        },
        panelId: {
          type: Schema.Types.ObjectId,
          ref: 'Panel',
          required: true,
        },
        panelUrl: {
          type: String,
          required: true,
        },
        duration: {
          type: Number,
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
        animationType: {
          type: String,
          required: true,
        },
        animationConfig: {
          type: Schema.Types.Mixed,
          default: {},
        },
        narrationSegment: String,
        subtitleSegments: [
          {
            text: String,
            startTime: Number,
            endTime: Number,
            words: [
              {
                word: String,
                startTime: Number,
                endTime: Number,
              },
            ],
          },
        ],
      },
    ],
    audioConfig: {
      narrationAudioUrl: String,
      backgroundMusicUrl: String,
      musicCategory: String,
      narrationVolume: {
        type: Number,
        default: 1.0,
        min: 0,
        max: 1,
      },
      musicVolume: {
        type: Number,
        default: 0.3,
        min: 0,
        max: 1,
      },
      fadeInDuration: {
        type: Number,
        default: 2,
      },
      fadeOutDuration: {
        type: Number,
        default: 2,
      },
    },
    videoConfig: {
      resolution: {
        type: String,
        enum: ['1080p', '1440p', '4K'],
        default: '1080p',
      },
      fps: {
        type: Number,
        default: 30,
      },
      format: {
        type: String,
        enum: ['mp4', 'mov'],
        default: 'mp4',
      },
      codec: {
        type: String,
        default: 'h264',
      },
      bitrate: {
        type: String,
        default: '5000k',
      },
      aspectRatio: {
        type: String,
        default: '16:9',
      },
    },
    subtitleConfig: {
      enabled: {
        type: Boolean,
        default: true,
      },
      style: {
        type: String,
        default: 'modern',
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
      position: {
        type: String,
        enum: ['top', 'center', 'bottom'],
        default: 'bottom',
      },
      karaokeEffect: {
        type: Boolean,
        default: true,
      },
    },
    metadata: {
      totalDuration: {
        type: Number,
        required: true,
      },
      fileSize: Number,
      sceneCount: {
        type: Number,
        required: true,
      },
      generationTime: Number,
    },
    status: {
      type: String,
      enum: ['draft', 'rendering', 'completed', 'failed'],
      default: 'draft',
      index: true,
    },
    renderProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    errorMessage: String,
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

GeneratedVideoSchema.index({ userId: 1, createdAt: -1 });
GeneratedVideoSchema.index({ webtoonId: 1, chapterId: 1 });
GeneratedVideoSchema.index({ status: 1 });
GeneratedVideoSchema.index({ isPublic: 1, views: -1 });

export default mongoose.model<IGeneratedVideo>('GeneratedVideo', GeneratedVideoSchema);
