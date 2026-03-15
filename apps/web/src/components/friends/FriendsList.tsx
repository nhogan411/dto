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
    <div style={{ backgroundColor: '#1e1e1e', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
      <h2 style={{ color: '#ffffff', margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Friends</h2>
      
      {status === 'loading' && <div style={{ color: '#a3a3a3' }}>Loading friends...</div>}
      {status === 'failed' && <div style={{ color: '#ef4444' }}>{error}</div>}
      
      {status === 'succeeded' && friends.length === 0 && (
        <div style={{ color: '#a3a3a3' }}>You have no friends yet.</div>
      )}

      {friends.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {friends.map((friend) => (
            <li 
              key={friend.id} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '0.75rem 0',
                borderBottom: '1px solid #333'
              }}
            >
              <div>
                <div style={{ color: '#ffffff', fontWeight: 'bold' }}>{friend.username}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <button
                  style={{
                    backgroundColor: '#4ade80',
                    color: '#121212',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: invitingFriendId === friend.id ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    opacity: invitingFriendId === friend.id ? 0.6 : 1,
                  }}
                  onClick={() => handleInvite(friend.id)}
                  disabled={invitingFriendId === friend.id}
                >
                  {invitingFriendId === friend.id ? 'Inviting...' : 'Invite to Game'}
                </button>
                {inviteErrors[friend.id] && (
                  <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
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