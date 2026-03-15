import apiClient from './client';

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  email: string;
  username: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
}

export interface AuthResponse {
  data: {
    access_token: string;
    refresh_token: string;
    user: User;
  };
}

export const authApi = {
  signup: (params: RegisterParams) => apiClient.post<AuthResponse>('/signup', { user: params }),
  login: (params: LoginParams) => apiClient.post<AuthResponse>('/login', params),
  logout: (refreshToken: string) =>
    apiClient.delete('/logout', { data: { refresh_token: refreshToken } }),
  refreshToken: (token: string) =>
    apiClient.post<{ data: { access_token: string } }>('/refresh', { refresh_token: token }),
  getMe: () => apiClient.get<{ data: User }>('/users/me'),
};
