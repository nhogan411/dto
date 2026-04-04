import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import gameReducer, {
  setCurrentGame,
  updateGameState,
  clearGame,
  fetchGameThunk,
  fetchGameStateThunk,
  submitActionThunk,
  handleGameChannelMessage,
  forfeitGameThunk,
  optimisticDefend,
  rollbackGameState,
} from './gameSlice';
import { gameApi } from '../../api/game';

vi.mock('../../api/game', () => ({
  gameApi: {
    getGame: vi.fn(),
    getGameState: vi.fn(),
    submitAction: vi.fn(),
    forfeitGame: vi.fn(),
  },
}));

describe('gameSlice', () => {
  const mockApiGame = {
    id: 1,
    status: 'active' as const,
    board_config: { tiles: [[{ type: 'open' }]] },
    current_turn_user_id: 1,
    acting_character_id: 1,
    turn_order: [1],
    current_turn_index: 0,
    challenger_id: 1,
    challenged_id: 2,
    challenger_username: 'testuser1',
    challenged_username: 'testuser2',
    characters: [
       {
         id: 1,
         user_id: 1,
         name: '',
         position: { x: 1, y: 1 },
         facing_tile: { x: 1, y: 2 },
         current_hp: 10,
         max_hp: 10,
         is_defending: false,
          icon: 'warrior',
          alive: true,
          stats: { movement: 3 },
        },
      ],
     turn_number: 1,
    winner_id: null,
  };

  const mockGameState = {
    id: 1,
    status: 'active' as const,
    boardConfig: { tiles: [[{ type: 'open' }]] },
    currentTurnUserId: 1,
    actingCharacterId: 1,
    turnOrder: [1],
    currentTurnIndex: 0,
    characters: [
       {
         id: 1,
         userId: 1,
         name: '',
         position: { x: 1, y: 1 },
         facingTile: { x: 1, y: 2 },
         currentHp: 10,
         maxHp: 10,
         isDefending: false,
           icon: 'warrior',
           alive: true,
            race: '',
            stats: { movement: 3, str: undefined, dex: undefined },
         },
       ],
     turnNumber: 1,
    winnerId: null,
    actingCharacterActions: null,
    challengerPicks: undefined,
    challengedPicks: undefined,
  };

  const mockSnapshot = {
    game_id: 1,
    status: 'active' as const,
    current_turn_user_id: 1,
    acting_character_id: 1,
    turn_order: [1],
    current_turn_index: 0,
    winner_id: null,
    board_config: { tiles: [[{ type: 'open' }]] },
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
      xpAwards: null,
    });
  });

  it('should handle setCurrentGame', () => {
    const store = setupStore();
    store.dispatch(setCurrentGame(mockApiGame));
    const state = store.getState().game;

    expect(state.currentGame).toEqual(mockApiGame);
    expect(state.gameState).toEqual(mockGameState);
  });

  it('should map icon in mapApiCharacterToCharacterState', () => {
    const store = setupStore();
    store.dispatch(setCurrentGame(mockApiGame));
    const state = store.getState().game;

    expect(state.gameState?.characters[0].icon).toBe('warrior');
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

  it('should handle optimisticDefend reducer', () => {
    const store = setupStore();
    store.dispatch(updateGameState(mockGameState));

    store.dispatch(optimisticDefend({
      characterId: 1,
      facingTile: { x: 1, y: 3 },
    }));

    const character = store.getState().game.gameState?.characters[0];
    expect(character?.isDefending).toBe(true);
    expect(character?.facingTile).toEqual({ x: 1, y: 3 });
  });

  it('should handle rollbackGameState reducer', () => {
    const store = setupStore();
    const alteredState = {
      ...mockGameState,
      characters: [{ ...mockGameState.characters[0], position: { x: 5, y: 5 } }],
    };
    store.dispatch(updateGameState(alteredState));
    store.dispatch(rollbackGameState(mockGameState));

    expect(store.getState().game.gameState?.characters[0].position).toEqual({ x: 1, y: 1 });
  });

  it('should handle turn_changed updating actingCharacterId', () => {
    const store = setupStore();
    store.dispatch(updateGameState({ ...mockGameState, actingCharacterId: 1 }));
    store.dispatch(handleGameChannelMessage({
      event: 'turn_changed',
      data: { next_character_id: 2, current_turn_user_id: 2 },
    }));

    expect(store.getState().game.gameState?.actingCharacterId).toBe(2);
    expect(store.getState().game.gameState?.currentTurnUserId).toBe(2);
  });

  it('submitActionThunk rolls back optimistic move on API failure', async () => {
    vi.mocked(gameApi.submitAction).mockRejectedValueOnce(new Error('422'));

    const store = setupStore();
    store.dispatch(updateGameState(mockGameState));

    const originalPosition = store.getState().game.gameState?.characters[0].position;

    await store.dispatch(submitActionThunk({
      gameId: 1,
      actionType: 'move',
      actionData: { path: [{ x: 5, y: 5 }] },
    }));

    expect(store.getState().game.gameState?.characters[0].position).toEqual(originalPosition);
  });

  it('should handle handleGameChannelMessage game_updated', () => {
    const store = setupStore();
    store.dispatch(updateGameState(mockGameState));
    store.dispatch(handleGameChannelMessage({ event: 'game_updated', data: mockSnapshot }));

    expect(store.getState().game.gameState).toEqual(mockGameState);
  });

  describe('handleGameChannelMessage action_completed', () => {
    const mockAction = {
      id: 42,
      game_id: 1,
      character_id: 1,
      action_type: 'move' as const,
      turn_number: 1,
      sequence_number: 1,
      action_data: { path: [{ x: 2, y: 1 }] },
      result_data: { from_position: { x: 1, y: 1 }, to_position: { x: 2, y: 1 } },
      created_at: '2026-03-15T12:00:00.000Z',
    };

    it('should handle action_completed broadcast with game_state and action', () => {
      const store = setupStore();
      store.dispatch(updateGameState(mockGameState));

      const mockBroadcastSnapshot = {
        ...mockSnapshot,
        turn_number: 2,
      };

      store.dispatch(handleGameChannelMessage({
        event: 'action_completed',
        data: {
          game_state: mockBroadcastSnapshot,
          action: mockAction,
        },
      } as any));

      const state = store.getState().game;

      expect(state.gameState).not.toBeNull();
      expect(state.gameState).toEqual({
        ...mockGameState,
        turnNumber: 2,
      });
      expect(state.gameActions).toHaveLength(1);
      expect(state.gameActions[0]).toMatchObject({ id: 42, action_type: 'move' });
    });

    it('should not duplicate actions in gameActions on repeated action_completed', () => {
      const store = setupStore();
      store.dispatch(updateGameState(mockGameState));

      const payload = {
        event: 'action_completed',
        data: {
          game_state: {
            ...mockSnapshot,
            turn_number: 2,
          },
          action: mockAction,
        },
      };

      store.dispatch(handleGameChannelMessage(payload as any));
      store.dispatch(handleGameChannelMessage(payload as any));

      expect(store.getState().game.gameActions).toHaveLength(1);
    });

    it('should handle action_completed with no action field gracefully', () => {
      const store = setupStore();
      store.dispatch(updateGameState(mockGameState));

      expect(() => {
        store.dispatch(handleGameChannelMessage({
          event: 'action_completed',
          data: {
            game_state: {
              ...mockSnapshot,
              turn_number: 2,
            },
          },
        } as any));
      }).not.toThrow();

      expect(store.getState().game.gameActions).toHaveLength(0);
      expect(store.getState().game.gameState).toEqual({
        ...mockGameState,
        turnNumber: 2,
      });
    });
  });

  it('should handle handleGameChannelMessage game_over with forfeited status', () => {
    const store = setupStore();
    store.dispatch(updateGameState(mockGameState));
    store.dispatch(handleGameChannelMessage({
      event: 'game_over',
      status: 'forfeited',
      winner_id: 2,
    }));

    const state = store.getState().game;
    expect(state.gameState?.status).toBe('forfeited');
    expect(state.gameState?.winnerId).toBe(2);
  });

  it('should handle handleGameChannelMessage game_over defaults to completed when no status', () => {
    const store = setupStore();
    store.dispatch(updateGameState(mockGameState));
    store.dispatch(handleGameChannelMessage({
      event: 'game_over',
      winner_id: 2,
    }));

    const state = store.getState().game;
    expect(state.gameState?.status).toBe('completed');
    expect(state.gameState?.winnerId).toBe(2);
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
      xpAwards: null,
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
      expect(state.gameState).toEqual(mockGameState);
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

     it('should map moves_taken from snapshot acting_character_actions', async () => {
        const snapshotWithActions = {
          ...mockSnapshot,
          acting_character_actions: {
            has_moved: true,
            has_attacked: false,
            has_defended: false,
            moves_taken: 2,
          },
        };
        vi.mocked(gameApi.getGameState).mockResolvedValueOnce({
          data: { data: snapshotWithActions } as any,
        } as any);

        const store = setupStore();
        await store.dispatch(fetchGameStateThunk(1));

        const state = store.getState().game;
        expect(state.gameState?.actingCharacterActions).toEqual({
          hasMoved: true,
          hasAttacked: false,
          hasDefended: false,
          movesTaken: 2,
        });
      });

      describe('forfeitGameThunk', () => {
        it('calls forfeitGame API with correct game id', async () => {
          vi.mocked(gameApi.forfeitGame).mockResolvedValueOnce({ data: { data: { game: mockApiGame } } } as any);
          const store = setupStore();
          await store.dispatch(forfeitGameThunk(1));
          expect(gameApi.forfeitGame).toHaveBeenCalledWith(1);
        });

        it('fulfills without updating game state', async () => {
          vi.mocked(gameApi.forfeitGame).mockResolvedValueOnce({ data: { data: { game: mockApiGame } } } as any);
          const store = setupStore();
          store.dispatch(setCurrentGame(mockApiGame));
          await store.dispatch(forfeitGameThunk(1));
          // No optimistic state update — state unchanged
          expect(store.getState().game.gameState?.status).toBe('active');
        });
      });
    });
});
