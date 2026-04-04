import { describe, it, expect } from 'vitest';
import reducer, {
  resetUpdateStatus,
  fetchPlayerCharactersThunk,
  updatePlayerCharacterThunk,
  type PlayerCharactersState,
} from './playerCharactersSlice';
import { type PlayerCharacter } from '../../api/playerCharactersApi';

describe('playerCharactersSlice', () => {
  const initialState: PlayerCharactersState = {
    characters: [],
    status: 'idle',
    updateStatus: 'idle',
    error: null,
  };

  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle resetUpdateStatus', () => {
    const state = { ...initialState, updateStatus: 'succeeded' as const };
    expect(reducer(state, resetUpdateStatus())).toEqual({
      ...state,
      updateStatus: 'idle',
    });
  });

  describe('fetchPlayerCharactersThunk', () => {
    it('should handle pending', () => {
      expect(reducer(initialState, { type: fetchPlayerCharactersThunk.pending.type })).toEqual({
        ...initialState,
        status: 'loading',
        error: null,
      });
    });

    it('should handle fulfilled', () => {
      const mockCharacters: PlayerCharacter[] = [
        { id: 1, name: 'Hero', icon: 'warrior', locked: false, archetype: 'warrior', race: 'human' },
      ];
      expect(
        reducer(initialState, {
          type: fetchPlayerCharactersThunk.fulfilled.type,
          payload: mockCharacters,
        })
      ).toEqual({
        ...initialState,
        status: 'succeeded',
        characters: mockCharacters,
      });
    });

    it('should handle rejected', () => {
      expect(
        reducer(initialState, {
          type: fetchPlayerCharactersThunk.rejected.type,
          error: { message: 'Network error' },
        })
      ).toEqual({
        ...initialState,
        status: 'failed',
        error: 'Network error',
      });
    });
  });

  describe('updatePlayerCharacterThunk', () => {
    const stateWithCharacters = {
      ...initialState,
      characters: [{ id: 1, name: 'Hero', icon: 'warrior', locked: false, archetype: 'warrior' as const, race: 'human' }],
    };

    it('should handle pending', () => {
      expect(reducer(stateWithCharacters, { type: updatePlayerCharacterThunk.pending.type })).toEqual({
        ...stateWithCharacters,
        updateStatus: 'loading',
        error: null,
      });
    });

    it('should handle fulfilled', () => {
      const updatedCharacter: PlayerCharacter = { id: 1, name: 'Super Hero', icon: 'mage', locked: false, archetype: 'warrior', race: 'human' };
      expect(
        reducer(stateWithCharacters, {
          type: updatePlayerCharacterThunk.fulfilled.type,
          payload: updatedCharacter,
        })
      ).toEqual({
        ...stateWithCharacters,
        updateStatus: 'succeeded',
        characters: [updatedCharacter],
      });
    });

    it('should handle rejected', () => {
      expect(
        reducer(stateWithCharacters, {
          type: updatePlayerCharacterThunk.rejected.type,
          error: { message: 'Update failed' },
        })
      ).toEqual({
        ...stateWithCharacters,
        updateStatus: 'failed',
        error: 'Update failed',
      });
    });
  });
});
