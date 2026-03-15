import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchGameThunk,
  fetchGameStateThunk,
  clearGame,
  submitActionThunk,
  handleGameChannelMessage,
  startReplay,
  selectCharacter,
  gameActionsReceived,
  appendGameAction,
  type GameChannelMessage,
} from '../store/slices/gameSlice';
import { GameBoard } from '../components/game/GameBoard';
import { ActionControls } from '../components/game/ActionControls';
import { TurnReplay } from '../components/game/TurnReplay';
import { CharacterInfo } from '../components/game/CharacterInfo';
import { GameHistory } from '../components/game/GameHistory';
import { useGameChannel } from '../cable/useGameChannel';
import { fetchReplayActions } from '../services/replayService';
import { gameApi, type GameHistoryAction } from '../api/game';

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentGame, gameState, status, error } = useAppSelector((state) => state.game);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const gameId = id ? Number.parseInt(id, 10) : null;
  const parsedGameId = gameId !== null && !Number.isNaN(gameId) ? gameId : null;

  const [selectedSquare, setSelectedSquare] = useState<{ x: number; y: number } | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<'move' | 'attack' | null>(null);

  const onGameChannelMessage = useCallback(
    (data: GameChannelMessage) => {
      dispatch(handleGameChannelMessage(data));
      if (data.event === 'action_completed' && data.data && typeof data.data === 'object' && 'action' in data.data) {
        const actionPayload = (data.data as Record<string, unknown>).action as GameHistoryAction;
        if (actionPayload) {
          dispatch(appendGameAction(actionPayload));
        }
      }
    },
    [dispatch],
  );

  useGameChannel(parsedGameId, onGameChannelMessage);

  useEffect(() => {
    if (parsedGameId !== null) {
      void dispatch(fetchGameThunk(parsedGameId)).then(() => {
        void dispatch(fetchGameStateThunk(parsedGameId)).then((result) => {
          if (fetchGameStateThunk.fulfilled.match(result)) {
            const state = result.payload;
            if (state.status === 'active' && state.currentTurnUserId === currentUserId && state.turnNumber > 1) {
              fetchReplayActions(parsedGameId, state.turnNumber - 1)
                .then(actions => { if (actions.length > 0) dispatch(startReplay(actions)); })
                .catch(() => {});
            }
          }
        });
      });
      gameApi.getGameActions(parsedGameId)
        .then((res) => {
          if (res.data?.data?.actions && Array.isArray(res.data.data.actions)) {
            dispatch(gameActionsReceived(res.data.data.actions));
          }
        })
        .catch(() => {});
    }

    return () => {
      dispatch(clearGame());
    };
  }, [dispatch, parsedGameId, currentUserId]);

  const handleSquareClick = (x: number, y: number) => {
    if (gameState?.characters) {
      const clickedChar = gameState.characters.find((c) => c.position.x === x && c.position.y === y);
      if (clickedChar) {
        dispatch(selectCharacter(clickedChar.id));
      }
    }

    if (activeMode === 'move') {
      setSelectedSquare({ x, y });
      if (parsedGameId !== null) {
        void dispatch(submitActionThunk({
          gameId: parsedGameId,
          actionType: 'move',
          actionData: { path: [{ x, y }] },
        })).then((result) => {
          if (submitActionThunk.fulfilled.match(result)) {
            setActiveMode(null);
            setSelectedSquare(null);
          }
        });
      }
      return;
    }

    if (activeMode === 'attack') {
      const char = gameState?.characters.find((c) => c.position.x === x && c.position.y === y);
      if (char && char.userId !== currentUserId) {
        setSelectedTarget(char.id);
        if (parsedGameId !== null) {
          void dispatch(submitActionThunk({
            gameId: parsedGameId,
            actionType: 'attack',
            actionData: { target_character_id: char.id },
          })).then((result) => {
            if (submitActionThunk.fulfilled.match(result)) {
              setActiveMode(null);
              setSelectedTarget(null);
            }
          });
        }
      } else {
        setSelectedTarget(null);
      }
      return;
    }

    setSelectedSquare({ x, y });
  };

  const getHighlightedSquares = () => {
    if (activeMode !== 'move' || !gameState || !currentUserId) return [];

    const activeCharacter = gameState.characters.find((c) => c.userId === currentUserId);
    if (!activeCharacter) return [];

    const { x, y } = activeCharacter.position;
    const boardConfig = gameState.boardConfig;
    const blockedSet = new Set(boardConfig.blocked_squares.map(([bx, by]) => `${bx},${by}`));
    const occupiedSet = new Set(gameState.characters.map((c) => `${c.position.x},${c.position.y}`));

    const reachable: { x: number; y: number }[] = [];
    const directions = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];

    for (const { dx, dy } of directions) {
      for (let steps = 1; steps <= 3; steps++) {
        const nx = x + dx * steps;
        const ny = y + dy * steps;
        if (nx < 1 || nx > 8 || ny < 1 || ny > 8) break;
        if (blockedSet.has(`${nx},${ny}`)) break;
        if (occupiedSet.has(`${nx},${ny}`)) break;
        reachable.push({ x: nx, y: ny });
      }
    }

    return reachable;
  };

  if (status === 'loading' && !currentGame && !gameState) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#a3a3a3' }}>
        <h2>Loading Game...</h2>
      </div>
    );
  }

  if (status === 'failed' && error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <h2>Error Loading Game</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!gameState || !currentUserId) {
    return null;
  }

  const boardConfig = gameState.boardConfig ?? currentGame?.board_config;

  if (!boardConfig) {
    return null;
  }

  const isGameOver = gameState.status === 'completed' || gameState.status === 'forfeited';
  const isWinner = gameState.winnerId !== null && gameState.winnerId === currentUserId;

  const gameOverMessage = (() => {
    if (gameState.status === 'forfeited') {
      return isWinner
        ? 'Opponent ran out of time. You win!'
        : 'You ran out of time. You lose.';
    }

    return isWinner ? '🎉 You won!' : 'You lost.';
  })();

  return (
    <div
      style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <TurnReplay />
      <h1 style={{ marginBottom: '1rem' }}>Game #{gameState.id}</h1>
      <div style={{ marginBottom: '2rem' }}>
        <p>Status: {gameState.status}</p>
        <p>Turn: {gameState.turnNumber}</p>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', width: '100%', maxWidth: '1000px', justifyContent: 'center' }}>
        <div>
          <GameBoard
            boardConfig={boardConfig}
            gameState={gameState}
            selectedSquare={selectedSquare}
            highlightedSquares={getHighlightedSquares()}
            onSquareClick={handleSquareClick}
          />

          <ActionControls
            gameId={gameState.id}
            currentUserId={currentUserId}
            gameState={gameState}
            selectedSquare={selectedSquare}
            selectedTarget={selectedTarget}
            onSelectMode={setActiveMode}
            activeMode={activeMode}
          />
        </div>
        <div style={{ minWidth: '260px', maxWidth: '320px', height: '600px', display: 'flex', flexDirection: 'column' }}>
          <CharacterInfo />
          <GameHistory />
        </div>
      </div>

      {isGameOver && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: '12px',
              padding: '2rem',
              minWidth: '320px',
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: '1rem', color: isWinner ? '#4ade80' : '#f87171' }}>
              {gameOverMessage}
            </h2>
            <button
              onClick={() => navigate('/')}
              style={{
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.75rem 1.25rem',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
