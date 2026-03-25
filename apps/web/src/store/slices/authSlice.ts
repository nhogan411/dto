import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { authApi, type LoginParams, type RegisterParams, type User, type UserRole } from '../../api/auth';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'authUser';

type AuthStatus = 'idle' | 'loading' | 'failed';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: AuthStatus;
}

interface CredentialsPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RefreshTokenPayload {
  accessToken: string;
}

const getStoredToken = (key: string) =>
  typeof localStorage === 'undefined' ? null : localStorage.getItem(key);

const getStoredUser = (): User | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) {
    return null;
  }
  
  try {
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      role: (parsed.role as UserRole) ?? 'player',
    };
  } catch {
    return null;
  }
};

const persistTokens = (accessToken: string, refreshToken: string) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

const persistUser = (user: User) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const removeTokens = () => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const persistAccessToken = (accessToken: string) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
};

const applyCredentials = (state: AuthState, payload: CredentialsPayload) => {
  state.user = payload.user;
  state.accessToken = payload.accessToken;
  state.refreshToken = payload.refreshToken;
  state.status = 'idle';
  persistTokens(payload.accessToken, payload.refreshToken);
  persistUser(payload.user);
};

const clearAuthState = (state: AuthState) => {
  state.user = null;
  state.accessToken = null;
  state.refreshToken = null;
  state.status = 'idle';
  removeTokens();
};

const applyUserUpdate = (state: AuthState, payload: Partial<User>) => {
  if (!state.user) {
    return;
  }

  state.user = { ...state.user, ...payload };
  persistUser(state.user);
};

const initialState: AuthState = {
  user: getStoredUser(),
  accessToken: getStoredToken(ACCESS_TOKEN_KEY),
  refreshToken: getStoredToken(REFRESH_TOKEN_KEY),
  status: 'idle',
};

export const loginThunk = createAsyncThunk<CredentialsPayload, LoginParams>(
  'auth/login',
  async (credentials) => {
    const response = await authApi.login(credentials);

    return {
      user: response.data.data.user,
      accessToken: response.data.data.access_token,
      refreshToken: response.data.data.refresh_token,
    };
  },
);

export const registerThunk = createAsyncThunk<CredentialsPayload, RegisterParams>(
  'auth/register',
  async (params) => {
    const response = await authApi.signup(params);

    return {
      user: response.data.data.user,
      accessToken: response.data.data.access_token,
      refreshToken: response.data.data.refresh_token,
    };
  },
);

export const refreshTokenThunk = createAsyncThunk<RefreshTokenPayload, string>(
  'auth/refreshToken',
  async (refreshToken) => {
    const response = await authApi.refreshToken(refreshToken);

    return {
      accessToken: response.data.data.access_token,
    };
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<CredentialsPayload>) => {
      applyCredentials(state, action.payload);
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      applyUserUpdate(state, action.payload);
    },
    clearCredentials: (state) => {
      clearAuthState(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        applyCredentials(state, action.payload);
      })
      .addCase(loginThunk.rejected, (state) => {
        state.status = 'failed';
      })
      .addCase(registerThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        applyCredentials(state, action.payload);
      })
      .addCase(registerThunk.rejected, (state) => {
        state.status = 'failed';
      })
      .addCase(refreshTokenThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(refreshTokenThunk.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.status = 'idle';
        persistAccessToken(action.payload.accessToken);
      })
      .addCase(refreshTokenThunk.rejected, (state) => {
        state.status = 'failed';
      });
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export const { updateUser } = authSlice.actions;

export const selectIsAdmin = (state: RootState) =>
  state.auth.user?.role === 'admin';

export default authSlice.reducer;
