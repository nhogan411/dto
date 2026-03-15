import apiClient from '../api/client';

export interface GameAction {
  id: number;
  game_id: number;
  character_id: number;
  action_type: 'move' | 'attack' | 'defend' | 'end_turn';
  action_data: Record<string, unknown>;
  turn_number: number;
  sequence_number: number;
  result_data: Record<string, unknown> | null;
}

export async function fetchReplayActions(gameId: number, fromTurn: number): Promise<GameAction[]> {
  const response = await apiClient.get<{ data: { game_id: number; actions: GameAction[] } }>(`/games/${gameId}/replay?from_turn=${fromTurn}`);
  return response.data.data.actions;
}
