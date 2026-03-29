import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { gameApi, type ApiGame, type ApiGameCharacter, type ApiGameSnapshot, type GameHistoryAction } from '../../api/game';
import type { GameAction } from '../../services/replayService';

export interface CharacterState {
  id: number;
  userId: number;
  position: { x: number; y: number };
  facingTile: { x: number; y: number };
  currentHp: number;
  maxHp: number;
  isDefending: boolean;
  icon: string;
  name: string;
  alive: boolean;
  race: string;
  stats: Record<string, unknown> & { movement?: number; str?: number; dex?: number };
}

export interface GameState {
  id: number;
  status: 'pending' | 'active' | 'completed' | 'forfeited' | 'accepted';
  boardConfig: { tiles: Array<Array<{ type: string }>> };
  currentTurnUserId: number;
  actingCharacterId: number | null;
  turnOrder: number[];
  currentTurnIndex: number;
  characters: CharacterState[];
  turnNumber: number;
  winnerId: number | null;
  actingCharacterActions?: { hasMoved: boolean; hasAttacked: boolean; hasDefended: boolean; movesTaken: number } | null;
  challengerPicks?: number[];
  challengedPicks?: number[];
}

type GameStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface GameSliceState {
  currentGame: ApiGame | null;
  gameState: GameState | null;
  pendingActions: unknown[];
  status: GameStatus;
  error: string | null;
  isSubmitting: boolean;
  replayInProgress: boolean;
  replayQueue: GameAction[];
  selectedCharacterId: number | null;
  gameActions: import('../../api/game').GameHistoryAction[];
}

export interface GameChannelMessage {
  event: string;
  data?: unknown;
  current_turn_user_id?: number | string;
  winner_id?: number | string | null;
  status?: GameState['status'];
}

const initialState: GameSliceState = {
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
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return undefined;
};

const parseNullableNumber = (value: unknown): number | null | undefined => {
  if (value === null) {
    return null;
  }

  return parseNumber(value);
};

const normalizePoint = (point: { x: number | string; y: number | string }) => ({
  x: Number(point.x),
  y: Number(point.y),
});

const mapApiCharacterToCharacterState = (character: ApiGameCharacter): CharacterState => ({
  id: character.id,
  userId: character.user_id,
  position: normalizePoint(character.position),
  facingTile: normalizePoint(character.facing_tile),
  currentHp: character.current_hp,
  maxHp: character.max_hp,
  isDefending: character.is_defending,
  icon: character.icon,
  name: character.name ?? '',
  alive: character.alive ?? character.current_hp > 0,
  race: character.race ?? '',
  stats: {
    ...(character.stats ?? {}),
    movement: parseNumber((character.stats ?? {})['movement']),
    str: parseNumber((character.stats ?? {})['str']),
    dex: parseNumber((character.stats ?? {})['dex']),
  },
});

const mapCharacterStateToApiCharacter = (character: CharacterState): ApiGameCharacter => ({
  id: character.id,
  user_id: character.userId,
  position: character.position,
  facing_tile: character.facingTile,
  current_hp: character.currentHp,
  max_hp: character.maxHp,
  is_defending: character.isDefending,
  icon: character.icon,
  name: character.name,
  alive: character.alive,
  stats: character.stats,
});

const deriveActingCharacterId = (
  explicitId: number | undefined,
  turnOrder: number[] | undefined,
  currentTurnIndex: number | undefined,
): number | null => {
  if (typeof explicitId === 'number') return explicitId;
  if (!Array.isArray(turnOrder) || turnOrder.length === 0) return null;

  const index = typeof currentTurnIndex === 'number' ? currentTurnIndex : 0;
  const normalizedIndex = index >= 0 && index < turnOrder.length ? index : 0;
  const actingId = turnOrder[normalizedIndex];
  return typeof actingId === 'number' ? actingId : null;
};

