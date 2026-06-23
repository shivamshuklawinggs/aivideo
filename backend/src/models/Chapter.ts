import mongoose, { Document, Schema } from 'mongoose';

export interface IChapter extends Document {
  _id: mongoose.Types.ObjectId;
  webtoonId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  chapterNumber: number;
  title?: string;
  description?: string;
  thumbnail?: string;
  panelCount: number;
  sequence: number;
  folderPath: string;
  metadata: {
    estimatedReadTime?: number;
    totalFileSize?: number;
    averagePanelSize?: number;
  };
  isProcessed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChapterSchema = new Schema<IChapter>(
  {
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
    chapterNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    thumbnail: {
      type: String,
    },
    panelCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sequence: {
      type: Number,
      required: true,
    },
    folderPath: {
      type: String,
      required: true,
    },
    metadata: {
      estimatedReadTime: Number,
      totalFileSize: Number,
      averagePanelSize: Number,
    },
    isProcessed: {
      type: Boolean,
      default: false,
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    errorMessage: String,
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ChapterSchema.index({ webtoonId: 1, chapterNumber: 1 }, { unique: true });
ChapterSchema.index({ webtoonId: 1, sequence: 1 });
ChapterSchema.index({ userId: 1, createdAt: -1 });

ChapterSchema.virtual('panels', {
  ref: 'Panel',
  localField: '_id',
  foreignField: 'chapterId',
});

export default mongoose.model<IChapter>('Chapter', ChapterSchema);
