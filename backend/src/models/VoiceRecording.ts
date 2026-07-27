import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVoiceRecording extends Document {
  chapterId: string;
  pageId: number;
  audioFile: string;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

const VoiceRecordingSchema = new Schema<IVoiceRecording>(
  {
    chapterId: {
      type: String,
      required: true,
    },
    pageId: {
      type: Number,
      required: true,
    },
    audioFile: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for chapterId and pageId
VoiceRecordingSchema.index({ chapterId: 1, pageId: 1 }, { unique: true });
VoiceRecordingSchema.index({ chapterId: 1 });

const VoiceRecording: Model<IVoiceRecording> = mongoose.model<IVoiceRecording>('VoiceRecording', VoiceRecordingSchema);

export default VoiceRecording;
