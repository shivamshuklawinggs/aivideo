import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { videoAPI } from '../../services/api/videoAPI';

interface VideoScene {
  sceneNumber: number;
  panelId: string;
  panelUrl: string;
  duration: number;
  startTime: number;
  endTime: number;
  animationType: string;
  animationConfig: Record<string, any>;
  narrationSegment?: string;
  subtitleSegments?: {
    text: string;
    startTime: number;
    endTime: number;
    words?: {
      word: string;
      startTime: number;
      endTime: number;
    }[];
  }[];
}

interface GeneratedVideo {
  _id: string;
  userId: string;
  webtoonId: string;
  chapterId?: string;
  scriptId: string;
  voiceProfileId?: string;
  title: string;
  description?: string;
  thumbnail?: string;
  videoUrl?: string;
  videoPath?: string;
  scenes: VideoScene[];
  audioConfig: {
    narrationAudioUrl?: string;
    backgroundMusicUrl?: string;
    musicCategory?: string;
    narrationVolume: number;
    musicVolume: number;
    fadeInDuration: number;
    fadeOutDuration: number;
  };
  videoConfig: {
    resolution: '1080p' | '1440p' | '4K';
    fps: number;
    format: 'mp4' | 'mov';
    codec: string;
    bitrate: string;
    aspectRatio: string;
  };
  subtitleConfig: {
    enabled: boolean;
    style: string;
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
    position: 'top' | 'center' | 'bottom';
    karaokeEffect: boolean;
  };
  metadata: {
    totalDuration: number;
    fileSize?: number;
    sceneCount: number;
    generationTime?: number;
  };
  status: 'draft' | 'rendering' | 'completed' | 'failed';
  renderProgress: number;
  errorMessage?: string;
  views: number;
  likes: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RenderJob {
  _id: string;
  userId: string;
  videoId: string;
  jobType: 'video_generation' | 'audio_generation' | 'subtitle_generation' | 'final_render';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  progress: number;
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletionTime?: string;
  processingTime?: number;
  errorMessage?: string;
  errorStack?: string;
  retryCount: number;
  maxRetries: number;
  metadata: {
    inputFiles?: string[];
    outputFiles?: string[];
    resolution?: string;
    duration?: number;
    fileSize?: number;
  };
  logs: {
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    message: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface VideoState {
  videos: GeneratedVideo[];
  currentVideo: GeneratedVideo | null;
  renderJobs: RenderJob[];
  currentRenderJob: RenderJob | null;
  isLoading: boolean;
  isGenerating: boolean;
  isRendering: boolean;
  renderProgress: number;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  editorState: {
    selectedScene: number | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    playbackRate: number;
  };
}

const initialState: VideoState = {
  videos: [],
  currentVideo: null,
  renderJobs: [],
  currentRenderJob: null,
  isLoading: false,
  isGenerating: false,
  isRendering: false,
  renderProgress: 0,
  error: null,
  pagination: {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  },
  editorState: {
    selectedScene: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
  },
};

// Async thunks
export const fetchVideos = createAsyncThunk(
  'video/fetchVideos',
  async (params: { page?: number; limit?: number; status?: string }, { rejectWithValue }) => {
    try {
      const response = await videoAPI.getVideos(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch videos');
    }
  }
);

export const fetchVideoById = createAsyncThunk(
  'video/fetchVideoById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await videoAPI.getVideoById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch video');
    }
  }
);

export const generateVideo = createAsyncThunk(
  'video/generateVideo',
  async (data: { scriptId: string; voiceProfileId?: string; title: string; config?: any }, { rejectWithValue }) => {
    try {
      const response = await videoAPI.generateVideo(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate video');
    }
  }
);

export const updateVideo = createAsyncThunk(
  'video/updateVideo',
  async ({ id, data }: { id: string; data: Partial<GeneratedVideo> }, { rejectWithValue }) => {
    try {
      const response = await videoAPI.updateVideo(id, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update video');
    }
  }
);

export const renderVideo = createAsyncThunk(
  'video/renderVideo',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await videoAPI.renderVideo(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to render video');
    }
  }
);

export const fetchRenderJobs = createAsyncThunk(
  'video/fetchRenderJobs',
  async (params: { page?: number; limit?: number; status?: string }, { rejectWithValue }) => {
    try {
      const response = await videoAPI.getRenderJobs(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch render jobs');
    }
  }
);

export const fetchRenderJobById = createAsyncThunk(
  'video/fetchRenderJobById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await videoAPI.getRenderJobById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch render job');
    }
  }
);

