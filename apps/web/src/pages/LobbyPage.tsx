import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchGameThunk, clearGame } from '../store/slices/gameSlice';
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
  const currentUser = useAppSelector((state) => state.auth.user);
  const [isProcessing, setIsProcessing] = useState(false);

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
    if (currentGame && currentGame.status === 'active') {
      navigate(`/games/${currentGame.id}`);
    }
  }, [currentGame, navigate]);

  if (gameStatus === 'loading' || !currentGame) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading Lobby...</h2>
      </div>
    );
  }

  if (gameStatus === 'failed' || error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <h2>Error Loading Game</h2>
        <p>{error}</p>
      </div>
    );
  }

  const isChallenger = currentUser?.id === currentGame.challenger_id;
  const boardConfig = currentGame.board_config;
  const timeLimit = formatTimeLimit(currentGame.turn_time_limit);

  const handleAccept = async (params: { first_move?: boolean; starting_position_index?: number }) => {
    if (parsedGameId === null) return;
    setIsProcessing(true);
    try {
      await gameApi.acceptGame(parsedGameId, params);
      navigate(params.first_move ? '/' : `/games/${parsedGameId}`);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handleChoosePosition = async (startingPositionIndex: number) => {
    if (parsedGameId === null) return;
    setIsProcessing(true);
    try {
      await gameApi.choosePosition(parsedGameId, { starting_position_index: startingPositionIndex });
      navigate(`/games/${parsedGameId}`);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

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

  const renderBoardPreview = () => {
    const squares = [];
    for (let y = 1; y <= 8; y++) {
      for (let x = 1; x <= 8; x++) {
        const isBlocked = boardConfig.blocked_squares.some(
          ([bx, by]) => bx === x && by === y
        );
        let startPosLabel = null;
        let startPosColor = null;

        if (boardConfig.start_positions[0] && boardConfig.start_positions[0][0] === x && boardConfig.start_positions[0][1] === y) {
          startPosLabel = 'A';
          startPosColor = 'var(--accent)';
        } else if (boardConfig.start_positions[1] && boardConfig.start_positions[1][0] === x && boardConfig.start_positions[1][1] === y) {
          startPosLabel = 'B';
          startPosColor = '#3b82f6';
        }

        squares.push(
          <div
            key={`${x}-${y}`}
            style={{
              width: '32px',
              height: '32px',
              border: '1px solid var(--border)',
              backgroundColor: isBlocked ? 'var(--border)' : 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'white',
              position: 'relative',
            }}
          >
            {startPosLabel && (
              <div style={{
                width: '24px',
                height: '24px',
                backgroundColor: (startPosColor ?? undefined) as string | undefined,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {startPosLabel}
              </div>
            )}
          </div>
        );
      }
    }

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 32px)',
        gap: '0',
        margin: '2rem auto',
        width: 'fit-content',
        border: '2px solid var(--text-h)',
      }}>
        {squares}
      </div>
    );
  };

  const buttonStyle = {
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    border: '1px solid var(--accent-border)',
    background: 'var(--accent-bg)',
    color: 'var(--accent)',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    margin: '0.5rem',
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    background: 'transparent',
    borderColor: '#ef4444',
    color: '#ef4444',
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1>{isChallenger ? 'Game Lobby' : 'Game Invitation'}</h1>
      
      {isChallenger ? (
        currentGame.status === 'accepted' ? (
          <p style={{ fontSize: '18px', color: 'var(--text)' }}>Your opponent chose first move!</p>
        ) : (
          <p style={{ fontSize: '18px', color: 'var(--text)' }}>Waiting for opponent to accept...</p>
        )
      ) : (
        currentGame.status === 'accepted' ? null : (
          <p style={{ fontSize: '18px', color: 'var(--text)' }}>You have been challenged!</p>
        )
      )}

      {renderBoardPreview()}

      <div style={{ marginBottom: '2rem', fontSize: '16px' }}>
        <p><strong>Time limit:</strong> {timeLimit}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        {isChallenger ? (
          currentGame.status === 'accepted' ? (
            <>
              <h3 style={{ margin: '0 0 1rem 0' }}>Your opponent chose first move. Pick your starting position:</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
                <button 
                  style={{ ...buttonStyle, background: 'rgba(170, 59, 255, 0.2)' }}
                  onClick={() => void handleChoosePosition(0)}
                  disabled={isProcessing}
                >
                  Start at Position A
                </button>
                <button 
                  style={{ ...buttonStyle, background: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6', color: '#3b82f6' }}
                  onClick={() => void handleChoosePosition(1)}
                  disabled={isProcessing}
                >
                  Start at Position B
                </button>
              </div>
            </>
          ) : (
            <button 
              style={dangerButtonStyle} 
              onClick={() => void handleDecline()}
              disabled={isProcessing}
            >
              Cancel Game
            </button>
          )
        ) : (
          currentGame.status === 'accepted' ? (
            <p style={{ fontSize: '18px', color: 'var(--text)' }}>
              Waiting for {currentGame.challenger_username} to pick their starting position...
            </p>
          ) : (
            <>
              <h3 style={{ margin: '0 0 1rem 0' }}>Make your choice:</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
                <button 
                  style={buttonStyle}
                  onClick={() => void handleAccept({ first_move: true })}
                  disabled={isProcessing}
                >
                  I choose first move
                </button>
                <button 
                  style={{ ...buttonStyle, background: 'rgba(170, 59, 255, 0.2)' }}
                  onClick={() => void handleAccept({ starting_position_index: 0 })}
                  disabled={isProcessing}
                >
                  Start at Position A
                </button>
                <button 
                  style={{ ...buttonStyle, background: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6', color: '#3b82f6' }}
                  onClick={() => void handleAccept({ starting_position_index: 1 })}
                  disabled={isProcessing}
                >
                  Start at Position B
                </button>
              </div>
              <button 
                style={{ ...dangerButtonStyle, marginTop: '1rem' }} 
                onClick={() => void handleDecline()}
                disabled={isProcessing}
              >
                Decline Invitation
              </button>
            </>
          )
        )}
      </div>
    </div>
  );
}
