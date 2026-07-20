import mongoose, { Document, Schema } from 'mongoose';

export interface IWebtoon extends Document {
  _id: mongoose.Types.ObjectId;
  sukuyamiId?: string; // SUKUYAMI manga ID
  title: string;
  description?: string;
  thumbnail?: string;
  coverImage?: string; // SUKUYAMI cover image URL
  genres: string[];
  author?: string;
  status: string;
  totalChapters: number;
  lastUpdated?: Date; // Last chapter update from SUKUYAMI
  sourceUrl?: string;
  sourceType: 'sukuyami' | 'upload' | 'mangafire' | 'tachiyomi' | 'graphql' | 'other';
  sukuyamiData: {
    totalSourceChapters: number;
    lastChapterNumber?: number;
    nextChapterExpected?: Date;
    popularity?: number;
    rating?: number;
    year?: number;
    alternativeTitles?: string[];
  };
  metadata: {
    totalPanels?: number;
    averagePanelsPerChapter?: number;
    estimatedReadTime?: number;
    sourceInfo?: any;
    downloadFormat?: string;
    downloadQuality?: string;
  };
  tags: string[];
  rating?: number;
  views: number;
  isPublic: boolean;
  isProcessed: boolean;
  processingStatus: 'pending' | 'syncing' | 'processing' | 'completed' | 'failed';
  processingProgress: number;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const WebtoonSchema = new Schema<IWebtoon>(
  {
   
    sukuyamiId: {
      type: String,
      index: true,
      sparse: true,
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
    coverImage: {
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
      default: 'ongoing',
    },
    totalChapters: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
    },
    sourceUrl: {
      type: String,
    },
    sourceType: {
      type: String,
      enum: ['sukuyami', 'upload', 'mangafire', 'tachiyomi', 'graphql', 'other'],
      default: 'sukuyami'
    },
    sukuyamiData: {
      totalSourceChapters: {
        type: Number,
        default: 0,
      },
      lastChapterNumber: {
        type: Number,
      },
      nextChapterExpected: {
        type: Date,
      },
      popularity: {
        type: Number,
      },
      rating: {
        type: Number,
        min: 0,
        max: 10,
      },
      year: {
        type: Number,
      },
      alternativeTitles: {
        type: [String],
        default: [],
      },
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
      enum: ['pending', 'syncing', 'processing', 'completed', 'failed'],
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