export const cancelRenderJob = createAsyncThunk(
  'video/cancelRenderJob',
  async (id: string, { rejectWithValue }) => {
    try {
      await videoAPI.cancelRenderJob(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel render job');
    }
  }
);

export const deleteVideo = createAsyncThunk(
  'video/deleteVideo',
  async (id: string, { rejectWithValue }) => {
    try {
      await videoAPI.deleteVideo(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete video');
    }
  }
);

const videoSlice = createSlice({
  name: 'video',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentVideo: (state, action: PayloadAction<GeneratedVideo | null>) => {
      state.currentVideo = action.payload;
    },
    setRenderProgress: (state, action: PayloadAction<number>) => {
      state.renderProgress = action.payload;
    },
    updateEditorState: (state, action: PayloadAction<Partial<VideoState['editorState']>>) => {
      state.editorState = { ...state.editorState, ...action.payload };
    },
    setSelectedScene: (state, action: PayloadAction<number | null>) => {
      state.editorState.selectedScene = action.payload;
    },
    setPlaying: (state, action: PayloadAction<boolean>) => {
      state.editorState.isPlaying = action.payload;
    },
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.editorState.currentTime = action.payload;
    },
    clearVideoState: (state) => {
      state.currentVideo = null;
      state.currentRenderJob = null;
      state.isGenerating = false;
      state.isRendering = false;
      state.renderProgress = 0;
      state.editorState = {
        selectedScene: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        playbackRate: 1,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Videos
      .addCase(fetchVideos.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVideos.fulfilled, (state, action) => {
        state.isLoading = false;
        state.videos = action.payload.videos;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchVideos.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Video by ID
      .addCase(fetchVideoById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVideoById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentVideo = action.payload.video;
        state.editorState.duration = action.payload.video.metadata.totalDuration;
      })
      .addCase(fetchVideoById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Generate Video
      .addCase(generateVideo.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateVideo.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.currentVideo = action.payload.video;
        state.videos.unshift(action.payload.video);
      })
      .addCase(generateVideo.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload as string;
      })
      // Update Video
      .addCase(updateVideo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateVideo.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.videos.findIndex(v => v._id === action.payload.video._id);
        if (index !== -1) {
          state.videos[index] = action.payload.video;
        }
        if (state.currentVideo?._id === action.payload.video._id) {
          state.currentVideo = action.payload.video;
        }
      })
      .addCase(updateVideo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Render Video
      .addCase(renderVideo.pending, (state) => {
        state.isRendering = true;
        state.renderProgress = 0;
        state.error = null;
      })
      .addCase(renderVideo.fulfilled, (state, action) => {
        state.isRendering = true;
        state.currentRenderJob = action.payload.renderJob;
      })
      .addCase(renderVideo.rejected, (state, action) => {
        state.isRendering = false;
        state.error = action.payload as string;
      })
      // Fetch Render Jobs
      .addCase(fetchRenderJobs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRenderJobs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.renderJobs = action.payload.renderJobs;
      })
      .addCase(fetchRenderJobs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Render Job by ID
      .addCase(fetchRenderJobById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRenderJobById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRenderJob = action.payload.renderJob;
        state.renderProgress = action.payload.renderJob.progress;
        if (action.payload.renderJob.status === 'completed' || action.payload.renderJob.status === 'failed') {
          state.isRendering = false;
        }
      })
      .addCase(fetchRenderJobById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Cancel Render Job
      .addCase(cancelRenderJob.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelRenderJob.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isRendering = false;
        if (state.currentRenderJob?._id === action.payload) {
          state.currentRenderJob.status = 'cancelled';
        }
      })
      .addCase(cancelRenderJob.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete Video
      .addCase(deleteVideo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteVideo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.videos = state.videos.filter(v => v._id !== action.payload);
        if (state.currentVideo?._id === action.payload) {
          state.currentVideo = null;
        }
      })
      .addCase(deleteVideo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setCurrentVideo,
  setRenderProgress,
  updateEditorState,
  setSelectedScene,
  setPlaying,
  setCurrentTime,
  clearVideoState,
} = videoSlice.actions;

export default videoSlice.reducer;
