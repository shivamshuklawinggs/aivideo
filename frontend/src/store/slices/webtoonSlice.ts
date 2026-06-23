import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { webtoonAPI } from '../../services/api/webtoonAPI';

interface Webtoon {
  _id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  genres: string[];
  author?: string;
  status: 'ongoing' | 'completed' | 'hiatus';
  totalChapters: number;
  archiveFileName: string;
  archiveFileSize: number;
  metadata: {
    totalPanels?: number;
    averagePanelsPerChapter?: number;
    estimatedReadTime?: number;
  };
  tags: string[];
  rating?: number;
  views: number;
  isPublic: boolean;
  isProcessed: boolean;
  processingStatus: 'pending' | 'extracting' | 'processing' | 'completed' | 'failed';
  processingProgress: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface Chapter {
  _id: string;
  webtoonId: string;
  chapterNumber: number;
  title?: string;
  description?: string;
  thumbnail?: string;
  panelCount: number;
  sequence: number;
  folderPath: string;
  metadata: {
    estimatedReadTime?: number;
    totalFileSize?: number;
    averagePanelSize?: number;
  };
  isProcessed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  views: number;
  createdAt: string;
  updatedAt: string;
}

interface Panel {
  _id: string;
  chapterId: string;
  webtoonId: string;
  panelNumber: number;
  sequence: number;
  imageUrl: string;
  imagePath: string;
  thumbnailUrl?: string;
  metadata: {
    width?: number;
    height?: number;
    format?: string;
    fileSize?: number;
    aspectRatio?: number;
  };
  aiAnalysis?: {
    description?: string;
    detectedCharacters?: string[];
    detectedObjects?: string[];
    sceneType?: string;
    emotions?: string[];
    dialogueDetected?: boolean;
    actionLevel?: 'low' | 'medium' | 'high';
  };
  isProcessed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WebtoonState {
  webtoons: Webtoon[];
  currentWebtoon: Webtoon | null;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  panels: Panel[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: WebtoonState = {
  webtoons: [],
  currentWebtoon: null,
  chapters: [],
  currentChapter: null,
  panels: [],
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  error: null,
  pagination: {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  },
};

// Async thunks
export const fetchWebtoons = createAsyncThunk(
  'webtoon/fetchWebtoons',
  async (params: { page?: number; limit?: number; search?: string }, { rejectWithValue }) => {
    try {
      const response = await webtoonAPI.getWebtoons(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch webtoons');
    }
  }
);

export const fetchWebtoonById = createAsyncThunk(
  'webtoon/fetchWebtoonById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await webtoonAPI.getWebtoonById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch webtoon');
    }
  }
);

export const uploadWebtoon = createAsyncThunk(
  'webtoon/uploadWebtoon',
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await webtoonAPI.uploadWebtoon(formData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload webtoon');
    }
  }
);

export const fetchChapters = createAsyncThunk(
  'webtoon/fetchChapters',
  async (webtoonId: string, { rejectWithValue }) => {
    try {
      const response = await webtoonAPI.getChapters(webtoonId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch chapters');
    }
  }
);

export const fetchChapterById = createAsyncThunk(
  'webtoon/fetchChapterById',
  async ({ webtoonId, chapterId }: { webtoonId: string; chapterId: string }, { rejectWithValue }) => {
    try {
      const response = await webtoonAPI.getChapterById(webtoonId, chapterId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch chapter');
    }
  }
);

export const fetchPanels = createAsyncThunk(
  'webtoon/fetchPanels',
  async (chapterId: string, { rejectWithValue }) => {
    try {
      const response = await webtoonAPI.getPanels(chapterId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch panels');
    }
  }
);

export const updateWebtoon = createAsyncThunk(
  'webtoon/updateWebtoon',
  async ({ id, data }: { id: string; data: Partial<Webtoon> }, { rejectWithValue }) => {
    try {
      const response = await webtoonAPI.updateWebtoon(id, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update webtoon');
    }
  }
);

export const deleteWebtoon = createAsyncThunk(
  'webtoon/deleteWebtoon',
  async (id: string, { rejectWithValue }) => {
    try {
      await webtoonAPI.deleteWebtoon(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete webtoon');
    }
  }
);

const webtoonSlice = createSlice({
  name: 'webtoon',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentWebtoon: (state, action: PayloadAction<Webtoon | null>) => {
      state.currentWebtoon = action.payload;
    },
    setCurrentChapter: (state, action: PayloadAction<Chapter | null>) => {
      state.currentChapter = action.payload;
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    clearWebtoonState: (state) => {
      state.currentWebtoon = null;
      state.chapters = [];
      state.currentChapter = null;
      state.panels = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Webtoons
      .addCase(fetchWebtoons.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWebtoons.fulfilled, (state, action) => {
        state.isLoading = false;
        state.webtoons = action.payload.webtoons;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchWebtoons.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Webtoon by ID
      .addCase(fetchWebtoonById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWebtoonById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentWebtoon = action.payload.webtoon;
      })
      .addCase(fetchWebtoonById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Upload Webtoon
      .addCase(uploadWebtoon.pending, (state) => {
        state.isUploading = true;
        state.uploadProgress = 0;
        state.error = null;
      })
      .addCase(uploadWebtoon.fulfilled, (state, action) => {
        state.isUploading = false;
        state.uploadProgress = 100;
        state.webtoons.unshift(action.payload.webtoon);
      })
      .addCase(uploadWebtoon.rejected, (state, action) => {
        state.isUploading = false;
        state.uploadProgress = 0;
        state.error = action.payload as string;
      })
      // Fetch Chapters
      .addCase(fetchChapters.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchChapters.fulfilled, (state, action) => {
        state.isLoading = false;
        state.chapters = action.payload.chapters;
      })
      .addCase(fetchChapters.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Chapter by ID
      .addCase(fetchChapterById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchChapterById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentChapter = action.payload.chapter;
      })
      .addCase(fetchChapterById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Panels
      .addCase(fetchPanels.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPanels.fulfilled, (state, action) => {
        state.isLoading = false;
        state.panels = action.payload.panels;
      })
      .addCase(fetchPanels.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Webtoon
      .addCase(updateWebtoon.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateWebtoon.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.webtoons.findIndex(w => w._id === action.payload.webtoon._id);
        if (index !== -1) {
          state.webtoons[index] = action.payload.webtoon;
        }
        if (state.currentWebtoon?._id === action.payload.webtoon._id) {
          state.currentWebtoon = action.payload.webtoon;
        }
      })
      .addCase(updateWebtoon.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete Webtoon
      .addCase(deleteWebtoon.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteWebtoon.fulfilled, (state, action) => {
        state.isLoading = false;
        state.webtoons = state.webtoons.filter(w => w._id !== action.payload);
        if (state.currentWebtoon?._id === action.payload) {
          state.currentWebtoon = null;
        }
      })
      .addCase(deleteWebtoon.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentWebtoon, setCurrentChapter, setUploadProgress, clearWebtoonState } = webtoonSlice.actions;
export default webtoonSlice.reducer;
