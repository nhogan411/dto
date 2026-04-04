import apiClient from './client';

export interface PlayerCharacter {
  id: number;
  name: string;
  icon: string;
  archetype: 'warrior' | 'scout';
  locked: boolean;
  race: string;
  xp: number;
  level: number;
  max_hp: number;
}

export interface UpdatePlayerCharacterPayload {
  name?: string;
  archetype?: 'warrior' | 'scout';
  race?: string;
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
