import mongoose, { Document, Schema } from 'mongoose';

export interface IWebtoon extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  thumbnail?: string;
  genres: string[];
  author?: string;
  status: 'ongoing' | 'completed' | 'hiatus';
  totalChapters: number;
  archiveFileName: string;
  archiveFilePath: string;
  archiveFileSize: number;
  extractedPath?: string;
  sourceUrl?: string;
  sourceType?: 'upload' | 'mangafire' | 'other';
  metadata: {
    totalPanels?: number;
    averagePanelsPerChapter?: number;
    estimatedReadTime?: number;
    sourceInfo?: any;
    totalSourceChapters?: number;
    downloadFormat?: string;
    downloadQuality?: string;
  };
  tags: string[];
  rating?: number;
  views: number;
  isPublic: boolean;
  isProcessed: boolean;
  processingStatus: 'pending' | 'downloading' | 'extracting' | 'processing' | 'completed' | 'failed';
  processingProgress: number;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const WebtoonSchema = new Schema<IWebtoon>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Webtoon title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    thumbnail: {
      type: String,
    },
    genres: {
      type: [String],
      default: [],
    },
    author: {
      type: String,
      trim: true,
      maxlength: [100, 'Author name cannot exceed 100 characters'],
    },
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'hiatus'],
      default: 'ongoing',
    },
    totalChapters: {
      type: Number,
      default: 0,
      min: 0,
    },
    archiveFileName: {
      type: String,
      required: true,
    },
    archiveFilePath: {
      type: String,
      required: true,
    },
    archiveFileSize: {
      type: Number,
      required: true,
    },
    extractedPath: {
      type: String,
    },
    sourceUrl: {
      type: String,
    },
    sourceType: {
      type: String,
      enum: ['upload', 'mangafire', 'other'],
      default: 'upload'
    },
    metadata: {
      totalPanels: Number,
      averagePanelsPerChapter: Number,
      estimatedReadTime: Number,
      sourceInfo: Schema.Types.Mixed,
      totalSourceChapters: Number,
      downloadFormat: String,
      downloadQuality: String,
    },
    tags: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    isProcessed: {
      type: Boolean,
      default: false,
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'downloading', 'extracting', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    processingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    errorMessage: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

WebtoonSchema.index({ userId: 1, createdAt: -1 });
WebtoonSchema.index({ title: 'text', description: 'text' });
WebtoonSchema.index({ genres: 1 });
WebtoonSchema.index({ status: 1 });
WebtoonSchema.index({ processingStatus: 1 });

WebtoonSchema.virtual('chapters', {
  ref: 'Chapter',
  localField: '_id',
  foreignField: 'webtoonId',
});

export default mongoose.model<IWebtoon>('Webtoon', WebtoonSchema);
