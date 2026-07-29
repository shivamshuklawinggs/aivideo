import mongoose, { Schema, Document, Model } from 'mongoose';

export type SessionStatus = 'active' | 'paused' | 'finished' | 'failed';

export interface IRecordingSession extends Document {
  chapterId: number;
  mangaId?: number;
  currentPanelId?: string;
  currentPanelOrder: number;
  status: SessionStatus;
  completedPanels: string[];
  skippedPanels: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RecordingSessionSchema = new Schema<IRecordingSession>(
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
    currentPanelId: {
      type: String,
      default: '',
    },
    currentPanelOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'finished', 'failed'],
      default: 'active',
      index: true,
    },
    completedPanels: {
      type: [String],
      default: [],
    },
    skippedPanels: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

RecordingSessionSchema.index({ chapterId: 1 });

const RecordingSession: Model<IRecordingSession> = mongoose.model<IRecordingSession>('RecordingSession', RecordingSessionSchema);

export default RecordingSession;