const mapApiGameToGameState = (game: ApiGame): GameState => ({
  id: game.id,
  status: game.status,
  boardConfig: game.board_config,
  currentTurnUserId: game.current_turn_user_id,
  actingCharacterId: deriveActingCharacterId(game.acting_character_id, game.turn_order, game.current_turn_index),
  turnOrder: game.turn_order ?? [],
  currentTurnIndex: game.current_turn_index ?? 0,
  turnNumber: game.turn_number,
  winnerId: game.winner_id,
  actingCharacterActions: null,
  challengerPicks: game.challenger_picks,
  challengedPicks: game.challenged_picks,
  characters: game.characters.map(mapApiCharacterToCharacterState),
});

const mapSnapshotToGameState = (snapshot: ApiGameSnapshot): GameState => ({
  id: snapshot.game_id,
  status: snapshot.status,
  boardConfig: snapshot.board_config,
  currentTurnUserId: snapshot.current_turn_user_id,
  actingCharacterId: deriveActingCharacterId(snapshot.acting_character_id, snapshot.turn_order, snapshot.current_turn_index),
  turnOrder: snapshot.turn_order ?? [],
  currentTurnIndex: snapshot.current_turn_index ?? 0,
  turnNumber: snapshot.turn_number ?? snapshot.last_action?.turn_number ?? 1,
  winnerId: snapshot.winner_id,
  actingCharacterActions: snapshot.acting_character_actions ? {
    hasMoved: snapshot.acting_character_actions.has_moved,
    hasAttacked: snapshot.acting_character_actions.has_attacked,
    hasDefended: snapshot.acting_character_actions.has_defended,
    movesTaken: snapshot.acting_character_actions.moves_taken ?? 0,
  } : null,
  challengerPicks: snapshot.challenger_picks,
  challengedPicks: snapshot.challenged_picks,
  characters: snapshot.characters.map(mapApiCharacterToCharacterState),
});

const mapIncomingGameState = (value: unknown): GameState | null => {
  if (!isRecord(value)) {
    return null;
  }

  if ('boardConfig' in value && 'currentTurnUserId' in value && 'characters' in value) {
    return value as unknown as GameState;
  }

  if ('game_id' in value && 'board_config' in value) {
    return mapSnapshotToGameState(value as unknown as ApiGameSnapshot);
  }

  if ('id' in value && 'board_config' in value) {
    return mapApiGameToGameState(value as unknown as ApiGame);
  }

  return null;
};

const syncCurrentGameFromGameState = (
  currentGame: ApiGame | null,
  gameState: GameState | null,
): ApiGame | null => {
  if (!currentGame || !gameState || currentGame.id !== gameState.id) {
    return currentGame;
  }

  return {
    ...currentGame,
    status: gameState.status,
    board_config: gameState.boardConfig,
    current_turn_user_id: gameState.currentTurnUserId,
    acting_character_id: gameState.actingCharacterId ?? undefined,
    turn_order: gameState.turnOrder,
    current_turn_index: gameState.currentTurnIndex,
    characters: gameState.characters.map(mapCharacterStateToApiCharacter),
    turn_number: gameState.turnNumber,
    winner_id: gameState.winnerId,
    challenger_picks: gameState.challengerPicks,
    challenged_picks: gameState.challengedPicks,
  };
};

export const fetchGameThunk = createAsyncThunk<ApiGame, number>('game/fetchGame', async (id) => {
  const response = await gameApi.getGame(id);
  return response.data.data.game;
});

export const fetchGameStateThunk = createAsyncThunk<GameState, number>(
  'game/fetchGameState',
  async (id) => {
    try {
      const response = await gameApi.getGameState(id);
      const mappedGameState = mapIncomingGameState(response.data.data);

      if (mappedGameState) {
        return mappedGameState;
      }
    } catch {}

    const response = await gameApi.getGame(id);
    return mapApiGameToGameState(response.data.data.game);
  },
);

export const submitActionThunk = createAsyncThunk<
  GameState,
  { gameId: number; actionType: string; actionData: Record<string, unknown> },
  { state: { game: GameSliceState } }
