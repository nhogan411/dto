import apiClient from './client';

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  role: string;
  created_at: string;
}

export interface UpdateUserPayload {
  email?: string;
  username?: string;
  role?: string;
}

export interface AdminPlayerCharacter {
  id: number;
  user_id: number;
  name: string;
  icon: string;
  locked: boolean;
}

export interface CreatePlayerCharacterPayload {
  user_id: number;
  name: string;
  icon: string;
  locked?: boolean;
}

export interface UpdatePlayerCharacterPayload {
  name?: string;
  icon?: string;
  locked?: boolean;
}

export interface AdminFriendshipUser {
  id: number;
  username: string;
}

export interface AdminFriendship {
  id: number;
  requester_id: number;
  recipient_id: number;
  status: string;
  created_at: string;
  requester: AdminFriendshipUser;
  recipient: AdminFriendshipUser;
}

export const getAdminUsers = () =>
  apiClient.get<{ data: AdminUser[] }>('/admin/users').then(r => r.data.data);
export const updateAdminUser = (id: number, payload: UpdateUserPayload) => apiClient.patch<AdminUser>(`/admin/users/${id}`, payload);
export const deleteAdminUser = (id: number) => apiClient.delete(`/admin/users/${id}`);

export const getAdminPlayerCharacters = (userId?: number) =>
  apiClient.get<{ data: AdminPlayerCharacter[] }>('/admin/player_characters', { params: userId ? { user_id: userId } : undefined }).then(r => r.data.data);
export const createAdminPlayerCharacter = (payload: CreatePlayerCharacterPayload) =>
  apiClient.post<AdminPlayerCharacter>('/admin/player_characters', payload);
export const updateAdminPlayerCharacter = (id: number, payload: UpdatePlayerCharacterPayload) =>
  apiClient.patch<AdminPlayerCharacter>(`/admin/player_characters/${id}`, payload);
export const deleteAdminPlayerCharacter = (id: number) => apiClient.delete(`/admin/player_characters/${id}`);

export const getAdminFriendships = (userId?: number) =>
  apiClient.get<{ data: AdminFriendship[] }>('/admin/friendships', { params: userId ? { user_id: userId } : undefined }).then(r => r.data.data);
export const getAdminFriendship = (id: number) =>
  apiClient.get<{ data: AdminFriendship }>(`/admin/friendships/${id}`).then(r => r.data.data);
