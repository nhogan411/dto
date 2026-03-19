import apiClient from './client';

export interface PlayerCharacter {
  id: number;
  name: string;
  icon: string;
  locked: boolean;
}

export interface UpdatePlayerCharacterPayload {
  name?: string;
  icon?: string;
}

export const playerCharactersApi = {
  getPlayerCharacters: async () => {
    const response = await apiClient.get<{ data: PlayerCharacter[] }>('/player_characters');
    return response.data.data;
  },
  
  updatePlayerCharacter: (id: number, payload: UpdatePlayerCharacterPayload) => {
    return apiClient.patch<PlayerCharacter>(`/player_characters/${id}`, payload);
  },
};
