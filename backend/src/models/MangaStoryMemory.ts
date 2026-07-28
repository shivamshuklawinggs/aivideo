import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChapterMemory {
  chapterId: number;
  chapterTitle: string;
  summary: string;
  keyEvents: string[];
  characters: string[];
  createdAt: Date;
}

export interface IMangaStoryMemory extends Document {
  mangaId: number;
  overallSummary: string;
  mainCharacters: string[];
  recentChapters: IChapterMemory[];
  updatedAt: Date;
  createdAt: Date;
}

const ChapterMemorySchema = new Schema<IChapterMemory>({
  chapterId: { type: Number, required: true },
  chapterTitle: { type: String, default: '' },
  summary: { type: String, default: '' },
  keyEvents: { type: [String], default: [] },
  characters: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const MangaStoryMemorySchema = new Schema<IMangaStoryMemory>(
  {
    mangaId: { type: Number, required: true, unique: true, index: true },
    overallSummary: { type: String, default: '' },
    mainCharacters: { type: [String], default: [] },
    recentChapters: { type: [ChapterMemorySchema], default: [] },
  },
  { timestamps: true }
);

MangaStoryMemorySchema.index({ mangaId: 1 });

const MangaStoryMemory: Model<IMangaStoryMemory> = mongoose.model<IMangaStoryMemory>('MangaStoryMemory', MangaStoryMemorySchema);

export default MangaStoryMemory;
