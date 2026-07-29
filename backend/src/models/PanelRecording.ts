import mongoose, { Schema, Document, Model } from 'mongoose';

export type RecordingStatus = 'not_started' | 'recording' | 'completed' | 'skipped' | 'failed';

export interface IPanelRecording extends Document {
  chapterId: number;
  panelId: string;
  panelOrder: number;
  audioFile: string;
  duration: number;
  fileSize: number;
  status: RecordingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PanelRecordingSchema = new Schema<IPanelRecording>(
  {
    chapterId: {
      type: Number,
      required: true,
      index: true,
    },
    panelId: {
      type: String,
      required: true,
      index: true,
    },
    panelOrder: {
      type: Number,
      required: true,
    },
    audioFile: {
      type: String,
      default: '',
    },
    duration: {
      type: Number,
      default: 0,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['not_started', 'recording', 'completed', 'skipped', 'failed'],
      default: 'not_started',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PanelRecordingSchema.index({ chapterId: 1, panelId: 1 }, { unique: true });
PanelRecordingSchema.index({ chapterId: 1, panelOrder: 1 });

const PanelRecording: Model<IPanelRecording> = mongoose.model<IPanelRecording>('PanelRecording', PanelRecordingSchema);

export default PanelRecording;
