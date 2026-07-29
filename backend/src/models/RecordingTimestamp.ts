import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IRecordingTimestamp extends Document {
  chapterId: number;
  mergedAudioId: Types.ObjectId;
  panelId: string;
  panelOrder: number;
  start: number;
  end: number;
  createdAt: Date;
}

const RecordingTimestampSchema = new Schema<IRecordingTimestamp>(
  {
    chapterId: {
      type: Number,
      required: true,
      index: true,
    },
    mergedAudioId: {
      type: Schema.Types.ObjectId,
      ref: 'MergedAudio',
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
    start: {
      type: Number,
      required: true,
    },
    end: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

RecordingTimestampSchema.index({ chapterId: 1, panelOrder: 1 });
RecordingTimestampSchema.index({ mergedAudioId: 1 });

const RecordingTimestamp: Model<IRecordingTimestamp> = mongoose.model<IRecordingTimestamp>('RecordingTimestamp', RecordingTimestampSchema);

export default RecordingTimestamp;
