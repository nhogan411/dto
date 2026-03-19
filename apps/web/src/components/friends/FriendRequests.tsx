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
    <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
      <h2 className="text-white m-0 mb-6 text-xl">Friend Requests</h2>

      {status === 'loading' && (
        <div className="text-neutral-300 py-8 text-center" aria-live="polite">Loading requests...</div>
      )}
      
      {status === 'succeeded' && pendingRequests.length === 0 && (
        <div className="text-neutral-300 text-center py-8">No pending requests.</div>
      )}

      {pendingRequests.length > 0 && (
        <ul className="list-none p-0 m-0">
          {pendingRequests.map((request) => (
            <li 
              key={request.id}
              className="flex justify-between items-center py-4 border-b border-neutral-800 last:border-b-0 bg-neutral-800 px-4 rounded-md mb-2 last:mb-0"
            >
              <div className="text-white font-bold">
                {request.sender?.username || 'Unknown User'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(request.id)}
                  className="bg-[var(--team-green)] text-neutral-950 border-none px-4 py-2 rounded-md font-bold cursor-pointer focus-ring transition-colors hover:brightness-110"
                  aria-label={`Accept friend request from ${request.sender?.username || 'Unknown User'}`}
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(request.id)}
                  className="bg-transparent text-red-400 border border-red-500/50 hover:bg-red-500/10 px-4 py-2 rounded-md font-bold cursor-pointer focus-ring transition-colors"
                  aria-label={`Decline friend request from ${request.sender?.username || 'Unknown User'}`}
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
