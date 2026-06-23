import mongoose, { Document, Schema } from 'mongoose';

export interface IPanel extends Document {
  _id: mongoose.Types.ObjectId;
  chapterId: mongoose.Types.ObjectId;
  webtoonId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  panelNumber: number;
  sequence: number;
  imageUrl: string;
  imagePath: string;
  thumbnailUrl?: string;
  metadata: {
    width?: number;
    height?: number;
    format?: string;
    fileSize?: number;
    aspectRatio?: number;
  };
  aiAnalysis?: {
    description?: string;
    detectedCharacters?: string[];
    detectedObjects?: string[];
    sceneType?: string;
    emotions?: string[];
    dialogueDetected?: boolean;
    actionLevel?: 'low' | 'medium' | 'high';
  };
  isProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PanelSchema = new Schema<IPanel>(
  {
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
      index: true,
    },
    webtoonId: {
      type: Schema.Types.ObjectId,
      ref: 'Webtoon',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    panelNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    sequence: {
      type: Number,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    imagePath: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
    },
    metadata: {
      width: Number,
      height: Number,
      format: String,
      fileSize: Number,
      aspectRatio: Number,
    },
    aiAnalysis: {
      description: String,
      detectedCharacters: [String],
      detectedObjects: [String],
      sceneType: String,
      emotions: [String],
      dialogueDetected: Boolean,
      actionLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
      },
    },
    isProcessed: {
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

PanelSchema.index({ chapterId: 1, panelNumber: 1 }, { unique: true });
PanelSchema.index({ chapterId: 1, sequence: 1 });
PanelSchema.index({ webtoonId: 1 });

export default mongoose.model<IPanel>('Panel', PanelSchema);
