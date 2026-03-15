import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchFriendRequestsThunk, acceptFriendRequestThunk, declineFriendRequestThunk, fetchFriendsThunk } from '../../store/slices/friendsSlice';

export const FriendRequests: React.FC = () => {
  const dispatch = useAppDispatch();
  const { pendingRequests, status } = useAppSelector((state) => state.friends);

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchFriendRequestsThunk());
    }
  }, [dispatch, status]);

  const handleAccept = (id: number) => {
    void dispatch(acceptFriendRequestThunk(id)).then(() => {
      void dispatch(fetchFriendsThunk());
    });
  };

  const handleDecline = (id: number) => {
    void dispatch(declineFriendRequestThunk(id));
  };

  return (
    <div style={{ backgroundColor: '#1e1e1e', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
      <h2 style={{ color: '#ffffff', margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Friend Requests</h2>

      {status === 'loading' && <div style={{ color: '#a3a3a3' }}>Loading requests...</div>}
      
      {status === 'succeeded' && pendingRequests.length === 0 && (
        <div style={{ color: '#a3a3a3' }}>No pending requests.</div>
      )}

      {pendingRequests.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {pendingRequests.map((request) => (
            <li 
              key={request.id}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '0.75rem 0',
                borderBottom: '1px solid #333'
              }}
            >
              <div style={{ color: '#ffffff', fontWeight: 'bold' }}>
                {request.sender?.username || 'Unknown User'}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleAccept(request.id)}
                  style={{
                    backgroundColor: '#4ade80',
                    color: '#121212',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(request.id)}
                  style={{
                    backgroundColor: '#1e1e1e',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};