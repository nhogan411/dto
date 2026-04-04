import apiClient from './client';

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  role: string;
  created_at: string;
  games_count: number;
  wins: number;
  losses: number;
  forfeits: number;
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

export interface AdminPlayerCharacterDetail {
  id: number;
  user_id: number;
  name: string;
  icon: string;
  locked: boolean;
  archetype: string;
  race: string;
  level: number;
  xp: number;
  max_hp: number;
}

export interface WinningComposition {
  archetypes: string[];
  count: number;
}

export interface AdminUserDetail extends AdminUser {
  characters: AdminPlayerCharacterDetail[];
  winning_compositions: WinningComposition[];
}

export interface AdminStats {
  total_games: number;
  active_games: number;
  games_last_7_days: number;
  forfeit_rate: number;
  avg_games_per_user: number;
  users_with_no_games: number;
  avg_character_level: number;
  avg_level_by_archetype: Record<string, number>;
  top_users_by_games: { id: number; username: string; games_count: number }[];
  top_winning_compositions: WinningComposition[];
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

export const getAdminUserDetail = (id: number) =>
  apiClient.get<{ data: AdminUserDetail }>(`/admin/users/${id}`).then(r => r.data.data);

export const getAdminStats = () =>
  apiClient.get<{ data: AdminStats }>('/admin/stats').then(r => r.data.data);

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

