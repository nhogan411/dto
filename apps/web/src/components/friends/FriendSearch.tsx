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
    <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
      <h2 className="text-white m-0 mb-6 text-xl">Find Friends</h2>
      
      <input
        type="text"
        placeholder="Search by username..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded-md text-white mb-4 box-border focus-ring placeholder-neutral-500"
        aria-label="Search users"
      />

      {status === 'loading' && debouncedQuery && (
        <div className="text-neutral-400 py-4 text-center" aria-live="polite">Searching...</div>
      )}

      {searchResults.length > 0 && (
        <ul className="list-none p-0 m-0" role="list">
          {searchResults.map((user) => (
            <li 
              key={user.id}
              className="flex justify-between items-center py-4 border-b border-neutral-800 last:border-b-0 bg-neutral-800 px-4 rounded-md mb-2 last:mb-0"
              role="listitem"
            >
              <div className="text-white font-bold">{user.username}</div>
              <button
                onClick={() => handleAddFriend(user.id)}
                className="bg-transparent text-[var(--team-green)] border border-[var(--team-green)] hover:bg-[var(--team-green)] hover:text-neutral-950 px-4 py-2 rounded-md font-bold cursor-pointer focus-ring transition-colors"
                aria-label={`Send friend request to ${user.username}`}
              >
                Add Friend
              </button>
            </li>
          ))}
        </ul>
      )}
      
      {debouncedQuery.trim() && searchResults.length === 0 && status !== 'loading' && (
        <div className="text-neutral-400 text-center py-8">No users found.</div>
      )}
    </div>
  );
};
