import mongoose, { Schema, Document, Model } from 'mongoose';

export type MergeStatus = 'pending' | 'merging' | 'completed' | 'failed';

export interface IMergedAudio extends Document {
  chapterId: number;
  mangaId?: number;
  audioFile: string;
  duration: number;
  status: MergeStatus;
  progress: number;
  error?: string;
  timestampsFile?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MergedAudioSchema = new Schema<IMergedAudio>(
  {
    chapterId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    mangaId: {
      type: Number,
      index: true,
    },
    audioFile: {
      type: String,
      default: '',
    },
    duration: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'merging', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
      default: '',
    },
    timestampsFile: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

MergedAudioSchema.index({ chapterId: 1, status: 1 });

const MergedAudio: Model<IMergedAudio> = mongoose.model<IMergedAudio>('MergedAudio', MergedAudioSchema);

export default MergedAudio;
