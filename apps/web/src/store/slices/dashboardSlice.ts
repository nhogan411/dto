import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { gameApi } from '../../api/game';
import type { ApiGame } from '../../api/game';

interface DashboardState {
  games: ApiGame[];
  gamesStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: DashboardState = {
  games: [],
  gamesStatus: 'idle',
};

export const fetchGamesThunk = createAsyncThunk('dashboard/fetchGames', async () => {
  const response = await gameApi.listGames();

  const payload = (response.data as { data: unknown }).data;

  if (Array.isArray(payload)) {
    return payload;
  }

  const nestedGames = (payload as { games?: unknown } | null)?.games;

  if (Array.isArray(nestedGames)) {
    return nestedGames as ApiGame[];
  }

  return [] as ApiGame[];
});

export const declineGameThunk = createAsyncThunk('dashboard/declineGame', async (id: number) => {
  const response = await gameApi.declineGame(id);
  return response.data.data.game;
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGamesThunk.pending, (state) => {
        state.gamesStatus = 'loading';
      })
      .addCase(fetchGamesThunk.fulfilled, (state, action) => {
        state.gamesStatus = 'succeeded';
        state.games = action.payload;
      })
      .addCase(fetchGamesThunk.rejected, (state) => {
        state.gamesStatus = 'failed';
      })
      .addCase(declineGameThunk.fulfilled, (state, action) => {
        const index = state.games.findIndex((g) => g.id === action.payload.id);
        if (index !== -1) {
          state.games[index] = action.payload;
        }
      });
  },
});

export default dashboardSlice.reducer;
