import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'premium';
  subscription: {
    plan: 'free' | 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'cancelled' | 'expired';
  };
  usage: {
    videosGenerated: number;
    storageUsed: number;
    monthlyVideoLimit: number;
    monthlyStorageLimit: number;
  };
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const GUEST_USER: User = {
  _id: 'local-user',
  email: 'guest@aivideo.local',
  name: 'Guest User',
  role: 'admin',
  subscription: { plan: 'enterprise', status: 'active' },
  usage: {
    videosGenerated: 0,
    storageUsed: 0,
    monthlyVideoLimit: 1000,
    monthlyStorageLimit: 10737418240,
  },
  preferences: { theme: 'dark', language: 'en', notifications: true },
};

const loadStoredUser = (): User => {
  if (typeof window === 'undefined') return GUEST_USER;
  try {
    const stored = localStorage.getItem('user');
    if (stored) return JSON.parse(stored);
  } catch {}
  return GUEST_USER;
};

const initialState: AuthState = {
  user: loadStoredUser(),
  token: 'local-session',
  isAuthenticated: true,
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    if (!credentials.email || !credentials.password) {
      return rejectWithValue('Email and password are required');
    }
    const user: User = {
      ...GUEST_USER,
      _id: `local-${Date.now()}`,
      email: credentials.email,
      name: credentials.email.split('@')[0],
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
    return { user };
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: { email: string; password: string; name: string }, { rejectWithValue }) => {
    if (!userData.email || !userData.password) {
      return rejectWithValue('Email and password are required');
    }
    const user: User = {
      ...GUEST_USER,
      _id: `local-${Date.now()}`,
      email: userData.email,
      name: userData.name || userData.email.split('@')[0],
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
    return { user };
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData: Partial<User>, { getState }) => {
    const state = getState() as { auth: AuthState };
    const updatedUser = { ...state.auth.user, ...userData } as User;
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    return updatedUser;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    setCredentials: (state, action: PayloadAction<{ user: User }>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = GUEST_USER;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(updateProfile.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;
