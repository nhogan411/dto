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
  addPositionPickNeeded,
  markYourTurn,
} from '../store/slices/notificationSlice';
import { fetchFriendRequestsThunk, fetchFriendsThunk } from '../store/slices/friendsSlice';
import { fetchGamesThunk, declineGameThunk } from '../store/slices/dashboardSlice';
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
        case 'position_pick_needed': {
          if (typeof data.game_id === 'number') {
            dispatch(addPositionPickNeeded({ gameId: data.game_id }));
            void dispatch(fetchGamesThunk());
          }
          break;
        }
        case 'invite_expired': {
          void dispatch(fetchGamesThunk());
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

  const handleAcceptGame = (gameId: number) => {
    navigate(`/games/${gameId}/lobby`);
  };

  const handleDeclineGame = async (gameId: number) => {
    try {
      await dispatch(declineGameThunk(gameId)).unwrap();
    } catch (err) {
      console.error('Failed to decline game', err);
    }
  };

  const activeGames = games.filter(g => g.status === 'active' || (g.status === 'pending' && g.challenger_id === user?.id) || g.status === 'accepted');
  const pendingInvitations = games.filter(g => g.status === 'pending' && g.challenged_id === user?.id);
  const completedGames = games.filter(g => g.status === 'completed' || g.status === 'forfeited');

  const statusBadgeStyles: Record<'pending' | 'active' | 'completed' | 'forfeited' | 'accepted', string> = {
    pending: 'bg-amber-500 text-white',
    active: 'bg-blue-500 text-white',
    completed: 'bg-green-600 text-white',
    forfeited: 'bg-orange-500 text-white',
    accepted: 'bg-violet-500 text-white',
  };

  return (
    <main className="max-w-[1200px] mx-auto p-8 text-white bg-neutral-950 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="m-0 text-3xl text-[var(--team-green)]">Dashboard</h1>
        <button
          onClick={() => setIsNewGameModalOpen(true)}
          className="bg-[var(--team-green)] text-neutral-950 border-none px-6 py-3 rounded-md text-base font-bold cursor-pointer focus-ring"
          aria-label="Start a new game"
        >
          New Game
        </button>
      </div>

      {isNewGameModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[1000]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-game-title"
            tabIndex={-1}
            ref={(el) => { if (el && !el.contains(document.activeElement)) el.focus(); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsNewGameModalOpen(false);
            }}
            className="bg-neutral-900 p-8 rounded-lg border border-neutral-700 w-full max-w-[500px]"
          >
            <h2 id="new-game-title" className="mt-0 text-2xl">Start New Game</h2>
            
            {newGameError && <div className="text-red-500 mb-4">{newGameError}</div>}
            {newGameSuccess && <div className="text-[var(--team-green)] mb-4">{newGameSuccess}</div>}

            <div className="mb-4">
              <label htmlFor="opponent-select" className="block mb-2">Opponent</label>
              <select
                id="opponent-select"
                value={newGameChallengedId}
                onChange={(e) => setNewGameChallengedId(Number(e.target.value))}
                className="w-full p-2 rounded bg-neutral-800 text-white border-none focus-ring"
                aria-label="Select opponent"
              >
                <option value="">Select a friend</option>
                {friends.map(f => (
                  <option key={f.id} value={f.id}>{f.username}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label htmlFor="time-limit-select" className="block mb-2">Turn Time Limit</label>
              <select
                id="time-limit-select"
                value={newGameTimeLimit}
                onChange={(e) => setNewGameTimeLimit(Number(e.target.value))}
                className="w-full p-2 rounded bg-neutral-800 text-white border-none focus-ring"
                aria-label="Select turn time limit"
              >
                <option value={600}>10 minutes</option>
                <option value={3600}>1 hour</option>
                <option value={7200}>2 hours</option>
                <option value={86400}>1 day</option>
                <option value={172800}>2 days</option>
                <option value={604800}>1 week</option>
              </select>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setIsNewGameModalOpen(false)}
                className="px-4 py-2 rounded border border-neutral-500 bg-transparent text-white cursor-pointer focus-ring disabled:opacity-50"
                disabled={isCreatingGame}
                aria-label="Cancel game creation"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGame}
                disabled={newGameChallengedId === '' || isCreatingGame}
                className={`px-4 py-2 rounded border-none font-bold focus-ring ${
                  newGameChallengedId === '' ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' : 'bg-[var(--team-green)] text-neutral-950 cursor-pointer'
                }`}
                aria-label={isCreatingGame ? 'Sending game invitation' : 'Send game invitation'}
              >
                {isCreatingGame ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingInvitations.length > 0 && (
        <section
          aria-labelledby="pending-invitations-title"
          className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 mb-8"
        >
          <h2 id="pending-invitations-title" className="m-0 mb-4 text-xl text-amber-400">Pending Invitations</h2>
          <div className="grid gap-4">
            {pendingInvitations.map(game => (
              <div key={game.id} className="flex justify-between items-center bg-neutral-800 p-4 rounded-md">
               <div>
                   <span className="font-bold">Invitation from {game.challenger_username || `User #${game.challenger_id}`}</span>
                 </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAcceptGame(game.id)} className="bg-[var(--team-green)] text-neutral-950 px-4 py-2 border-none rounded cursor-pointer font-bold focus-ring" aria-label={`Accept invitation from ${game.challenger_username || game.challenger_id}`}>Accept</button>
                  <button onClick={() => handleDeclineGame(game.id)} className="bg-red-500 text-white px-4 py-2 border-none rounded cursor-pointer font-bold focus-ring" aria-label={`Decline invitation from ${game.challenger_username || game.challenger_id}`}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section
        aria-labelledby="active-games-title"
        className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 mb-8"
      >
        <h2 id="active-games-title" className="m-0 mb-4 text-xl">Active Games</h2>
        {gamesStatus === 'loading' && <div className="text-neutral-400">Loading games...</div>}
        {gamesStatus === 'succeeded' && activeGames.length === 0 && (
          <div className="text-neutral-400">No active games.</div>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {activeGames.map(game => {
            const isMyTurn = game.current_turn_user_id === user?.id;
            const opponentUsername = game.challenger_id === user?.id
              ? (game.challenged_username || `User #${game.challenged_id}`)
              : (game.challenger_username || `User #${game.challenger_id}`);
            return (
              <div key={game.id} className="bg-neutral-800 p-4 rounded-md flex flex-col gap-2">
                <div className="flex justify-between items-center">
                   <span className="font-bold">Game #{game.id} vs {opponentUsername}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusBadgeStyles[game.status]}`}>
                    {game.status.toUpperCase()}
                  </span>
                </div>
                {game.status === 'active' && (
                  <div className={`font-bold ${isMyTurn ? 'text-[var(--team-green)]' : 'text-neutral-400'}`}>
                    {isMyTurn ? 'Your turn!' : 'Waiting...'}
                  </div>
                )}
                {game.status === 'pending' && (
                  <div className="text-neutral-400">Waiting for opponent to accept...</div>
                )}
                {game.status === 'accepted' && (
                  <div className={`font-bold ${game.challenger_id === user?.id ? 'text-violet-400' : 'text-neutral-400'}`}>
                    {game.challenger_id === user?.id ? 'Choose your starting position!' : 'Waiting for challenger...'}
                  </div>
                )}
                <button
                  onClick={() => navigate(
                    (game.status === 'pending' || game.status === 'accepted')
                      ? `/games/${game.id}/lobby`
                      : `/games/${game.id}`
                  )}
                  className="mt-2 bg-[var(--team-blue)] text-white border-none p-2 rounded cursor-pointer font-bold focus-ring"
                  aria-label={`View active game ${game.id} versus ${opponentUsername}`}
                >
                  View Game
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="completed-games-title"
        className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 mb-8"
      >
        <h2 id="completed-games-title" className="m-0 mb-4 text-xl">Completed Games</h2>
        {gamesStatus === 'loading' && <div className="text-neutral-400">Loading games...</div>}
        {gamesStatus === 'succeeded' && completedGames.length === 0 && (
          <div className="text-neutral-400">No completed games yet.</div>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {completedGames.map(game => {
            const wonGame = game.winner_id !== null && game.winner_id === user?.id;
            const opponentUsername = game.challenger_id === user?.id
              ? (game.challenged_username || `User #${game.challenged_id}`)
              : (game.challenger_username || `User #${game.challenger_id}`);

            return (
              <div key={game.id} className="bg-neutral-800 p-4 rounded-md flex flex-col gap-2">
                <div className="flex justify-between items-center">
                   <span className="font-bold">Game #{game.id} vs {opponentUsername}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusBadgeStyles[game.status]}`}>
                    {game.status.toUpperCase()}
                  </span>
                </div>
                <div className={`font-bold ${wonGame ? 'text-[var(--team-green)]' : 'text-red-400'}`}>
                  {wonGame ? 'Result: Win' : 'Result: Loss'}
                </div>
                <button
                  onClick={() => navigate(`/games/${game.id}`)}
                  className="mt-2 bg-[var(--team-blue)] text-white border-none p-2 rounded cursor-pointer font-bold focus-ring"
                  aria-label={`View completed game ${game.id} versus ${opponentUsername}`}
                >
                  View Game
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="notifications-title"
        className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 mb-8"
      >
        <h2 id="notifications-title" className="m-0 mb-4 text-xl">
          Notifications {count > 0 ? `(${count})` : ''}
        </h2>
        {notifications.length === 0 ? (
          <div className="text-neutral-400">No notifications yet.</div>
        ) : (
          <ul className="list-none p-0 m-0 grid gap-3">
            {notifications.slice(0, 5).map((notification) => (
              <li
                key={notification.id}
                className="p-3 rounded-md bg-neutral-950 border border-neutral-800"
              >
                <div className="font-bold">{notification.message}</div>
                <div className="text-neutral-400 text-sm mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Friends and Networking" className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8">
        <div>
          <FriendsList />
        </div>
        <div className="flex flex-col gap-8">
          <FriendRequests />
          <FriendSearch />
        </div>
      </section>
    </main>
  );
}
