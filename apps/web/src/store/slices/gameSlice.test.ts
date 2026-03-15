import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import gameReducer, {
  setCurrentGame,
  updateGameState,
  clearGame,
  fetchGameThunk,
  fetchGameStateThunk,
  handleGameChannelMessage,
} from './gameSlice';
import { gameApi } from '../../api/game';

vi.mock('../../api/game', () => ({
  gameApi: {
    getGame: vi.fn(),
    getGameState: vi.fn(),
  },
}));

describe('gameSlice', () => {
  const mockApiGame = {
    id: 1,
    status: 'active' as const,
    board_config: { blocked_squares: [[2, 2]], start_positions: [] },
    current_turn_user_id: 1,
    challenger_id: 1,
    challenged_id: 2,
    characters: [
      {
        id: 1,
        user_id: 1,
        position: { x: 1, y: 1 },
        facing_tile: { x: 1, y: 2 },
        current_hp: 10,
        max_hp: 10,
        is_defending: false,
      },
    ],
    turn_number: 1,
    winner_id: null,
  };

  const mockGameState = {
    id: 1,
    status: 'active' as const,
    boardConfig: { blocked_squares: [[2, 2]], start_positions: [] },
    currentTurnUserId: 1,
    characters: [
      {
        id: 1,
        userId: 1,
        position: { x: 1, y: 1 },
        facingTile: { x: 1, y: 2 },
        currentHp: 10,
        maxHp: 10,
        isDefending: false,
      },
    ],
    turnNumber: 1,
    winnerId: null,
    turnDeadline: null,
  };

  const mockSnapshot = {
    game_id: 1,
    status: 'active' as const,
    current_turn_user_id: 1,
    turn_deadline: '2026-03-15T12:00:00.000Z',
    winner_id: null,
    board_config: { blocked_squares: [[2, 2]], start_positions: [] },
    characters: mockApiGame.characters,
    last_action: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupStore = () => {
    return configureStore({
      reducer: {
        game: gameReducer,
      },
    });
  };

  it('should handle initial state', () => {
    const store = setupStore();
    expect(store.getState().game).toEqual({
      currentGame: null,
      gameState: null,
      pendingActions: [],
      status: 'idle',
      error: null,
      isSubmitting: false,
      replayInProgress: false,
      replayQueue: [],
      selectedCharacterId: null,
      gameActions: [],
    });
  });

  it('should handle setCurrentGame', () => {
    const store = setupStore();
    store.dispatch(setCurrentGame(mockApiGame));
    const state = store.getState().game;

    expect(state.currentGame).toEqual(mockApiGame);
    expect(state.gameState).toEqual(mockGameState);
  });

  it('should handle updateGameState', () => {
    const store = setupStore();
    store.dispatch(updateGameState(mockGameState));
    expect(store.getState().game.gameState).toEqual(mockGameState);
  });

  it('should handle handleGameChannelMessage turn_changed', () => {
    const store = setupStore();
    store.dispatch(updateGameState(mockGameState));
    store.dispatch(handleGameChannelMessage({ event: 'turn_changed', current_turn_user_id: 2 }));

    expect(store.getState().game.gameState?.currentTurnUserId).toBe(2);
  });

  it('should handle handleGameChannelMessage game_updated', () => {
    const store = setupStore();
    store.dispatch(updateGameState(mockGameState));
    store.dispatch(handleGameChannelMessage({ event: 'game_updated', data: mockSnapshot }));

    expect(store.getState().game.gameState).toEqual({
      ...mockGameState,
      turnDeadline: '2026-03-15T12:00:00.000Z',
    });
  });

  it('should handle clearGame', () => {
    const store = setupStore();
    store.dispatch(setCurrentGame(mockApiGame));
    store.dispatch(clearGame());

    expect(store.getState().game).toEqual({
      currentGame: null,
      gameState: null,
      pendingActions: [],
      status: 'idle',
      error: null,
      isSubmitting: false,
      replayInProgress: false,
      replayQueue: [],
      selectedCharacterId: null,
      gameActions: [],
    });
  });

  describe('thunks', () => {
    it('fetchGameThunk pending', () => {
      const store = setupStore();
      store.dispatch({ type: fetchGameThunk.pending.type });
      expect(store.getState().game.status).toBe('loading');
    });

    it('fetchGameThunk fulfilled', async () => {
      vi.mocked(gameApi.getGame).mockResolvedValueOnce({
        data: { data: { game: mockApiGame } } as any,
      } as any);

      const store = setupStore();
      await store.dispatch(fetchGameThunk(1));

      const state = store.getState().game;
      expect(state.status).toBe('succeeded');
      expect(state.currentGame).toEqual(mockApiGame);
      expect(state.gameState).toEqual(mockGameState);
    });

    it('fetchGameThunk rejected', async () => {
      vi.mocked(gameApi.getGame).mockRejectedValueOnce(new Error('Network Error'));

      const store = setupStore();
      await store.dispatch(fetchGameThunk(1));

      const state = store.getState().game;
      expect(state.status).toBe('failed');
      expect(state.error).toBe('Network Error');
    });

    it('fetchGameStateThunk fulfilled', async () => {
      vi.mocked(gameApi.getGameState).mockResolvedValueOnce({
        data: { data: mockSnapshot } as any,
      } as any);

      const store = setupStore();
      await store.dispatch(fetchGameStateThunk(1));

      const state = store.getState().game;
      expect(state.status).toBe('succeeded');
      expect(state.gameState).toEqual({
        ...mockGameState,
        turnDeadline: '2026-03-15T12:00:00.000Z',
      });
    });

    it('fetchGameStateThunk fallback on error', async () => {
      vi.mocked(gameApi.getGameState).mockRejectedValueOnce(new Error('404 Not Found'));
      vi.mocked(gameApi.getGame).mockResolvedValueOnce({
        data: { data: { game: mockApiGame } } as any,
      } as any);

      const store = setupStore();
      await store.dispatch(fetchGameStateThunk(1));

      const state = store.getState().game;
      expect(gameApi.getGame).toHaveBeenCalledWith(1);
      expect(state.status).toBe('succeeded');
      expect(state.gameState).toEqual(mockGameState);
    });
  });
});
