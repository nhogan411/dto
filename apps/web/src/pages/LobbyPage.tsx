import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchGameThunk, clearGame } from '../store/slices/gameSlice';
import { fetchPlayerCharactersThunk } from '../store/slices/playerCharactersSlice';
import { gameApi } from '../api/game';

function formatTimeLimit(seconds?: number) {
  if (!seconds) return 'Unknown';
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  return `${Math.round(seconds / 86400)} days`;
}

export default function LobbyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { currentGame, status: gameStatus, error } = useAppSelector((state) => state.game);
  const { characters, status: charactersStatus } = useAppSelector((state) => state.playerCharacters);
  const currentUser = useAppSelector((state) => state.auth.user);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectError, setSelectError] = useState<string | null>(null);

  const parsedGameId = id ? Number.parseInt(id, 10) : null;

  useEffect(() => {
    if (parsedGameId !== null) {
      void dispatch(fetchGameThunk(parsedGameId));
    }
    return () => {
      dispatch(clearGame());
    };
  }, [dispatch, parsedGameId]);

  useEffect(() => {
    if (charactersStatus === 'idle') {
      void dispatch(fetchPlayerCharactersThunk());
    }
  }, [dispatch, charactersStatus]);

  useEffect(() => {
    if (currentGame && currentGame.status === 'active') {
      navigate(`/games/${currentGame.id}`);
    }
  }, [currentGame, navigate]);

  if (gameStatus === 'loading' || !currentGame) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <h2 className="text-2xl font-bold text-neutral-400 animate-pulse">Loading Lobby...</h2>
      </div>
    );
  }

  if (gameStatus === 'failed' || error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 p-8">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Game</h2>
        <p className="text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20">{error}</p>
      </div>
    );
  }

  const isChallenger = currentUser?.id === currentGame.challenger_id;
  const boardConfig = currentGame.board_config;
  const timeLimit = formatTimeLimit(currentGame.turn_time_limit);

  const opponentUsername = isChallenger ? currentGame.challenged_username : currentGame.challenger_username;
  
  const myPicks = isChallenger ? currentGame.challenger_picks : currentGame.challenged_picks;
  const opponentPicks = isChallenger ? currentGame.challenged_picks : currentGame.challenger_picks;

  const hasLocked = Array.isArray(myPicks) && myPicks.length > 0;
  const opponentLocked = Array.isArray(opponentPicks) && opponentPicks.length > 0;

  const handleDecline = async () => {
    if (parsedGameId === null) return;
    setIsProcessing(true);
    try {
      await gameApi.declineGame(parsedGameId);
      navigate('/');
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handleToggleCharacter = (charId: number) => {
    if (hasLocked || isProcessing) return;
    setSelectError(null);
    setSelectedIds((prev) => {
      if (prev.includes(charId)) {
        return prev.filter((id) => id !== charId);
      }
      if (prev.length >= 2) return prev;
      return [...prev, charId];
    });
  };

  const handleConfirmPicks = async () => {
    if (parsedGameId === null) return;
    if (selectedIds.length !== 2) return;
    
    setIsProcessing(true);
    setSelectError(null);
    try {
      await gameApi.selectCharacters(parsedGameId, selectedIds);
      void dispatch(fetchGameThunk(parsedGameId));
    } catch (err: any) {
      console.error(err);
      setSelectError(err.message || 'Failed to confirm picks.');
      setIsProcessing(false);
    }
  };

  const renderBoardPreview = () => {
    const squares = [];
    for (let y = 1; y <= 12; y++) {
      for (let x = 1; x <= 12; x++) {
        const tileType = boardConfig.tiles[y - 1]?.[x - 1]?.type ?? 'open';
        const isBlocked = tileType === 'blocked';
        let startPosLabel: string | null = null;
        let startPosColor: string | null = null;

        if (tileType === 'spawn_challenger') {
          startPosLabel = 'A';
          startPosColor = 'var(--team-blue)';
        } else if (tileType === 'spawn_challenged') {
          startPosLabel = 'B';
          startPosColor = 'var(--team-green)';
        }

        squares.push(
          <div
            key={`${x}-${y}`}
            className={`w-8 h-8 sm:w-10 sm:h-10 border border-neutral-800 flex items-center justify-center text-xs sm:text-sm font-bold text-white relative ${isBlocked ? 'bg-neutral-800' : 'bg-neutral-900'}`}
          >
            {startPosLabel && (
              <div
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-lg"
                style={{ backgroundColor: startPosColor ?? undefined }}
              >
                {startPosLabel}
              </div>
            )}
          </div>
        );
      }
    }

    return (
      <div className="grid grid-cols-[repeat(12,minmax(0,1fr))] gap-0 mx-auto w-fit border-2 border-neutral-700 rounded-sm overflow-hidden shadow-2xl bg-neutral-950">
        {squares}
      </div>
    );
  };

  const teamColorClass = isChallenger ? 'text-[var(--team-blue)]' : 'text-[var(--team-green)]';
  const teamBorderClass = isChallenger ? 'border-[var(--team-blue)]' : 'border-[var(--team-green)]';
  const teamBgClass = isChallenger ? 'bg-[var(--team-blue)]' : 'bg-[var(--team-green)]';
  const teamBgSoftClass = isChallenger ? 'bg-blue-900/30' : 'bg-green-900/30';

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 py-8 px-4 sm:px-8 flex flex-col items-center">
      <div className={`w-full max-w-4xl bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl overflow-hidden relative border-t-4 ${teamBorderClass}`}>
        
        <div className="p-6 sm:p-8 border-b border-neutral-800 bg-neutral-900/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight m-0 text-white mb-2">
              {isChallenger ? 'Game Lobby' : 'Game Invitation'}
            </h1>
            <p className="text-neutral-400 flex items-center justify-center md:justify-start gap-2">
              <span className="font-mono text-sm bg-neutral-800 px-2 py-1 rounded text-neutral-300 border border-neutral-700">
                Time limit: {timeLimit}
              </span>
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="flex items-center gap-3">
              <div className={`flex flex-col items-end ${teamColorClass}`}>
                <span className="text-sm uppercase tracking-wider font-bold opacity-80">You</span>
                <span className="font-bold text-lg">{currentUser?.username}</span>
              </div>
              <div className={`w-3 h-3 rounded-full ${hasLocked ? teamBgClass : 'bg-neutral-600 animate-pulse'}`} />
            </div>

            <div className="flex items-center gap-3 opacity-60">
              <div className="flex flex-col items-end text-neutral-400">
                <span className="text-xs uppercase tracking-wider font-bold opacity-80">Opponent</span>
                <span className="font-medium text-sm">{opponentUsername}</span>
              </div>
              <div className={`w-3 h-3 rounded-full ${opponentLocked ? 'bg-neutral-400' : 'bg-neutral-700 animate-pulse'}`} />
            </div>
          </div>
        </div>

        <div className="w-full flex">
          <div className={`flex-1 p-3 text-center text-sm font-bold tracking-wide uppercase transition-colors ${hasLocked ? `${teamBgClass} text-white` : 'bg-neutral-800 text-neutral-400'}`}>
            {hasLocked ? '✓ Locked In' : 'Select 2 Characters'}
          </div>
          <div className={`flex-1 p-3 text-center text-sm font-bold tracking-wide uppercase transition-colors ${opponentLocked ? 'bg-neutral-700 text-neutral-200' : 'bg-neutral-800/50 text-neutral-500'}`}>
            {opponentLocked ? `✓ ${opponentUsername} Locked In` : `Waiting for ${opponentUsername}`}
          </div>
        </div>

        <div className="p-6 sm:p-8 flex flex-col xl:flex-row gap-8 items-start">
          
          <div className="w-full xl:w-auto flex flex-col items-center gap-4 bg-neutral-950 p-6 rounded-xl border border-neutral-800">
            <h3 className="text-neutral-400 text-sm font-bold uppercase tracking-widest m-0">Battlefield Preview</h3>
            {renderBoardPreview()}
          </div>

          <div className="flex-1 w-full flex flex-col gap-6">
            {!hasLocked && (
              <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold m-0 text-white">Your Stable</h3>
                  <span className="text-sm font-mono text-neutral-400">
                    <span className={selectedIds.length === 2 ? teamColorClass : ''}>{selectedIds.length}</span> / 2 selected
                  </span>
                </div>
                
                {charactersStatus === 'loading' && (
                  <div className="p-8 text-center text-neutral-500 animate-pulse border-2 border-dashed border-neutral-800 rounded-xl">
                    Loading characters...
                  </div>
                )}
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {characters.map((char) => {
                    const isSelected = selectedIds.includes(char.id);
                    return (
                      <button
                        key={char.id}
                        onClick={() => handleToggleCharacter(char.id)}
                        aria-label={`Select ${char.name}`}
                        className={`focus-ring p-4 sm:p-5 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 group ${
                          isSelected 
                            ? `${teamBgSoftClass} ${teamBorderClass} shadow-lg shadow-[var(--team-blue)]/10 scale-[1.02] transform` 
                            : 'bg-neutral-800/50 border-neutral-700/50 hover:bg-neutral-800 hover:border-neutral-500'
                        }`}
                      >
                        <span className={`text-4xl drop-shadow-md transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110'} capitalize`}>
                          {char.icon}
                        </span>
                        <span className="font-bold text-sm sm:text-base text-neutral-200">{char.name}</span>
                        {isSelected && (
                          <span className={`text-xs font-bold uppercase tracking-wider ${teamColorClass}`}>
                            Ready
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectError && (
                  <div role="alert" className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center font-medium animate-in fade-in">
                    {selectError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-8 pt-6 border-t border-neutral-800">
                  <button
                    className="focus-ring px-6 py-3 rounded-lg font-bold text-red-400 bg-transparent border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 transition-colors disabled:opacity-50"
                    onClick={() => void handleDecline()}
                    disabled={isProcessing}
                    aria-label="Decline Invitation"
                  >
                    {isChallenger ? 'Cancel Game' : 'Decline Invitation'}
                  </button>
                  <button
                    className={`focus-ring px-8 py-3 rounded-lg font-bold text-neutral-950 shadow-lg transition-all ${
                      selectedIds.length === 2 && !isProcessing
                        ? `${teamBgClass} hover:brightness-110 hover:-translate-y-0.5` 
                        : 'bg-neutral-700 text-neutral-400 cursor-not-allowed opacity-50'
                    }`}
                    onClick={() => void handleConfirmPicks()}
                    disabled={selectedIds.length !== 2 || isProcessing}
                    aria-label="Confirm Picks"
                  >
                    {isProcessing ? 'Confirming...' : 'Lock In Team'}
                  </button>
                </div>
              </div>
            )}

            {hasLocked && (
              <div className="w-full flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-neutral-900 border border-neutral-800 rounded-xl shadow-inner animate-in fade-in duration-700">
                <div className={`w-16 h-16 rounded-full ${teamBgSoftClass} flex items-center justify-center mb-6`}>
                  <div className={`w-8 h-8 rounded-full ${teamBgClass} animate-pulse`} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Forces Deployed</h2>
                <p className="text-neutral-400 max-w-sm mx-auto mb-8 leading-relaxed">
                  Your team is locked in and ready for battle. Waiting for <strong className="text-neutral-200">{opponentUsername}</strong> to finalize their selection. The match will begin automatically.
                </p>
                <button
                  className="focus-ring px-5 py-2 text-sm font-medium text-neutral-400 hover:text-red-400 transition-colors"
                  onClick={() => void handleDecline()}
                  disabled={isProcessing}
                  aria-label="Cancel Game"
                >
                  Abandon Match
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
