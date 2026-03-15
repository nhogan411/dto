import { describe, expect, it } from 'vitest';
import friendsReducer, {
  clearSearchResults,
  clearFriendsState,
  fetchFriendsThunk,
  fetchFriendRequestsThunk,
  acceptFriendRequestThunk,
  declineFriendRequestThunk
} from './friendsSlice';

describe('friendsSlice', () => {
  it('returns initial state', () => {
    const state = friendsReducer(undefined, { type: '@@INIT' });
    expect(state).toEqual({
      friends: [],
      pendingRequests: [],
      searchResults: [],
      status: 'idle',
      error: null,
    });
  });

  it('handles clearSearchResults', () => {
    const initialState = {
      friends: [],
      pendingRequests: [],
      searchResults: [{ id: 1, email: 'test@example.com', username: 'test' }],
      status: 'succeeded' as const,
      error: null,
    };
    
    const state = friendsReducer(initialState, clearSearchResults());
    expect(state.searchResults).toEqual([]);
  });

  it('handles clearFriendsState', () => {
    const initialState = {
      friends: [{ id: 1, email: 'test@example.com', username: 'test', friendship_id: 1 }],
      pendingRequests: [{ id: 2, sender_id: 3, recipient_id: 1, status: 'pending' as const }],
      searchResults: [{ id: 4, email: 'search@example.com', username: 'search' }],
      status: 'failed' as const,
      error: 'An error occurred',
    };
    
    const state = friendsReducer(initialState, clearFriendsState());
    expect(state).toEqual({
      friends: [],
      pendingRequests: [],
      searchResults: [],
      status: 'idle',
      error: null,
    });
  });

  it('handles fetchFriendsThunk.fulfilled', () => {
    const friends = [{ id: 1, email: 'f1@example.com', username: 'f1', friendship_id: 1 }];
    const action = { type: fetchFriendsThunk.fulfilled.type, payload: friends };
    const state = friendsReducer(undefined, action);
    
    expect(state.status).toBe('succeeded');
    expect(state.friends).toEqual(friends);
  });

  it('handles fetchFriendRequestsThunk.fulfilled', () => {
    const requests = [{ id: 2, sender_id: 3, recipient_id: 1, status: 'pending' }];
    const action = { type: fetchFriendRequestsThunk.fulfilled.type, payload: requests };
    const state = friendsReducer(undefined, action);
    
    expect(state.status).toBe('succeeded');
    expect(state.pendingRequests).toEqual(requests);
  });

  it('handles acceptFriendRequestThunk.fulfilled', () => {
    const initialState = {
      friends: [],
      pendingRequests: [
        { id: 1, sender_id: 2, recipient_id: 3, status: 'pending' as const },
        { id: 2, sender_id: 4, recipient_id: 3, status: 'pending' as const },
      ],
      searchResults: [],
      status: 'idle' as const,
      error: null,
    };

    const action = { 
      type: acceptFriendRequestThunk.fulfilled.type, 
      payload: { id: 1 } 
    };
    
    const state = friendsReducer(initialState, action);
    expect(state.pendingRequests).toHaveLength(1);
    expect(state.pendingRequests[0].id).toBe(2);
  });

  it('handles declineFriendRequestThunk.fulfilled', () => {
    const initialState = {
      friends: [],
      pendingRequests: [
        { id: 1, sender_id: 2, recipient_id: 3, status: 'pending' as const },
      ],
      searchResults: [],
      status: 'idle' as const,
      error: null,
    };

    const action = { 
      type: declineFriendRequestThunk.fulfilled.type, 
      payload: { id: 1 } 
    };
    
    const state = friendsReducer(initialState, action);
    expect(state.pendingRequests).toHaveLength(0);
  });
});