import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { gameApi, type ApiGame, type ApiCharacter, type ApiGameSnapshot } from '../../api/game';
import type { GameAction } from '../../services/replayService';

export interface CharacterState {
  id: number;
  userId: number;
  position: { x: number; y: number };
  facingTile: { x: number; y: number };
  currentHp: number;
  maxHp: number;
  isDefending: boolean;
}

export interface GameState {
  id: number;
  status: 'pending' | 'active' | 'completed' | 'forfeited' | 'accepted';
  boardConfig: { blocked_squares: number[][]; start_positions: number[][] };
  currentTurnUserId: number;
  characters: CharacterState[];
  turnNumber: number;
  winnerId: number | null;
  turnDeadline: string | null;
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

const mapApiCharacterToCharacterState = (character: ApiCharacter): CharacterState => ({
  id: character.id,
  userId: character.user_id,
  position: normalizePoint(character.position),
  facingTile: normalizePoint(character.facing_tile),
  currentHp: character.current_hp,
  maxHp: character.max_hp,
  isDefending: character.is_defending,
});

const mapCharacterStateToApiCharacter = (character: CharacterState): ApiCharacter => ({
  id: character.id,
  user_id: character.userId,
  position: character.position,
  facing_tile: character.facingTile,
  current_hp: character.currentHp,
  max_hp: character.maxHp,
  is_defending: character.isDefending,
});

const mapApiGameToGameState = (game: ApiGame): GameState => ({
  id: game.id,
  status: game.status,
  boardConfig: game.board_config,
  currentTurnUserId: game.current_turn_user_id,
  turnNumber: game.turn_number,
  winnerId: game.winner_id,
  turnDeadline: null,
  characters: game.characters.map(mapApiCharacterToCharacterState),
});

const mapSnapshotToGameState = (snapshot: ApiGameSnapshot): GameState => ({
  id: snapshot.game_id,
  status: snapshot.status,
  boardConfig: snapshot.board_config,
  currentTurnUserId: snapshot.current_turn_user_id,
  turnNumber: snapshot.turn_number ?? snapshot.last_action?.turn_number ?? 1,
  winnerId: snapshot.winner_id,
  turnDeadline: snapshot.turn_deadline,
  characters: snapshot.characters.map(mapApiCharacterToCharacterState),
});

const mapIncomingCharacter = (value: unknown): CharacterState | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = parseNumber(value.id);
  const userId = parseNumber(value.userId ?? value.user_id);
  const currentHp = parseNumber(value.currentHp ?? value.current_hp);
  const maxHp = parseNumber(value.maxHp ?? value.max_hp);
  const positionValue = value.position;
  const facingTileValue = value.facingTile ?? value.facing_tile;

  if (
    id === undefined ||
    userId === undefined ||
    currentHp === undefined ||
    maxHp === undefined ||
    !isRecord(positionValue) ||
    !isRecord(facingTileValue)
  ) {
    return null;
  }

  const positionX = parseNumber(positionValue.x);
  const positionY = parseNumber(positionValue.y);
  const facingX = parseNumber(facingTileValue.x);
  const facingY = parseNumber(facingTileValue.y);

  if (
    positionX === undefined ||
    positionY === undefined ||
    facingX === undefined ||
    facingY === undefined
  ) {
    return null;
  }

  return {
    id,
    userId,
    position: { x: positionX, y: positionY },
    facingTile: { x: facingX, y: facingY },
    currentHp,
    maxHp,
    isDefending: Boolean(value.isDefending ?? value.is_defending),
  };
};

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
    characters: gameState.characters.map(mapCharacterStateToApiCharacter),
    turn_number: gameState.turnNumber,
    winner_id: gameState.winnerId,
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

  const currentTurnUser = state.gameState.currentTurnUserId;
  const activeCharacter = state.gameState.characters.find((character) => character.userId === currentTurnUser);

  if (activeCharacter) {
    if (actionType === 'move' && actionData.path && Array.isArray(actionData.path) && actionData.path.length > 0) {
      const path = actionData.path as { x: number; y: number }[];
      dispatch(optimisticMove({ characterId: activeCharacter.id, newPosition: path[path.length - 1] }));
    } else if (actionType === 'defend') {
      dispatch(optimisticDefend({ characterId: activeCharacter.id }));
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
    appendGameAction: (state, action: PayloadAction<import('../../api/game').GameHistoryAction>) => {
      if (!state.gameActions.find(a => a.id === action.payload.id)) {
        state.gameActions.push(action.payload);
      }
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
          const updatedGameState = mapIncomingGameState(
            payloadData?.game_state ?? payloadData?.gameState ?? action.payload.data,
          );

          if (updatedGameState) {
            state.gameState = updatedGameState;
            break;
          }

          const incomingCharacters = Array.isArray(payloadData?.characters)
            ? payloadData.characters
                .map(mapIncomingCharacter)
                .filter((character): character is CharacterState => character !== null)
            : [];

          if (incomingCharacters.length > 0) {
            state.gameState.characters = incomingCharacters;
          }

          const actorId = parseNumber(payloadData?.character_id ?? payloadData?.actor_id);
          const toPosition = payloadData?.to_position;

          if (actorId !== undefined && isRecord(toPosition)) {
            const nextX = parseNumber(toPosition.x);
            const nextY = parseNumber(toPosition.y);
            const actor = state.gameState.characters.find((character) => character.id === actorId);

            if (actor && nextX !== undefined && nextY !== undefined) {
              actor.position = { x: nextX, y: nextY };
            }
          }

          const targetId = parseNumber(payloadData?.target_id);
          const targetHpRemaining = parseNumber(payloadData?.target_hp_remaining);

          if (targetId !== undefined && targetHpRemaining !== undefined) {
            const target = state.gameState.characters.find((character) => character.id === targetId);

            if (target) {
              target.currentHp = targetHpRemaining;
            }
          }

          const nextTurnNumber = parseNumber(payloadData?.turn_number);
          const nextPlayerId = parseNumber(
            payloadData?.current_turn_user_id ?? payloadData?.next_player_id ?? action.payload.current_turn_user_id,
          );

          if (nextTurnNumber !== undefined) {
            state.gameState.turnNumber = nextTurnNumber;
          }

          if (nextPlayerId !== undefined) {
            state.gameState.currentTurnUserId = nextPlayerId;
          }

          break;
        }
        case 'turn_changed': {
          const nextPlayerId = parseNumber(
            action.payload.current_turn_user_id ?? payloadData?.current_turn_user_id ?? payloadData?.next_player_id,
          );
          const nextTurnNumber = parseNumber(payloadData?.turn_number ?? payloadData?.next_turn_number);

          if (nextPlayerId !== undefined) {
            state.gameState.currentTurnUserId = nextPlayerId;
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
    },
    optimisticMove: (state, action: PayloadAction<{ characterId: number; newPosition: { x: number; y: number } }>) => {
      if (state.gameState) {
        const character = state.gameState.characters.find((entry) => entry.id === action.payload.characterId);
        if (character) {
          character.position = action.payload.newPosition;
        }
      }
    },
    optimisticDefend: (state, action: PayloadAction<{ characterId: number }>) => {
      if (state.gameState) {
        const character = state.gameState.characters.find((entry) => entry.id === action.payload.characterId);
        if (character) {
          character.isDefending = true;
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
  appendGameAction,
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
