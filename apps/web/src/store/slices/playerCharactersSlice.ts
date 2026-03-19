import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { playerCharactersApi, type PlayerCharacter, type UpdatePlayerCharacterPayload } from '../../api/playerCharactersApi';

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface PlayerCharactersState {
  characters: PlayerCharacter[];
  status: RequestStatus;
  updateStatus: RequestStatus;
  error: string | null;
}

const initialState: PlayerCharactersState = {
  characters: [],
  status: 'idle',
  updateStatus: 'idle',
  error: null,
};

export const fetchPlayerCharactersThunk = createAsyncThunk(
  'playerCharacters/fetchAll',
  async () => {
    return await playerCharactersApi.getPlayerCharacters();
  }
);

export const updatePlayerCharacterThunk = createAsyncThunk<
  PlayerCharacter,
  { id: number; payload: UpdatePlayerCharacterPayload }
>(
  'playerCharacters/update',
  async ({ id, payload }) => {
    const response = await playerCharactersApi.updatePlayerCharacter(id, payload);
    return response.data;
  }
);

const playerCharactersSlice = createSlice({
  name: 'playerCharacters',
  initialState,
  reducers: {
    resetUpdateStatus: (state) => {
      state.updateStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlayerCharactersThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPlayerCharactersThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.characters = action.payload;
      })
      .addCase(fetchPlayerCharactersThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch characters';
      })
      .addCase(updatePlayerCharacterThunk.pending, (state) => {
        state.updateStatus = 'loading';
        state.error = null;
      })
      .addCase(updatePlayerCharacterThunk.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const index = state.characters.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.characters[index] = action.payload;
        }
      })
      .addCase(updatePlayerCharacterThunk.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.error = action.error.message || 'Failed to update character';
      });
  },
});

export const { resetUpdateStatus } = playerCharactersSlice.actions;
export default playerCharactersSlice.reducer;
