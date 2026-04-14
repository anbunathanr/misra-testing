import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { authService, UserInfo } from '../../services/auth-service';

interface User {
  id: string;
  userId: string;
  email: string;
  name: string;
  role?: string;
  organizationId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,  // start true so ProtectedRoute waits for checkAuth
  error: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const result = await authService.login(email, password);
      // Token storage is now handled by authService.login() via storeTokens()
      // Just store user info for backward compatibility
      localStorage.setItem('user', JSON.stringify(result.user));
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ email, password, name }: { email: string; password: string; name: string }, { rejectWithValue }) => {
    try {
      await authService.register(email, password, name);
      return { email, name };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      // authService.logout() now handles clearing all tokens via clearTokens()
      localStorage.removeItem('user');
      localStorage.removeItem('demo-mode'); // Remove demo mode flag
    } catch (error: any) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      // Try to restore session with automatic token refresh
      const session = await authService.restoreSession();
      
      if (session) {
        return { token: session.token, user: session.user };
      }
      
      // Fallback: Check localStorage directly
      const token = await authService.getToken();
      const userInfo = await authService.getUserInfo();
      
      if (token && userInfo) {
        return { token, user: userInfo };
      }
      
      // Final fallback: Check raw localStorage
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        return { token: storedToken, user: JSON.parse(storedUser) };
      }
      
      return rejectWithValue('Not authenticated');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Authentication check failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: UserInfo; token: string }>
    ) => {
      state.user = {
        id: action.payload.user.sub,
        userId: action.payload.user.sub,
        email: action.payload.user.email,
        name: action.payload.user.name,
      };
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.loading = false;
      state.user = {
        id: action.payload.user.sub,
        userId: action.payload.user.sub,
        email: action.payload.user.email,
        name: action.payload.user.name,
      };
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
      state.isAuthenticated = false;
    });

    // Register
    builder.addCase(registerUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(registerUser.fulfilled, (state) => {
      state.loading = false;
      state.error = null;
    });
    builder.addCase(registerUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    });

    // Check auth
    builder.addCase(checkAuth.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(checkAuth.fulfilled, (state, action) => {
      state.loading = false;
      state.user = {
        id: action.payload.user.sub,
        userId: action.payload.user.sub,
        email: action.payload.user.email,
        name: action.payload.user.name,
      };
      state.token = action.payload.token;
      state.isAuthenticated = true;
    });
    builder.addCase(checkAuth.rejected, (state) => {
      state.loading = false;
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    });
  },
});

export const { setCredentials, clearError } = authSlice.actions;
export default authSlice.reducer;
