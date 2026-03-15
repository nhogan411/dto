import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchFriendsThunk } from '../../store/slices/friendsSlice';

export const FriendsList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { friends, status, error } = useAppSelector((state) => state.friends);

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchFriendsThunk());
    }
    // TODO: wire NotificationChannel in Task 20
  }, [dispatch, status]);

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
              <button
                style={{
                  backgroundColor: '#4ade80',
                  color: '#121212',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
                onClick={() => {
                  console.log(`Invite ${friend.username} to game`);
                }}
              >
                Invite to Game
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};