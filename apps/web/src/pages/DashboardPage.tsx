import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FriendsList } from '../components/friends/FriendsList';
import { FriendSearch } from '../components/friends/FriendSearch';
import { FriendRequests } from '../components/friends/FriendRequests';
import { useNotificationChannel } from '../cable/useNotificationChannel';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addFriendRequestAcceptedNotification,
  addFriendRequestNotification,
  addGameInvitation,
  markYourTurn,
} from '../store/slices/notificationSlice';
import { fetchFriendRequestsThunk, fetchFriendsThunk } from '../store/slices/friendsSlice';
import { fetchGamesThunk, acceptGameThunk, declineGameThunk } from '../store/slices/dashboardSlice';
import { gameApi } from '../api/game';

interface NotificationChannelMessage {
  event: string;
  friendship_id?: number;
  game_id?: number;
  challenger_username?: string;
  requester_username?: string;
  from_username?: string;
  by_username?: string;
}

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { notifications, count } = useAppSelector((state) => state.notifications);
  const { user } = useAppSelector((state) => state.auth);
  const { games, gamesStatus } = useAppSelector((state) => state.dashboard);
  const { friends } = useAppSelector((state) => state.friends);

  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(false);
  const [newGameChallengedId, setNewGameChallengedId] = useState<number | ''>('');
  const [newGameTimeLimit, setNewGameTimeLimit] = useState<number>(86400);
  const [newGameError, setNewGameError] = useState<string | null>(null);
  const [newGameSuccess, setNewGameSuccess] = useState<string | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  useEffect(() => {
    if (gamesStatus === 'idle') {
      void dispatch(fetchGamesThunk());
    }
  }, [dispatch, gamesStatus]);

  const onNotificationMessage = useCallback(
    (data: NotificationChannelMessage) => {
      switch (data.event) {
        case 'game_invitation_received': {
          if (typeof data.game_id === 'number') {
            dispatch(
              addGameInvitation({
                gameId: data.game_id,
                challengerUsername: data.challenger_username ?? 'A friend',
              }),
            );
            void dispatch(fetchGamesThunk());
          }
          break;
        }
        case 'friend_request_received': {
          dispatch(
            addFriendRequestNotification({
              friendshipId: data.friendship_id ?? Date.now(),
              requesterUsername: data.requester_username ?? data.from_username ?? 'A player',
            }),
          );
          void dispatch(fetchFriendRequestsThunk());
          void dispatch(fetchFriendsThunk());
          break;
        }
        case 'your_turn': {
          if (typeof data.game_id === 'number') {
            dispatch(markYourTurn({ gameId: data.game_id }));
            void dispatch(fetchGamesThunk());
          }
          break;
        }
        case 'friend_request_accepted': {
          dispatch(
            addFriendRequestAcceptedNotification({
              friendshipId: data.friendship_id,
              accepterUsername: data.by_username ?? 'A friend',
            }),
          );
          void dispatch(fetchFriendRequestsThunk());
          void dispatch(fetchFriendsThunk());
          break;
        }
        default:
          break;
      }
    },
    [dispatch],
  );

  useNotificationChannel(onNotificationMessage);

  const handleCreateGame = async () => {
    if (newGameChallengedId === '') return;
    setIsCreatingGame(true);
    setNewGameError(null);
    setNewGameSuccess(null);
    try {
      await gameApi.createGame(newGameChallengedId, newGameTimeLimit);
      setNewGameSuccess('Game invitation sent successfully!');
      void dispatch(fetchGamesThunk());
      setTimeout(() => {
        setIsNewGameModalOpen(false);
        setNewGameSuccess(null);
        setNewGameChallengedId('');
      }, 2000);
    } catch (err: any) {
      setNewGameError(err.response?.data?.error || 'Failed to create game');
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleAcceptGame = async (gameId: number) => {
    try {
      await dispatch(acceptGameThunk(gameId)).unwrap();
      navigate(`/games/${gameId}/lobby`);
    } catch (err) {
      console.error('Failed to accept game', err);
    }
  };

  const handleDeclineGame = async (gameId: number) => {
    try {
      await dispatch(declineGameThunk(gameId)).unwrap();
    } catch (err) {
      console.error('Failed to decline game', err);
    }
  };

  const activeGames = games.filter(g => g.status === 'active' || g.status === 'pending' && g.challenger_id === user?.id);
  const pendingInvitations = games.filter(g => g.status === 'pending' && g.challenged_id === user?.id);
  const completedGames = games.filter(g => g.status === 'completed' || g.status === 'forfeited');

  const statusBadgeStyles: Record<'pending' | 'active' | 'completed' | 'forfeited', { backgroundColor: string; color: string }> = {
    pending: { backgroundColor: '#f59e0b', color: '#fff' },
    active: { backgroundColor: '#3b82f6', color: '#fff' },
    completed: { backgroundColor: '#22c55e', color: '#052e16' },
    forfeited: { backgroundColor: '#f97316', color: '#fff' },
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem',
      color: '#ffffff',
      backgroundColor: '#121212',
      minHeight: '100vh',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#4ade80' }}>Dashboard</h1>
        <button
          onClick={() => setIsNewGameModalOpen(true)}
          style={{
            backgroundColor: '#4ade80',
            color: '#121212',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          New Game
        </button>
      </div>

      {isNewGameModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#1e1e1e',
            padding: '2rem',
            borderRadius: '8px',
            border: '1px solid #333',
            width: '100%',
            maxWidth: '500px',
          }}>
            <h2 style={{ marginTop: 0 }}>Start New Game</h2>
            
            {newGameError && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{newGameError}</div>}
            {newGameSuccess && <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{newGameSuccess}</div>}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Opponent</label>
              <select
                value={newGameChallengedId}
                onChange={(e) => setNewGameChallengedId(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: 'none' }}
              >
                <option value="">Select a friend</option>
                {friends.map(f => (
                  <option key={f.id} value={f.id}>{f.username}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Turn Time Limit</label>
              <select
                value={newGameTimeLimit}
                onChange={(e) => setNewGameTimeLimit(Number(e.target.value))}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', backgroundColor: '#333', color: '#fff', border: 'none' }}
              >
                <option value={600}>10 minutes</option>
                <option value={3600}>1 hour</option>
                <option value={7200}>2 hours</option>
                <option value={86400}>1 day</option>
                <option value={172800}>2 days</option>
                <option value={604800}>1 week</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                onClick={() => setIsNewGameModalOpen(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #555', backgroundColor: 'transparent', color: '#fff', cursor: 'pointer' }}
                disabled={isCreatingGame}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGame}
                disabled={newGameChallengedId === '' || isCreatingGame}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '4px', border: 'none',
                  backgroundColor: newGameChallengedId === '' ? '#555' : '#4ade80',
                  color: '#121212', fontWeight: 'bold', cursor: newGameChallengedId === '' ? 'not-allowed' : 'pointer'
                }}
              >
                {isCreatingGame ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingInvitations.length > 0 && (
        <div style={{
          backgroundColor: '#1e1e1e',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #333',
          marginBottom: '2rem',
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#fbbf24' }}>Pending Invitations</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {pendingInvitations.map(game => (
              <div key={game.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2a2a2a', padding: '1rem', borderRadius: '6px' }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>Invitation from User #{game.challenger_id}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleAcceptGame(game.id)} style={{ backgroundColor: '#4ade80', color: '#121212', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Accept</button>
                  <button onClick={() => handleDeclineGame(game.id)} style={{ backgroundColor: '#ef4444', color: '#fff', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        backgroundColor: '#1e1e1e',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid #333',
        marginBottom: '2rem',
      }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Active Games</h2>
        {gamesStatus === 'loading' && <div style={{ color: '#a3a3a3' }}>Loading games...</div>}
        {gamesStatus === 'succeeded' && activeGames.length === 0 && (
          <div style={{ color: '#a3a3a3' }}>No active games.</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {activeGames.map(game => {
            const isMyTurn = game.current_turn_user_id === user?.id;
            return (
              <div key={game.id} style={{ backgroundColor: '#2a2a2a', padding: '1rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>Game #{game.id}</span>
                  <span style={{
                    padding: '0.25rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold',
                    backgroundColor: statusBadgeStyles[game.status].backgroundColor,
                    color: statusBadgeStyles[game.status].color,
                  }}>
                    {game.status.toUpperCase()}
                  </span>
                </div>
                {game.status === 'active' && (
                  <div style={{ color: isMyTurn ? '#4ade80' : '#9ca3af', fontWeight: 'bold' }}>
                    {isMyTurn ? 'Your turn!' : 'Waiting...'}
                  </div>
                )}
                {game.status === 'pending' && (
                  <div style={{ color: '#9ca3af' }}>Waiting for opponent to accept...</div>
                )}
                <button
                  onClick={() => navigate(`/games/${game.id}`)}
                  style={{ marginTop: '0.5rem', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  View Game
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        backgroundColor: '#1e1e1e',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid #333',
        marginBottom: '2rem',
      }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Completed Games</h2>
        {gamesStatus === 'loading' && <div style={{ color: '#a3a3a3' }}>Loading games...</div>}
        {gamesStatus === 'succeeded' && completedGames.length === 0 && (
          <div style={{ color: '#a3a3a3' }}>No completed games yet.</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {completedGames.map(game => {
            const wonGame = game.winner_id !== null && game.winner_id === user?.id;

            return (
              <div key={game.id} style={{ backgroundColor: '#2a2a2a', padding: '1rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>Game #{game.id}</span>
                  <span style={{
                    padding: '0.25rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 'bold',
                    backgroundColor: statusBadgeStyles[game.status].backgroundColor,
                    color: statusBadgeStyles[game.status].color,
                  }}>
                    {game.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ color: wonGame ? '#4ade80' : '#fca5a5', fontWeight: 'bold' }}>
                  {wonGame ? 'Result: Win' : 'Result: Loss'}
                </div>
                <button
                  onClick={() => navigate(`/games/${game.id}`)}
                  style={{ marginTop: '0.5rem', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  View Game
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#1e1e1e',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #333',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>
          Notifications {count > 0 ? `(${count})` : ''}
        </h2>
        {notifications.length === 0 ? (
          <div style={{ color: '#a3a3a3' }}>No notifications yet.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
            {notifications.slice(0, 5).map((notification) => (
              <li
                key={notification.id}
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  backgroundColor: '#181818',
                  border: '1px solid #2f2f2f',
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{notification.message}</div>
                <div style={{ color: '#a3a3a3', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem',
      }}>
        <div>
          <FriendsList />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <FriendRequests />
          <FriendSearch />
        </div>
      </div>
    </div>
  );
}
