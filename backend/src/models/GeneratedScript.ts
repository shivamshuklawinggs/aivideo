import mongoose, { Document, Schema } from 'mongoose';

export interface IScriptSegment {
  panelId: mongoose.Types.ObjectId;
  panelNumber: number;
  narration: string;
  duration: number;
  startTime: number;
  endTime: number;
  animationType?: string;
  cameraMovement?: string;
}

export interface IGeneratedScript extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  webtoonId: mongoose.Types.ObjectId;
  chapterId?: mongoose.Types.ObjectId;
  title: string;
  summary: string;
  detailedExplanation: string;
  hook: string;
  ending: string;
  scriptSegments: IScriptSegment[];
  metadata: {
    totalDuration?: number;
    wordCount?: number;
    estimatedVideoLength?: number;
    tone?: string;
    style?: string;
  };
  aiModel: string;
  aiPrompt?: string;
  characters: {
    name: string;
    description?: string;
    appearances: number[];
  }[];
  keyEvents: {
    event: string;
    panelNumbers: number[];
    importance: 'low' | 'medium' | 'high';
  }[];
  emotions: {
    emotion: string;
    intensity: number;
    panelNumbers: number[];
  }[];
  status: 'draft' | 'approved' | 'rejected';
  version: number;
  generationTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const GeneratedScriptSchema = new Schema<IGeneratedScript>(
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
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    detailedExplanation: {
      type: String,
      required: true,
    },
    hook: {
      type: String,
      required: true,
      trim: true,
    },
    ending: {
      type: String,
      required: true,
      trim: true,
    },
    scriptSegments: [
      {
        panelId: {
          type: Schema.Types.ObjectId,
          ref: 'Panel',
          required: true,
        },
        panelNumber: {
          type: Number,
          required: true,
        },
        narration: {
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
        animationType: String,
        cameraMovement: String,
      },
    ],
    metadata: {
      totalDuration: Number,
      wordCount: Number,
      estimatedVideoLength: Number,
      tone: String,
      style: String,
    },
    aiModel: {
      type: String,
      required: true,
    },
    aiPrompt: String,
    characters: [
      {
        name: {
          type: String,
          required: true,
        },
        description: String,
        appearances: [Number],
      },
    ],
    keyEvents: [
      {
        event: {
          type: String,
          required: true,
        },
        panelNumbers: [Number],
        importance: {
          type: String,
          enum: ['low', 'medium', 'high'],
          default: 'medium',
        },
      },
    ],
    emotions: [
      {
        emotion: {
          type: String,
          required: true,
        },
        intensity: {
          type: Number,
          min: 0,
          max: 10,
        },
        panelNumbers: [Number],
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'approved', 'rejected'],
      default: 'draft',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    generationTime: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

GeneratedScriptSchema.index({ userId: 1, createdAt: -1 });
GeneratedScriptSchema.index({ webtoonId: 1, chapterId: 1 });
GeneratedScriptSchema.index({ status: 1 });

export default mongoose.model<IGeneratedScript>('GeneratedScript', GeneratedScriptSchema);
