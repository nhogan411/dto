import apiClient from './client';

export interface UpdateProfilePayload {
  email?: string;
  current_password?: string;
  new_password?: string;
  new_password_confirmation?: string;
}

export interface UpdateProfileResponse {
  message: string;
}

export const profileApi = {
  updateProfile: (payload: UpdateProfilePayload) =>
    apiClient.patch<UpdateProfileResponse>('/profile', {
      profile: payload,
    }),
};
