import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPanelAnalysis {
  panelIndex: number;
  imageUrl: string;
  ocr: {
    speech: string[];
    narration: string[];
    captions: string[];
    soundEffects: string[];
    rawText: string;
  };
  vision: {
    characters: string[];
    actions: string[];
    emotions: string[];
    scene: string;
    objects: string[];
    importantEvents: string[];
    description: string;
  };
  duration?: number; // seconds assigned for timeline
  startTime?: number; // seconds
  endTime?: number; // seconds
}

export interface IChapterAnalysis extends Document {
  chapterId: number;
  mangaId: number;
  chapterTitle: string;
  panelCount: number;
  panels: IPanelAnalysis[];
  combinedText: string;
  story: {
    title: string;
    narrative: string;
    summary: string;
    narrationScript: string;
  };
  timeline: Array<{
    panelIndex: number;
    startTime: number;
    endTime: number;
    duration: number;
    narrationSegment: string;
  }>;
  totalDuration: number; // seconds
  audioFile?: string;
  subtitleFile?: string;
  videoFile?: string;
  thumbnailFile?: string;
  status: 'pending' | 'analyzing' | 'analyzed' | 'narrated' | 'video_ready' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const PanelAnalysisSchema = new Schema<IPanelAnalysis>({
  panelIndex: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  ocr: {
    speech: [String],
    narration: [String],
    captions: [String],
    soundEffects: [String],
    rawText: { type: String, default: '' },
  },
  vision: {
    characters: [String],
    actions: [String],
    emotions: [String],
    scene: { type: String, default: '' },
    objects: [String],
    importantEvents: [String],
    description: { type: String, default: '' },
  },
  duration: Number,
  startTime: Number,
  endTime: Number,
}, { _id: false });

const ChapterAnalysisSchema = new Schema<IChapterAnalysis>(
  {
    chapterId: { type: Number, required: true, unique: true, index: true },
    mangaId: { type: Number, required: true, index: true },
    chapterTitle: { type: String, default: '' },
    panelCount: { type: Number, default: 0 },
    panels: { type: [PanelAnalysisSchema], default: [] },
    combinedText: { type: String, default: '' },
    story: {
      title: { type: String, default: '' },
      narrative: { type: String, default: '' },
      summary: { type: String, default: '' },
      narrationScript: { type: String, default: '' },
    },
    timeline: [{
      panelIndex: Number,
      startTime: Number,
      endTime: Number,
      duration: Number,
      narrationSegment: String,
    }],
    totalDuration: { type: Number, default: 0 },
    audioFile: String,
    subtitleFile: String,
    videoFile: String,
    thumbnailFile: String,
    status: { type: String, enum: ['pending', 'analyzing', 'analyzed', 'narrated', 'video_ready', 'failed'], default: 'pending' },
  },
  { timestamps: true }
);

ChapterAnalysisSchema.index({ mangaId: 1, chapterId: 1 }, { unique: true });

const ChapterAnalysis: Model<IChapterAnalysis> = mongoose.model<IChapterAnalysis>('ChapterAnalysis', ChapterAnalysisSchema);

export default ChapterAnalysis;
