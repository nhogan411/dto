import { useCallback, useEffect, useRef, useState } from 'react';
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
  forfeitGameThunk,
  type GameChannelMessage,
} from '../store/slices/gameSlice';
import { GameBoard } from '../components/game/GameBoard';
import { TurnReplay } from '../components/game/TurnReplay';
import { TurnOrderStrip } from '../components/game/TurnOrderStrip';
import { CharacterInfo } from '../components/game/CharacterInfo';
import { GameHistory } from '../components/game/GameHistory';
import { useGameChannel } from '../cable/useGameChannel';
import { fetchReplayActions } from '../services/replayService';
import { gameApi, type AttackPreviewResponse } from '../api/game';
import { ActionPopover } from '../components/game/ActionPopover';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { getReachableSquares, getShortestPathToTarget, type Coordinate } from '../utils/movement';
import { usePageTitle } from '../hooks/usePageTitle';

export default function GamePage() {
  usePageTitle('Game');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentGame, gameState, status, error, isSubmitting } = useAppSelector((state) => state.game);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const gameId = id ? Number.parseInt(id, 10) : null;
  const parsedGameId = gameId !== null && !Number.isNaN(gameId) ? gameId : null;

  const [selectedSquare, setSelectedSquare] = useState<{ x: number; y: number } | null>(null);
  const [activeMode, setActiveMode] = useState<'move' | 'attack' | null>(null);
  const [popoverState, setPopoverState] = useState<{ x: number; y: number } | null>(null);
  const [attackPreview, setAttackPreview] = useState<AttackPreviewResponse | null>(null);
  const [previewTarget, setPreviewTarget] = useState<number | null>(null);
  const [reachableSquares, setReachableSquares] = useState<Coordinate[]>([]);
  const gameOverModalRef = useRef<HTMLDivElement>(null);
  const isGameOver = gameState?.status === 'completed' || gameState?.status === 'forfeited';
  useFocusTrap(gameOverModalRef, isGameOver, () => navigate('/'));

  const [showForfeitModal, setShowForfeitModal] = useState(false);
  const [isForfeiting, setIsForfeiting] = useState(false);
  const forfeitModalRef = useRef<HTMLDivElement>(null);
  const forfeitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCurrentPlayer = !!(currentGame && currentUserId && 
    (currentGame.challenger_id === currentUserId || currentGame.challenged_id === currentUserId));

  useFocusTrap(forfeitModalRef, showForfeitModal, () => setShowForfeitModal(false));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForfeitModal) {
        setShowForfeitModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForfeitModal]);

  const handleForfeit = async () => {
    if (!parsedGameId) return;
    setIsForfeiting(true);
    try {
      await dispatch(forfeitGameThunk(parsedGameId));
      // Do NOT close the modal — wait for game_over WS event to drive transition
      // Fallback: if WS never arrives within 5s, HTTP-refetch game state
      forfeitTimeoutRef.current = setTimeout(() => {
        if (parsedGameId) {
          void dispatch(fetchGameStateThunk(parsedGameId)).catch(() => {
            setIsForfeiting(false);
          });
        }
      }, 5000);
    } catch {
      setIsForfeiting(false);
    }
  };

  const actingCharacter = (() => {
    if (!gameState) return null;

    if (gameState.actingCharacterId) {
      return gameState.characters.find((character) => character.id === gameState.actingCharacterId) ?? null;
    }

    const actingFromTurnOrder = gameState.turnOrder[gameState.currentTurnIndex];
    if (typeof actingFromTurnOrder === 'number') {
      return gameState.characters.find((character) => character.id === actingFromTurnOrder) ?? null;
    }

    return gameState.characters.find((character) => character.userId === gameState.currentTurnUserId) ?? null;
  })();

  const getMoveBudget = useCallback(
    (character: { stats: Record<string, unknown> }) => {
      const moveStat = Number(character.stats.move);
      if (Number.isFinite(moveStat) && moveStat > 0) {
        return Math.floor(moveStat);
      }

      return 3;
    },
    [],
  );

  const getRemainingMoveBudget = useCallback(
    (character: typeof actingCharacter): number => {
      if (!character) return 0;
      const total = getMoveBudget(character);
      const taken = gameState?.actingCharacterActions?.movesTaken ?? 0;
      return Math.max(0, total - taken);
    },
    [gameState, getMoveBudget],
  );

  const computeReachableSquares = useCallback(
    (character: typeof actingCharacter) => {
      if (!gameState || !character) return [];

      return getReachableSquares({
        origin: character.position,
        moveBudget: getRemainingMoveBudget(character),
        boardTiles: gameState.boardConfig.tiles,
        characters: gameState.characters,
        currentUserId: character.userId,
        boardMin: 1,
        boardMax: 12,
      });
    },
    [gameState, getRemainingMoveBudget],
  );

  const clearMoveSelection = () => {
    setReachableSquares([]);
    setSelectedSquare(null);
  };

  const onGameChannelMessage = useCallback(
    (data: GameChannelMessage) => {
      dispatch(handleGameChannelMessage(data));
      
      if (data.event === 'game_over') {
        if (forfeitTimeoutRef.current) {
          clearTimeout(forfeitTimeoutRef.current);
          forfeitTimeoutRef.current = null;
        }
        setShowForfeitModal(false);
        setIsForfeiting(false);
      }
    },
    [dispatch],
  );

  useGameChannel(parsedGameId, onGameChannelMessage);

  useEffect(() => {
    let gameActionsCanceled = false;

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
          if (gameActionsCanceled) return;
          if (res.data?.data?.actions && Array.isArray(res.data.data.actions)) {
            dispatch(gameActionsReceived(res.data.data.actions));
          }
        })
        .catch(() => {});
    }

    return () => {
      gameActionsCanceled = true;
      dispatch(clearGame());
      if (forfeitTimeoutRef.current) {
        clearTimeout(forfeitTimeoutRef.current);
        forfeitTimeoutRef.current = null;
      }
    };
  }, [dispatch, parsedGameId, currentUserId]);

  const handleSquareClick = (x: number, y: number, e?: React.MouseEvent) => {
    const squareKey = `${x},${y}`;

    if (gameState?.characters) {
      const clickedChar = gameState.characters.find((c) => c.position.x === x && c.position.y === y);
      if (clickedChar) {
        dispatch(selectCharacter(clickedChar.id));

        const isActingCharacter =
          !!actingCharacter &&
          clickedChar.id === actingCharacter.id &&
          clickedChar.userId === currentUserId &&
          clickedChar.alive &&
          clickedChar.currentHp > 0;

        if (isActingCharacter) {
          if (e) {
            setPopoverState({ x: e.clientX, y: e.clientY });
          }
          return;
        }
      }
    }

    if (activeMode === 'move') {
      const isHighlighted = reachableSquares.some((square) => `${square.x},${square.y}` === squareKey);
      if (!isHighlighted || !gameState || !actingCharacter || !currentUserId || actingCharacter.userId !== currentUserId) {
        clearMoveSelection();
        return;
      }

      const path = getShortestPathToTarget({
        origin: actingCharacter.position,
        target: { x, y },
        moveBudget: getRemainingMoveBudget(actingCharacter),
        boardTiles: gameState.boardConfig.tiles,
        characters: gameState.characters,
        currentUserId: actingCharacter.userId,
        boardMin: 1,
        boardMax: 12,
      });

      if (!path || path.length === 0) {
        clearMoveSelection();
        return;
      }

      setSelectedSquare({ x, y });
      if (parsedGameId !== null) {
        void dispatch(submitActionThunk({
          gameId: parsedGameId,
          actionType: 'move',
          actionData: { path },
        })).then((result) => {
          if (submitActionThunk.fulfilled.match(result)) {
            const newGameState = result.payload;
            const newMovesTaken = newGameState.actingCharacterActions?.movesTaken ?? 0;
            const totalBudget = getMoveBudget(actingCharacter!);
            if (newMovesTaken < totalBudget) {
              setSelectedSquare(null);
            } else {
              setActiveMode(null);
              clearMoveSelection();
            }
          }
        });
      }
      return;
    }

    if (activeMode === 'attack') {
      const char = gameState?.characters.find((c) => c.position.x === x && c.position.y === y);
      if (char && char.userId !== currentUserId) {
        if (parsedGameId !== null) {
          void dispatch(submitActionThunk({
            gameId: parsedGameId,
            actionType: 'attack',
            actionData: { target_character_id: char.id },
          })).then((result) => {
            if (submitActionThunk.fulfilled.match(result)) {
              setActiveMode(null);
            }
          });
        }
      }
      return;
    }

    setSelectedSquare({ x, y });
  };

  const handleSquareHover = (x: number, y: number) => {
    if (activeMode !== 'attack' || !gameState || parsedGameId === null || !currentUserId) return;

    const char = gameState.characters.find((c) => c.position.x === x && c.position.y === y);
    if (char && char.userId !== currentUserId) {
      if (previewTarget !== char.id) {
        setPreviewTarget(char.id);
        gameApi.getAttackPreview(parsedGameId, char.id)
          .then((res) => {
            setAttackPreview(res.data.data);
          })
          .catch(() => {
            setAttackPreview(null);
          });
      }
    } else {
      if (previewTarget !== null) {
        setPreviewTarget(null);
        setAttackPreview(null);
      }
    }
  };

  useEffect(() => {
    if (activeMode !== 'attack') {
      setPreviewTarget(null);
      setAttackPreview(null);
    }
  }, [activeMode]);

  useEffect(() => {
    if (activeMode !== 'move') {
      setReachableSquares([]);
      return;
    }

    if (!actingCharacter || !currentUserId || actingCharacter.userId !== currentUserId) {
      setReachableSquares([]);
      return;
    }

    setReachableSquares(computeReachableSquares(actingCharacter));
  }, [activeMode, actingCharacter, computeReachableSquares, currentUserId]);

  const getHighlightedSquares = () => {
    if (activeMode !== 'move') return [];
    return reachableSquares;
  };

  if (status === 'loading' && !currentGame && !gameState) {
    return (
      <div className="p-8 text-center text-neutral-300">
        <h2 className="text-white">Loading Game...</h2>
      </div>
    );
  }

  if (status === 'failed' && error) {
    return (
      <div className="p-8 text-center text-red-400">
        <h2 className="text-white">Error Loading Game</h2>
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

  const isWinner = gameState.winnerId !== null && gameState.winnerId === currentUserId;

  const gameOverMessage = (() => {
    if (gameState.status === 'forfeited') {
      return isWinner
        ? 'Opponent forfeited. You win!'
        : 'You forfeited. Your opponent wins.';
    }

    return isWinner ? '🎉 You won!' : 'You lost.';
  })();

  const handlePopoverMove = () => {
    if (actingCharacter) {
      setActiveMode('move');
      setSelectedSquare(actingCharacter.position);
      setReachableSquares(computeReachableSquares(actingCharacter));
    }
    setPopoverState(null);
  };

  const handlePopoverAttack = () => {
    setActiveMode('attack');
    setPopoverState(null);
  };

  const handlePopoverDefend = (direction: 'north' | 'south' | 'east' | 'west') => {
    if (parsedGameId !== null && actingCharacter) {
      const facingTile = { ...actingCharacter.position };

      if (direction === 'north') facingTile.y -= 1;
      else if (direction === 'south') facingTile.y += 1;
      else if (direction === 'east') facingTile.x += 1;
      else if (direction === 'west') facingTile.x -= 1;

      void dispatch(submitActionThunk({
        gameId: parsedGameId,
        actionType: 'defend',
        actionData: { facing_tile: facingTile }
      }));
    }
    setPopoverState(null);
  };

  const handlePopoverEndTurn = (direction: 'north' | 'south' | 'east' | 'west') => {
    if (parsedGameId !== null && actingCharacter) {
      const facingTile = { ...actingCharacter.position };
      
      if (direction === 'north') facingTile.y -= 1;
      else if (direction === 'south') facingTile.y += 1;
      else if (direction === 'east') facingTile.x += 1;
      else if (direction === 'west') facingTile.x -= 1;
      
      void dispatch(submitActionThunk({
        gameId: parsedGameId,
        actionType: 'end_turn',
        actionData: { facing_tile: facingTile }
      }));
    }
    setPopoverState(null);
  };

   const isMyTurn = gameState?.currentTurnUserId === currentUserId;

   const remainingMoveBudget = actingCharacter ? getRemainingMoveBudget(actingCharacter) : 0;
   const canMove = !!(isMyTurn && !isSubmitting && activeMode !== 'move' && remainingMoveBudget > 0);

    return (
      <div className="flex flex-col items-center relative">
        <TurnReplay />
        
        <TurnOrderStrip />

       <div className="flex gap-4 items-start w-full max-w-7xl justify-center">
        <div className="min-w-[240px] max-w-[260px] flex-shrink-0">
          <CharacterInfo />
        </div>
        <div>
          <GameBoard
            boardConfig={boardConfig}
            gameState={gameState}
            selectedSquare={selectedSquare}
            highlightedSquares={getHighlightedSquares()}
            onSquareClick={handleSquareClick}
            onSquareHover={handleSquareHover}
            attackPreview={attackPreview}
            challengerId={currentGame?.challenger_id}
            challengedId={currentGame?.challenged_id}
          />

        </div>
        <div className="min-w-[240px] max-w-[260px] h-[600px] flex flex-col flex-shrink-0">
          <GameHistory />
        </div>
      </div>

      {gameState?.status === 'active' && isCurrentPlayer && (
        <button
          type="button"
          onClick={() => setShowForfeitModal(true)}
          className="fixed bottom-6 right-6 z-[1000] bg-red-600 hover:bg-red-700 text-white border-0 rounded-full px-5 py-3 font-bold cursor-pointer shadow-lg focus-ring"
          aria-label="Forfeit game"
        >
          Forfeit
        </button>
      )}

      {showForfeitModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[2000]">
          <div
            ref={forfeitModalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm Forfeit"
            className="bg-neutral-900 border border-neutral-700 rounded-xl p-8 min-w-[320px] text-center text-white"
          >
            <h2 className="mt-0 mb-4 text-red-400">Forfeit Game?</h2>
            <p className="mb-6 text-neutral-300">Are you sure you want to forfeit? Your opponent will win.</p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => setShowForfeitModal(false)}
                disabled={isForfeiting}
                className="bg-neutral-700 hover:bg-neutral-600 text-white border-0 rounded-md px-5 py-3 font-bold cursor-pointer focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={handleForfeit}
                disabled={isForfeiting}
                className="bg-red-600 hover:bg-red-700 text-white border-0 rounded-md px-5 py-3 font-bold cursor-pointer focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isForfeiting ? 'Forfeiting...' : 'Forfeit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isGameOver && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[2000]">
          <div 
            ref={gameOverModalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Game Over"
            className="bg-neutral-900 border border-neutral-700 rounded-xl p-8 min-w-[320px] text-center text-white"
          >
            <h2 className={`mt-0 mb-4 ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
              {gameOverMessage}
            </h2>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-md px-5 py-3 font-bold cursor-pointer focus-ring"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {popoverState && actingCharacter && (
        <ActionPopover
          x={popoverState.x}
          y={popoverState.y}
          onClose={() => setPopoverState(null)}
          onMove={handlePopoverMove}
          onAttack={handlePopoverAttack}
          onDefend={handlePopoverDefend}
          onEndTurn={handlePopoverEndTurn}
           canMove={canMove}
          canAttack={!!(isMyTurn && !isSubmitting && activeMode !== 'attack' && !gameState.actingCharacterActions?.hasAttacked && !gameState.actingCharacterActions?.hasDefended)}
          canDefend={!!(isMyTurn && !isSubmitting && !gameState.actingCharacterActions?.hasDefended && !gameState.actingCharacterActions?.hasAttacked)}
          canEndTurn={isMyTurn && !isSubmitting}
          actingCharacterId={actingCharacter.id}
        />
      )}
    </div>
  );
}