>('game/submitAction', async ({ gameId, actionType, actionData }, { getState, dispatch }) => {
  const state = getState().game;
  if (!state.gameState) throw new Error('No game state available');

  const previousGameState = state.gameState;

  const activeCharacter =
    (state.gameState.actingCharacterId
      ? state.gameState.characters.find((character) => character.id === state.gameState?.actingCharacterId)
      : undefined) ??
    state.gameState.characters.find((character) => character.userId === state.gameState?.currentTurnUserId);

  if (activeCharacter) {
    if (actionType === 'move' && actionData.path && Array.isArray(actionData.path) && actionData.path.length > 0) {
      const path = actionData.path as { x: number; y: number }[];
      dispatch(optimisticMove({ characterId: activeCharacter.id, newPosition: path[path.length - 1] }));
    } else if (actionType === 'defend') {
      const facingTile = (actionData as { facing_tile?: { x: number; y: number } }).facing_tile;
      dispatch(optimisticDefend({ characterId: activeCharacter.id, facingTile: facingTile ?? { x: 0, y: 0 } }));
    }
  }

  try {
    const response = await gameApi.submitAction(gameId, actionType, actionData);
    const mappedGameState = mapIncomingGameState(response.data.data.game_state);

    if (!mappedGameState) {
      throw new Error('Invalid game state payload');
    }

    return mappedGameState;
  } catch (error) {
    dispatch(rollbackGameState(previousGameState));
    throw error;
  }
});

