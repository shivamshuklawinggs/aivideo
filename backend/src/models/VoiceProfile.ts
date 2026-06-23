import mongoose, { Document, Schema } from 'mongoose';

export interface IVoiceProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  sampleAudioUrl: string;
  sampleAudioPath: string;
  embeddingFile?: string;
  voiceCharacteristics: {
    gender?: 'male' | 'female' | 'neutral';
    ageRange?: 'child' | 'young' | 'adult' | 'senior';
    accent?: string;
    tone?: string;
  };
  status: 'pending' | 'processing' | 'ready' | 'failed';
  processingProgress: number;
  errorMessage?: string;
  metadata: {
    duration?: number;
    sampleRate?: number;
    bitrate?: number;
    format?: string;
    fileSize?: number;
  };
  usageCount: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VoiceProfileSchema = new Schema<IVoiceProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Voice profile name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    sampleAudioUrl: {
      type: String,
      required: true,
    },
    sampleAudioPath: {
      type: String,
      required: true,
    },
    embeddingFile: {
      type: String,
    },
    voiceCharacteristics: {
      gender: {
        type: String,
        enum: ['male', 'female', 'neutral'],
      },
      ageRange: {
        type: String,
        enum: ['child', 'young', 'adult', 'senior'],
      },
      accent: String,
      tone: String,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'failed'],
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
    metadata: {
      duration: Number,
      sampleRate: Number,
      bitrate: Number,
      format: String,
      fileSize: Number,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

VoiceProfileSchema.index({ userId: 1, createdAt: -1 });
VoiceProfileSchema.index({ status: 1 });
VoiceProfileSchema.index({ userId: 1, isDefault: 1 });

export default mongoose.model<IVoiceProfile>('VoiceProfile', VoiceProfileSchema);
