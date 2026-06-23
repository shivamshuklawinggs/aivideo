import mongoose, { Document, Schema } from 'mongoose';

export interface IMediaAsset extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  assetType: 'image' | 'audio' | 'video' | 'music' | 'thumbnail' | 'archive';
  category?: string;
  name: string;
  description?: string;
  fileUrl: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
    codec?: string;
    bitrate?: number;
    sampleRate?: number;
    channels?: number;
  };
  tags: string[];
  relatedTo?: {
    modelType: 'Webtoon' | 'Chapter' | 'Panel' | 'GeneratedVideo' | 'VoiceProfile';
    modelId: mongoose.Types.ObjectId;
  };
  isPublic: boolean;
  usageCount: number;
  storageProvider: 'local' | 'minio' | 's3';
  createdAt: Date;
  updatedAt: Date;
}

const MediaAssetSchema = new Schema<IMediaAsset>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assetType: {
      type: String,
      enum: ['image', 'audio', 'video', 'music', 'thumbnail', 'archive'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    fileUrl: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    metadata: {
      width: Number,
      height: Number,
      duration: Number,
      format: String,
      codec: String,
      bitrate: Number,
      sampleRate: Number,
      channels: Number,
    },
    tags: {
      type: [String],
      default: [],
    },
    relatedTo: {
      modelType: {
        type: String,
        enum: ['Webtoon', 'Chapter', 'Panel', 'GeneratedVideo', 'VoiceProfile'],
      },
      modelId: Schema.Types.ObjectId,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    storageProvider: {
      type: String,
      enum: ['local', 'minio', 's3'],
      default: 'minio',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

MediaAssetSchema.index({ userId: 1, assetType: 1, createdAt: -1 });
MediaAssetSchema.index({ category: 1 });
MediaAssetSchema.index({ tags: 1 });
MediaAssetSchema.index({ 'relatedTo.modelType': 1, 'relatedTo.modelId': 1 });

export default mongoose.model<IMediaAsset>('MediaAsset', MediaAssetSchema);