export const forfeitGameThunk = createAsyncThunk<void, number>(
  'game/forfeitGame',
  async (gameId) => {
    await gameApi.forfeitGame(gameId);
  }
);

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    selectCharacter: (state, action: PayloadAction<number | null>) => {
      state.selectedCharacterId = action.payload;
    },
    gameActionsReceived: (state, action: PayloadAction<import('../../api/game').GameHistoryAction[]>) => {
      state.gameActions = action.payload;
    },
    startReplay: (state, action: PayloadAction<GameAction[]>) => {
      state.replayInProgress = true;
      state.replayQueue = action.payload;
    },
    advanceReplay: (state) => {
      state.replayQueue = state.replayQueue.slice(1);
      if (state.replayQueue.length === 0) {
        state.replayInProgress = false;
      }
    },
    skipReplay: (state) => {
      state.replayInProgress = false;
      state.replayQueue = [];
    },
    setCurrentGame: (state, action: PayloadAction<ApiGame>) => {
      state.currentGame = action.payload;
      state.gameState = mapApiGameToGameState(action.payload);
    },
    updateGameState: (state, action: PayloadAction<GameState>) => {
      state.gameState = action.payload;
      state.currentGame = syncCurrentGameFromGameState(state.currentGame, action.payload);
    },
    handleGameChannelMessage: (state, action: PayloadAction<GameChannelMessage>) => {
      if (!state.gameState) {
        return;
      }

      const payloadData = isRecord(action.payload.data) ? action.payload.data : undefined;

      switch (action.payload.event) {
        case 'action_completed': {
          const updatedGameState = mapIncomingGameState(payloadData?.game_state ?? payloadData?.gameState);

          if (updatedGameState) {
            state.gameState = updatedGameState;
          }

          const incomingAction = payloadData?.action;
          if (incomingAction && isRecord(incomingAction) && typeof incomingAction.id === 'number') {
            const alreadyExists = state.gameActions.some((a) => a.id === (incomingAction as { id: number }).id);
            if (!alreadyExists) {
              state.gameActions.push({
                ...(incomingAction as unknown as GameHistoryAction),
                received_at: new Date().toISOString(),
              });
            }
          }

          break;
        }
        case 'turn_changed': {
          const nextPlayerId = parseNumber(
            action.payload.current_turn_user_id ?? payloadData?.current_turn_user_id ?? payloadData?.next_player_id,
          );
          const nextCharacterId = parseNumber(payloadData?.next_character_id ?? payloadData?.acting_character_id);
          const nextTurnNumber = parseNumber(payloadData?.turn_number ?? payloadData?.next_turn_number);
          const currentTurnIndex = parseNumber(payloadData?.current_turn_index);
          const turnOrder = Array.isArray(payloadData?.turn_order)
            ? payloadData.turn_order.map((entry) => parseNumber(entry)).filter((entry): entry is number => entry !== undefined)
            : undefined;

          if (nextPlayerId !== undefined) {
            state.gameState.currentTurnUserId = nextPlayerId;
          }

          if (nextCharacterId !== undefined) {
            state.gameState.actingCharacterId = nextCharacterId;
          }

          if (currentTurnIndex !== undefined) {
            state.gameState.currentTurnIndex = currentTurnIndex;
          }

          if (turnOrder !== undefined) {
            state.gameState.turnOrder = turnOrder;
          }

          if (nextTurnNumber !== undefined) {
            state.gameState.turnNumber = nextTurnNumber;
          }

          break;
        }
        case 'game_over': {
          state.gameState.status =
            action.payload.status ??
            (typeof payloadData?.status === 'string' ? (payloadData.status as GameState['status']) : undefined) ??
            'completed';

          const winnerId = parseNullableNumber(action.payload.winner_id ?? payloadData?.winner_id);

          if (winnerId !== undefined) {
            state.gameState.winnerId = winnerId;
          }

          break;
        }
        case 'game_updated': {
          const updatedGameState = mapIncomingGameState(
            payloadData?.game_state ?? payloadData?.gameState ?? action.payload.data ?? action.payload,
          );

          if (updatedGameState) {
            state.gameState = updatedGameState;
          }

          break;
        }
        default:
          break;
      }

      state.currentGame = syncCurrentGameFromGameState(state.currentGame, state.gameState);
    },
    clearGame: (state) => {
      state.currentGame = null;
      state.gameState = null;
      state.status = 'idle';
      state.error = null;
      state.isSubmitting = false;
      state.gameActions = [];
      state.selectedCharacterId = null;
      state.replayInProgress = false;
      state.replayQueue = [];
    },
    optimisticMove: (state, action: PayloadAction<{ characterId: number; newPosition: { x: number; y: number } }>) => {
      if (state.gameState) {
        const character = state.gameState.characters.find((entry) => entry.id === action.payload.characterId);
        if (character) {
          character.position = action.payload.newPosition;
        }
      }
    },
    optimisticDefend: (state, action: PayloadAction<{ characterId: number; facingTile: { x: number; y: number } }>) => {
      if (state.gameState) {
        const character = state.gameState.characters.find((entry) => entry.id === action.payload.characterId);
        if (character) {
          character.isDefending = true;
          character.facingTile = action.payload.facingTile;
        }
      }
    },
    rollbackGameState: (state, action: PayloadAction<GameState>) => {
      state.gameState = action.payload;
      state.currentGame = syncCurrentGameFromGameState(state.currentGame, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGameThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchGameThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentGame = action.payload;
        state.gameState = mapApiGameToGameState(action.payload);
      })
      .addCase(fetchGameThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch game';
      })
      .addCase(fetchGameStateThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchGameStateThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.gameState = action.payload;
        state.currentGame = syncCurrentGameFromGameState(state.currentGame, action.payload);
      })
      .addCase(fetchGameStateThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch game state';
      })
      .addCase(submitActionThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitActionThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.gameState = action.payload;
        state.currentGame = syncCurrentGameFromGameState(state.currentGame, action.payload);
      })
      .addCase(submitActionThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to submit action';
      });
  },
});

export const {
  selectCharacter,
  gameActionsReceived,
  startReplay,
  advanceReplay,
  skipReplay,
  setCurrentGame,
  updateGameState,
  handleGameChannelMessage,
  clearGame,
  optimisticMove,
  optimisticDefend,
  rollbackGameState,
} = gameSlice.actions;
export default gameSlice.reducer;
