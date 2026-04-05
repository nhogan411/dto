import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { searchUsersThunk, sendFriendRequestThunk, clearSearchResults } from '../../store/slices/friendsSlice';

export const FriendSearch: React.FC = () => {
  const dispatch = useAppDispatch();
  const { searchResults, fetchStatus } = useAppSelector((state) => state.friends);
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

  const [sentRequestIds, setSentRequestIds] = useState<Set<number>>(new Set());
  const [sendingToUserId, setSendingToUserId] = useState<number | null>(null);

  const handleAddFriend = async (userId: number) => {
    setSendingToUserId(userId);
    try {
      await dispatch(sendFriendRequestThunk(userId)).unwrap();
      setSentRequestIds((prev) => new Set([...prev, userId]));
    } catch {
      // Error handled silently - button remains clickable
    } finally {
      setSendingToUserId(null);
    }
  };

  return (
    <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
      <h2 className="text-white m-0 mb-6 text-xl">Find Friends</h2>
      
      <input
        type="text"
        placeholder="Search by username..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded-md text-white mb-4 box-border focus-ring placeholder-neutral-400"
        aria-label="Search users"
      />

      {fetchStatus === 'loading' && debouncedQuery && (
        <div className="text-neutral-300 py-4 text-center" aria-live="polite">Searching...</div>
      )}

      {searchResults.length > 0 && (
        <ul className="list-none p-0 m-0">
          {searchResults.map((user) => {
            const isSent = sentRequestIds.has(user.id);
            const isSending = sendingToUserId === user.id;

            return (
              <li 
                key={user.id}
                className="flex justify-between items-center py-4 border-b border-neutral-800 last:border-b-0 bg-neutral-800 px-4 rounded-md mb-2 last:mb-0"
              >
                <div className="text-white font-bold">{user.username}</div>
                <button
                  onClick={() => void handleAddFriend(user.id)}
                  disabled={isSent || isSending}
                  className={`px-4 py-2 rounded-md font-bold cursor-pointer focus-ring transition-colors ${
                    isSent
                      ? 'bg-transparent text-emerald-400 border border-[var(--team-green)] opacity-60 cursor-not-allowed'
                      : 'bg-transparent text-emerald-400 border border-[var(--team-green)] hover:bg-[var(--team-green)] hover:text-neutral-950 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
                  }`}
                  aria-label={`Send friend request to ${user.username}`}
                >
                  {isSending ? 'Sending...' : isSent ? 'Request Sent ✓' : 'Add Friend'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      
      {debouncedQuery.trim() && searchResults.length === 0 && fetchStatus !== 'loading' && (
        <div className="text-neutral-300 text-center py-8">No users found.</div>
      )}
    </div>
  );
};
