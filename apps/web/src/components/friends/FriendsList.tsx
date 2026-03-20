import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchFriendsThunk } from '../../store/slices/friendsSlice';
import { fetchGamesThunk } from '../../store/slices/dashboardSlice';
import { gameApi } from '../../api/game';

export const FriendsList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { friends, status, error } = useAppSelector((state) => state.friends);
  const [invitingFriendId, setInvitingFriendId] = useState<number | null>(null);
  const [inviteErrors, setInviteErrors] = useState<Record<number, string | null>>({});

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchFriendsThunk());
    }
    // TODO: wire NotificationChannel in Task 20
  }, [dispatch, status]);

  const handleInvite = async (friendId: number) => {
    setInvitingFriendId(friendId);
    setInviteErrors((prev) => ({ ...prev, [friendId]: null }));
    try {
      await gameApi.createGame(friendId);
      await dispatch(fetchGamesThunk()).unwrap();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { errors?: string[] } } };
      const errorMessage = axiosError?.response?.data?.errors?.[0] || 'Failed to create game';
      setInviteErrors((prev) => ({ ...prev, [friendId]: errorMessage }));
    } finally {
      setInvitingFriendId(null);
    }
  };

  return (
    <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
      <h2 className="text-white m-0 mb-6 text-xl">Friends</h2>
      
      {status === 'loading' && (
        <div className="text-neutral-300 py-8 text-center" aria-live="polite">Loading friends...</div>
      )}
      
      {status === 'failed' && (
        <div className="text-red-400 py-8 text-center bg-red-500/10 rounded-md border border-red-500/20" aria-live="assertive">{error}</div>
      )}
      
      {status === 'succeeded' && friends.length === 0 && (
        <div className="text-neutral-300 text-center py-8">You have no friends yet.</div>
      )}

      {friends.length > 0 && (
        <ul className="list-none p-0 m-0">
          {friends.map((friend) => (
            <li 
              key={friend.id} 
              className="flex justify-between items-center py-4 border-b border-neutral-800 last:border-b-0 bg-neutral-800 px-4 rounded-md mb-2 last:mb-0"
            >
              <div className="flex items-center gap-3">
                <div className="text-white font-bold">{friend.username}</div>
                {friend.status === 'online' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-600 text-white">
                    Online
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end">
                <button
                  className="bg-[var(--team-green)] text-neutral-950 border-none px-4 py-2 rounded-md font-bold cursor-pointer focus-ring disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                  onClick={() => handleInvite(friend.id)}
                  disabled={invitingFriendId === friend.id}
                  aria-label={`Invite ${friend.username} to game`}
                >
                  {invitingFriendId === friend.id ? 'Inviting...' : 'Invite to Game'}
                </button>
                {inviteErrors[friend.id] && (
                  <div className="text-red-400 text-sm mt-2" aria-live="assertive">
                    {inviteErrors[friend.id]}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
