import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { friendsApi, type Friend, type Friendship, type UserSearch } from '../../api/friends';

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface FriendsState {
  friends: Friend[];
  pendingRequests: Friendship[];
  searchResults: UserSearch[];
  fetchStatus: RequestStatus;
  mutationStatus: RequestStatus;
  error: string | null;
}

const initialState: FriendsState = {
  friends: [],
  pendingRequests: [],
  searchResults: [],
  fetchStatus: 'idle',
  mutationStatus: 'idle',
  error: null,
};

export const fetchFriendsThunk = createAsyncThunk<Friend[]>(
  'friends/fetchFriends',
  async () => {
    const response = await friendsApi.getFriends();
    return response.data.data;
  }
);

export const searchUsersThunk = createAsyncThunk<UserSearch[], string>(
  'friends/searchUsers',
  async (query) => {
    const response = await friendsApi.searchUsers(query);
    return response.data.data;
  }
);

export const fetchFriendRequestsThunk = createAsyncThunk<Friendship[]>(
  'friends/fetchFriendRequests',
  async () => {
    const response = await friendsApi.getFriendRequests();
    return response.data.data.received;
  }
);

export const sendFriendRequestThunk = createAsyncThunk<Friendship, number>(
  'friends/sendFriendRequest',
  async (recipientId) => {
    const response = await friendsApi.sendFriendRequest(recipientId);
    return response.data.data;
  }
);

export const acceptFriendRequestThunk = createAsyncThunk<Friendship, number>(
  'friends/acceptFriendRequest',
  async (friendshipId) => {
    const response = await friendsApi.acceptFriendRequest(friendshipId);
    return response.data.data;
  }
);

export const declineFriendRequestThunk = createAsyncThunk<Friendship, number>(
  'friends/declineFriendRequest',
  async (friendshipId) => {
    const response = await friendsApi.declineFriendRequest(friendshipId);
    return response.data.data;
  }
);

const friendsSlice = createSlice({
  name: 'friends',
  initialState,
  reducers: {
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    clearFriendsState: (state) => {
      state.friends = [];
      state.pendingRequests = [];
      state.searchResults = [];
      state.fetchStatus = 'idle';
      state.mutationStatus = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFriendsThunk.pending, (state) => {
        state.fetchStatus = 'loading';
      })
      .addCase(fetchFriendsThunk.fulfilled, (state, action) => {
        state.fetchStatus = 'succeeded';
        state.friends = action.payload;
      })
      .addCase(fetchFriendsThunk.rejected, (state, action) => {
        state.fetchStatus = 'failed';
        state.error = action.error.message || 'Failed to fetch friends';
      })
      .addCase(searchUsersThunk.pending, (state) => {
        state.fetchStatus = 'loading';
      })
      .addCase(searchUsersThunk.fulfilled, (state, action) => {
        state.fetchStatus = 'succeeded';
        state.searchResults = action.payload;
      })
      .addCase(searchUsersThunk.rejected, (state, action) => {
        state.fetchStatus = 'failed';
        state.error = action.error.message || 'Failed to search users';
      })
      .addCase(fetchFriendRequestsThunk.pending, (state) => {
        state.fetchStatus = 'loading';
      })
      .addCase(fetchFriendRequestsThunk.fulfilled, (state, action) => {
        state.fetchStatus = 'succeeded';
        state.pendingRequests = action.payload;
      })
      .addCase(fetchFriendRequestsThunk.rejected, (state, action) => {
        state.fetchStatus = 'failed';
        state.error = action.error.message || 'Failed to fetch friend requests';
      })
      .addCase(sendFriendRequestThunk.fulfilled, (state) => {
        state.mutationStatus = 'succeeded';
      })
      .addCase(acceptFriendRequestThunk.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.pendingRequests = state.pendingRequests.filter(
          (req) => req.id !== action.payload.id
        );
      })
      .addCase(declineFriendRequestThunk.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.pendingRequests = state.pendingRequests.filter(
          (req) => req.id !== action.payload.id
        );
      });
  },
});

export const { clearSearchResults, clearFriendsState } = friendsSlice.actions;
export default friendsSlice.reducer;