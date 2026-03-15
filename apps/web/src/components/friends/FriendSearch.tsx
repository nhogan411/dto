import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { searchUsersThunk, sendFriendRequestThunk, clearSearchResults } from '../../store/slices/friendsSlice';

export const FriendSearch: React.FC = () => {
  const dispatch = useAppDispatch();
  const { searchResults, status } = useAppSelector((state) => state.friends);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      void dispatch(searchUsersThunk(debouncedQuery));
    } else {
      dispatch(clearSearchResults());
    }
  }, [debouncedQuery, dispatch]);

  const handleAddFriend = (userId: number) => {
    void dispatch(sendFriendRequestThunk(userId));
  };

  return (
    <div style={{ backgroundColor: '#1e1e1e', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
      <h2 style={{ color: '#ffffff', margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Find Friends</h2>
      
      <input
        type="text"
        placeholder="Search by username..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#121212',
          border: '1px solid #333',
          borderRadius: '4px',
          color: '#ffffff',
          marginBottom: '1rem',
          boxSizing: 'border-box'
        }}
      />

      {status === 'loading' && debouncedQuery && (
        <div style={{ color: '#a3a3a3' }}>Searching...</div>
      )}

      {searchResults.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {searchResults.map((user) => (
            <li 
              key={user.id}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '0.75rem 0',
                borderBottom: '1px solid #333'
              }}
            >
              <div style={{ color: '#ffffff', fontWeight: 'bold' }}>{user.username}</div>
              <button
                onClick={() => handleAddFriend(user.id)}
                style={{
                  backgroundColor: '#1e1e1e',
                  color: '#4ade80',
                  border: '1px solid #4ade80',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Add Friend
              </button>
            </li>
          ))}
        </ul>
      )}
      
      {debouncedQuery.trim() && searchResults.length === 0 && status !== 'loading' && (
        <div style={{ color: '#a3a3a3' }}>No users found.</div>
      )}
    </div>
  );
};