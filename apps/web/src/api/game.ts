import apiClient from './client';

export interface AttackPreviewResponse {
  direction: string;
  threshold: number;
  hit_chance_percent: number;
  is_defending: boolean;
}

export interface ApiCharacter {
  id: number;
  user_id: number;
  position: { x: number | string; y: number | string };
  facing_tile: { x: number | string; y: number | string };
  current_hp: number;
  max_hp: number;
  is_defending: boolean;
  alive?: boolean;
  stats?: Record<string, unknown>;
}

export interface ApiGame {
  id: number;
  status: 'pending' | 'active' | 'completed' | 'forfeited' | 'accepted';
  board_config: { blocked_squares: number[][]; start_positions: number[][] };
  current_turn_user_id: number;
  challenger_id: number;
  challenged_id: number;
  challenger_username: string;
  challenged_username: string;
  characters: ApiCharacter[];
  turn_number: number;
  winner_id: number | null;
  turn_time_limit?: number;
}

export interface ApiGameAction {
  id: number;
  action_type: string;
  action_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  turn_number: number;
  sequence_number: number;
  character_id: number;
  created_at: string;
}

export interface ApiGameSnapshot {
  game_id: number;
  status: 'pending' | 'active' | 'completed' | 'forfeited' | 'accepted';
  current_turn_user_id: number;
  turn_deadline: string | null;
  winner_id: number | null;
  board_config: { blocked_squares: number[][]; start_positions: number[][] };
  characters: ApiCharacter[];
  last_action: ApiGameAction | null;
  turn_number: number;
}

export interface GameResponse {
  data: { game: ApiGame };
}

export interface GameStateResponse {
  data: ApiGameSnapshot;
}

export interface GameListResponse {
  data: ApiGame[];
}

export interface GameHistoryAction {
  id: number;
  game_id: number;
  character_id: number;
  action_type: 'move' | 'attack' | 'defend' | 'end_turn';
  action_data: Record<string, unknown>;
  turn_number: number;
  sequence_number: number;
  /**
   * For attack actions (after v1.0.2), includes D20 fields:
   * roll: number (1-20), threshold: number, direction: string,
   * hit: boolean, critical: boolean, damage: number
   */
  result_data: Record<string, unknown> | null;
}

export const gameApi = {
  getGame: (id: number) => apiClient.get<GameResponse>(`/games/${id}`),
  listGames: () => apiClient.get<GameListResponse>('/games'),
  getGameState: (id: number) => apiClient.get<GameStateResponse>(`/games/${id}/state`),
  getGameActions: (id: number) => apiClient.get<{ data: { actions: GameHistoryAction[] } }>(`/games/${id}/actions`),
  submitAction: (id: number, actionType: string, actionData: Record<string, unknown>) =>
    apiClient.post<{ data: { action: unknown; game_state: ApiGameSnapshot } }>(`/games/${id}/actions`, {
      action_type: actionType,
      action_data: actionData,
    }),
  createGame: (challengedId: number, turnTimeLimit?: number) =>
    apiClient.post<GameResponse>('/games', {
      challenged_id: challengedId,
      turn_time_limit: turnTimeLimit,
    }),
  acceptGame: (id: number, params?: { first_move?: boolean; starting_position_index?: number }) =>
    apiClient.patch<GameResponse>(`/games/${id}/accept`, params),
  declineGame: (id: number) => apiClient.patch<GameResponse>(`/games/${id}/decline`),
  choosePosition: (id: number, params: { starting_position_index: number }) =>
    apiClient.patch<GameResponse>(`/games/${id}/choose_position`, params),
  getAttackPreview: (gameId: number, targetCharacterId: number) =>
    apiClient.get<{ data: AttackPreviewResponse }>(`/games/${gameId}/attack_preview?target_character_id=${targetCharacterId}`),
};
