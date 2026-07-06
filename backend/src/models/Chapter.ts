import mongoose, { Document, Schema } from 'mongoose';

export interface IPanel extends Document {
  _id: mongoose.Types.ObjectId;
  pageNumber: number;
  imageUrl: string;
  sequence: number;
  description?: string;
  duration?: number; // Duration in video (seconds)
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface IChapter extends Document {
  _id: mongoose.Types.ObjectId;
  webtoonId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sukuyamiChapterId?: string;
  chapterNumber: number;
  title: string;
  description?: string;
  thumbnail?: string;
  totalPages: number;
  releaseDate?: Date;
  sourceUrl?: string;
  status: 'pending' | 'syncing' | 'processing' | 'completed' | 'failed';
  processingProgress: number;
  errorMessage?: string;
  
  // Panels from SUKUYAMI
  panels: IPanel[];
  
  // Generated content
  generatedScript?: {
    title: string;
    content: string;
    totalDuration: number; // in seconds
    scenes: Array<{
      sceneNumber: number;
      panels: number[]; // panel indices
      narration: string;
      duration: number;
      startTime: number;
      endTime: number;
    }>;
    generatedAt: Date;
    modelUsed?: string;
  };
  
  // Video generation
  videoUrl?: string;
  videoPath?: string;
  videoSize?: number;
  videoDuration?: number;
  videoFormat?: string;
  videoGeneratedAt?: Date;
  
  // Legacy fields for backward compatibility
  panelCount: number;
  sequence: number;
  folderPath?: string;
  metadata: {
    totalPanels: number;
    estimatedReadTime: number;
    totalFileSize?: number;
    averagePanelSize?: number;
    averagePanelDuration?: number;
    sourceInfo?: any;
    processingTime?: number;
  };
  isProcessed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const PanelSchema = new Schema<IPanel>({
  pageNumber: {
    type: Number,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  sequence: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  duration: {
    type: Number,
    default: 3, // 3 seconds per panel by default
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 100 },
    height: { type: Number, default: 100 },
  },
});

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
    sukuyamiChapterId: {
      type: String,
      index: true,
      sparse: true,
    },
    chapterNumber: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Chapter title is required'],
      trim: true,
      maxlength: [200, 'Chapter title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    thumbnail: {
      type: String,
    },
    totalPages: {
      type: Number,
      default: 0,
      min: 0,
    },
    releaseDate: {
      type: Date,
    },
    sourceUrl: {
      type: String,
    },
    status: {
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
    errorMessage: {
      type: String,
    },
    
    // Panels from SUKUYAMI
    panels: [PanelSchema],
    
    // Generated script
    generatedScript: {
      title: {
        type: String,
        required: function() { return this.generatedScript; },
      },
      content: {
        type: String,
        required: function() { return this.generatedScript; },
      },
      totalDuration: {
        type: Number,
        required: function() { return this.generatedScript; },
      },
      scenes: [{
        sceneNumber: { type: Number, required: true },
        panels: [{ type: Number, required: true }],
        narration: { type: String, required: true },
        duration: { type: Number, required: true },
        startTime: { type: Number, required: true },
        endTime: { type: Number, required: true },
      }],
      generatedAt: {
        type: Date,
        required: function() { return this.generatedScript; },
        default: Date.now,
      },
      modelUsed: {
        type: String,
      },
    },
    
    // Video generation
    videoUrl: {
      type: String,
    },
    videoPath: {
      type: String,
    },
    videoSize: {
      type: Number,
    },
    videoDuration: {
      type: Number,
    },
    videoFormat: {
      type: String,
      enum: ['mp4', 'webm', 'avi'],
      default: 'mp4',
    },
    videoGeneratedAt: {
      type: Date,
    },
    
    // Legacy fields for backward compatibility
    panelCount: {
      type: Number,
      default: 0,
    },
    sequence: {
      type: Number,
      default: 0,
    },
    folderPath: {
      type: String,
    },
    metadata: {
      totalPanels: {
        type: Number,
        default: 0,
      },
      estimatedReadTime: {
        type: Number,
        default: 0,
      },
      totalFileSize: {
        type: Number,
      },
      averagePanelSize: {
        type: Number,
      },
      averagePanelDuration: {
        type: Number,
      },
      sourceInfo: {
        type: Schema.Types.Mixed,
      },
      processingTime: {
        type: Number,
      },
    },
    isProcessed: {
      type: Boolean,
      default: false,
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
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

// Indexes for better performance
ChapterSchema.index({ webtoonId: 1, chapterNumber: 1 }, { unique: true });
ChapterSchema.index({ webtoonId: 1, status: 1 });
ChapterSchema.index({ userId: 1, status: 1 });
ChapterSchema.index({ 'videoGeneratedAt': 1 });
ChapterSchema.index({ 'generatedScript.generatedAt': 1 });
ChapterSchema.index({ sukuyamiChapterId: 1 }, { sparse: true });

// Virtuals
ChapterSchema.virtual('hasVideo').get(function() {
  return !!this.videoUrl && !!this.videoPath;
});

ChapterSchema.virtual('hasScript').get(function() {
  return !!this.generatedScript;
});

ChapterSchema.virtual('isReadyForProcessing').get(function() {
  return this.status === 'completed' && this.panels.length > 0;
});



ChapterSchema.set('toJSON', { virtuals: true });
ChapterSchema.set('toObject', { virtuals: true });

// Pre-save middleware to update metadata and maintain backward compatibility
ChapterSchema.pre('save', function(next) {
  if (this.isModified('panels')) {
    this.metadata.totalPanels = this.panels.length;
    this.totalPages = this.panels.length;
    
    // Calculate estimated read time (3 seconds per panel by default)
    const avgDuration = this.metadata.averagePanelDuration || 3;
    this.metadata.estimatedReadTime = this.panels.length * avgDuration;
  }
  
  if (this.isModified('generatedScript') && this.generatedScript) {
    this.processingProgress = 75; // Script generated
    this.isProcessed = true;
    this.processingStatus = 'completed';
  }
  
  if (this.isModified('videoUrl') && this.videoUrl) {
    this.status = 'completed';
    this.processingProgress = 100;
    this.isProcessed = true;
    this.processingStatus = 'completed';
  }
  
  next();
});

export default mongoose.model<IChapter>('Chapter', ChapterSchema);
