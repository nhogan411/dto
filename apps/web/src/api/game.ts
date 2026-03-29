import apiClient from './client';

export interface AttackPreviewResponse {
  direction: string;
  threshold: number;
  hit_chance_percent: number;
  is_defending: boolean;
}

export interface ApiGameCharacter {
  id: number;
  user_id: number;
  position: { x: number | string; y: number | string };
  facing_tile: { x: number | string; y: number | string };
  current_hp: number;
  max_hp: number;
  is_defending: boolean;
  icon: string;
  name?: string;
  alive?: boolean;
  stats?: Record<string, unknown>;
}

export interface ApiGame {
  id: number;
  status: 'pending' | 'active' | 'completed' | 'forfeited' | 'accepted';
  board_config: { tiles: Array<Array<{ type: string }>> };
  current_turn_user_id: number;
  acting_character_id?: number;
  turn_order?: number[];
  current_turn_index?: number;
  challenger_id: number;
  challenged_id: number;
  challenger_username: string;
  challenged_username: string;
  characters: ApiGameCharacter[];
  turn_number: number;
  winner_id: number | null;
  challenger_picks?: number[];
  challenged_picks?: number[];
}

export interface ApiGameAction {
  id: number;
  action_type: string;
  action_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  turn_number: number;
  sequence_number: number;
  game_character_id: number;
  created_at: string;
}

export interface ApiGameSnapshot {
  game_id: number;
  status: 'pending' | 'active' | 'completed' | 'forfeited' | 'accepted';
  current_turn_user_id: number;
  acting_character_id?: number;
  turn_order?: number[];
  current_turn_index?: number;
  winner_id: number | null;
  board_config: { tiles: Array<Array<{ type: string }>> };
   acting_character_actions?: { has_moved: boolean; has_attacked: boolean; has_defended: boolean; moves_taken: number };
  characters: ApiGameCharacter[];
  last_action: ApiGameAction | null;
  turn_number: number;
  challenger_picks?: number[];
  challenged_picks?: number[];
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
  game_character_id: number;
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
  /** D&D 5e extended attack fields (if available in result_data or top-level depending on sync method) */
  natural_roll?: number;
  attack_bonus?: number;
  target_ac?: number;
  damage_roll?: number;
  damage_bonus?: number;
  /** ISO timestamp of when the server created/broadcast this action */
  created_at?: string;
  /** ISO timestamp of when the client received this action via WebSocket (WS actions only) */
  received_at?: string;
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
  submitMoveAction: (id: number, params: { character_id: number; target_x: number; target_y: number }) =>
    apiClient.post<{ data: { action: unknown; game_state: ApiGameSnapshot } }>(`/games/${id}/actions`, {
      action_type: 'move',
      character_id: params.character_id,
      target_x: params.target_x,
      target_y: params.target_y,
      action_data: { path: [{ x: params.target_x, y: params.target_y }] },
    }),
  createGame: (challengedId: number) =>
    apiClient.post<GameResponse>('/games', {
      challenged_id: challengedId,
    }),
  selectCharacters: (id: number, characterIds: number[]) =>
    apiClient.post<GameResponse>(`/games/${id}/select_characters`, { player_character_ids: characterIds }),
  acceptGame: (id: number, params?: { first_move?: boolean; starting_position_index?: number }) =>
    apiClient.patch<GameResponse>(`/games/${id}/accept`, params),
  declineGame: (id: number) => apiClient.patch<GameResponse>(`/games/${id}/decline`),
  forfeitGame: (id: number) => apiClient.patch<GameResponse>(`/games/${id}/forfeit`),
  choosePosition: (id: number, params: { starting_position_index: number }) =>
    apiClient.patch<GameResponse>(`/games/${id}/choose_position`, params),
  getAttackPreview: (gameId: number, targetCharacterId: number) =>
    apiClient.get<{ data: AttackPreviewResponse }>(`/games/${gameId}/attack_preview?target_character_id=${targetCharacterId}`),
};
