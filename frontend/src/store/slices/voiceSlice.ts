import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { voiceAPI } from '../../services/api/voiceAPI';

interface VoiceProfile {
  _id: string;
  userId: string;
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
  createdAt: string;
  updatedAt: string;
}

interface VoiceState {
  voiceProfiles: VoiceProfile[];
  currentVoiceProfile: VoiceProfile | null;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  isProcessing: boolean;
  processingProgress: number;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: VoiceState = {
  voiceProfiles: [],
  currentVoiceProfile: null,
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  isProcessing: false,
  processingProgress: 0,
  error: null,
  pagination: {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  },
};

// Async thunks
export const fetchVoiceProfiles = createAsyncThunk(
  'voice/fetchVoiceProfiles',
  async (params: { page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await voiceAPI.getVoiceProfiles(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch voice profiles');
    }
  }
);

export const fetchVoiceProfileById = createAsyncThunk(
  'voice/fetchVoiceProfileById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await voiceAPI.getVoiceProfileById(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch voice profile');
    }
  }
);

export const uploadVoiceSample = createAsyncThunk(
  'voice/uploadVoiceSample',
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await voiceAPI.uploadVoiceSample(formData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload voice sample');
    }
  }
);

export const createVoiceProfile = createAsyncThunk(
  'voice/createVoiceProfile',
  async (data: { name: string; description?: string; sampleAudioFile: File; characteristics?: any }, { rejectWithValue }) => {
    try {
      const response = await voiceAPI.createVoiceProfile(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create voice profile');
    }
  }
);

export const updateVoiceProfile = createAsyncThunk(
  'voice/updateVoiceProfile',
  async ({ id, data }: { id: string; data: Partial<VoiceProfile> }, { rejectWithValue }) => {
    try {
      const response = await voiceAPI.updateVoiceProfile(id, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update voice profile');
    }
  }
);

export const deleteVoiceProfile = createAsyncThunk(
  'voice/deleteVoiceProfile',
  async (id: string, { rejectWithValue }) => {
    try {
      await voiceAPI.deleteVoiceProfile(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete voice profile');
    }
  }
);

export const setDefaultVoiceProfile = createAsyncThunk(
  'voice/setDefaultVoiceProfile',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await voiceAPI.setDefaultVoiceProfile(id);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to set default voice profile');
    }
  }
);

export const testVoiceProfile = createAsyncThunk(
  'voice/testVoiceProfile',
  async ({ id, text }: { id: string; text: string }, { rejectWithValue }) => {
    try {
      const response = await voiceAPI.testVoiceProfile(id, text);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to test voice profile');
    }
  }
);

const voiceSlice = createSlice({
  name: 'voice',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentVoiceProfile: (state, action: PayloadAction<VoiceProfile | null>) => {
      state.currentVoiceProfile = action.payload;
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    setProcessingProgress: (state, action: PayloadAction<number>) => {
      state.processingProgress = action.payload;
    },
    clearVoiceState: (state) => {
      state.currentVoiceProfile = null;
      state.isUploading = false;
      state.uploadProgress = 0;
      state.isProcessing = false;
      state.processingProgress = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Voice Profiles
      .addCase(fetchVoiceProfiles.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVoiceProfiles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.voiceProfiles = action.payload.voiceProfiles;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchVoiceProfiles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Voice Profile by ID
      .addCase(fetchVoiceProfileById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVoiceProfileById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentVoiceProfile = action.payload.voiceProfile;
      })
      .addCase(fetchVoiceProfileById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Upload Voice Sample
      .addCase(uploadVoiceSample.pending, (state) => {
        state.isUploading = true;
        state.uploadProgress = 0;
        state.error = null;
      })
      .addCase(uploadVoiceSample.fulfilled, (state, _action) => {
        state.isUploading = false;
        state.uploadProgress = 100;
      })
      .addCase(uploadVoiceSample.rejected, (state, action) => {
        state.isUploading = false;
        state.uploadProgress = 0;
        state.error = action.payload as string;
      })
      // Create Voice Profile
      .addCase(createVoiceProfile.pending, (state) => {
        state.isProcessing = true;
        state.processingProgress = 0;
        state.error = null;
      })
      .addCase(createVoiceProfile.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.processingProgress = 100;
        state.voiceProfiles.unshift(action.payload.voiceProfile);
      })
      .addCase(createVoiceProfile.rejected, (state, action) => {
        state.isProcessing = false;
        state.processingProgress = 0;
        state.error = action.payload as string;
      })
      // Update Voice Profile
      .addCase(updateVoiceProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateVoiceProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.voiceProfiles.findIndex(v => v._id === action.payload.voiceProfile._id);
        if (index !== -1) {
          state.voiceProfiles[index] = action.payload.voiceProfile;
        }
        if (state.currentVoiceProfile?._id === action.payload.voiceProfile._id) {
          state.currentVoiceProfile = action.payload.voiceProfile;
        }
      })
      .addCase(updateVoiceProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete Voice Profile
      .addCase(deleteVoiceProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteVoiceProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.voiceProfiles = state.voiceProfiles.filter(v => v._id !== action.payload);
        if (state.currentVoiceProfile?._id === action.payload) {
          state.currentVoiceProfile = null;
        }
      })
      .addCase(deleteVoiceProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Set Default Voice Profile
      .addCase(setDefaultVoiceProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setDefaultVoiceProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        // Reset all profiles to non-default
        state.voiceProfiles.forEach(profile => {
          profile.isDefault = profile._id === action.payload.voiceProfile._id;
        });
        // Update the current profile if needed
        if (state.currentVoiceProfile) {
          state.currentVoiceProfile.isDefault = state.currentVoiceProfile._id === action.payload.voiceProfile._id;
        }
      })
      .addCase(setDefaultVoiceProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentVoiceProfile, setUploadProgress, setProcessingProgress, clearVoiceState } = voiceSlice.actions;
export default voiceSlice.reducer;
