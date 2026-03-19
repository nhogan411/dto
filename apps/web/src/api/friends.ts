import apiClient from './client';

export interface Friend {
  id: number;
  email: string;
  username: string;
  friendship_id: number;
  status?: 'online' | 'offline';
}

export interface UserSearch {
  id: number;
  email: string;
  username: string;
}

export interface Friendship {
  id: number;
  requester_id?: number;
  recipient_id: number;
  status: 'pending' | 'accepted' | 'declined';
  requester?: UserSearch;
  recipient?: UserSearch;
  created_at?: string;
  updated_at?: string;
}

export interface FriendRequestsResponse {
  sent: Friendship[];
  received: Friendship[];
}

export const friendsApi = {
  getFriends: () => 
    apiClient.get<{ data: Friend[] }>('/friends'),
    
  searchUsers: (query: string) => 
    apiClient.get<{ data: UserSearch[] }>(`/friends/search?q=${encodeURIComponent(query)}`),
    
  getFriendRequests: () => 
    apiClient.get<{ data: FriendRequestsResponse }>('/friend_requests'),
    
  sendFriendRequest: (recipientId: number) => 
    apiClient.post<{ data: Friendship }>('/friend_requests', { recipient_id: recipientId }),
    
  acceptFriendRequest: (friendshipId: number) => 
    apiClient.patch<{ data: Friendship }>(`/friend_requests/${friendshipId}/accept`),
    
  declineFriendRequest: (friendshipId: number) => 
    apiClient.patch<{ data: Friendship }>(`/friend_requests/${friendshipId}/decline`),
};