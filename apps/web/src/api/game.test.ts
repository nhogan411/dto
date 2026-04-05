import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './client';
import { gameApi } from './game';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('gameApi.getAttackPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the attack preview endpoint with the target character query param', async () => {
    const mockResponse = {
      data: {
        data: {
          direction: 'side',
          threshold: 7,
          hit_chance_percent: 70,
          is_defending: false,
        },
      },
    };

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse as never);

    const response = await gameApi.getAttackPreview(5, 9);

    expect(apiClient.get).toHaveBeenCalledWith('/games/5/attack_preview?target_character_id=9');
    expect(response).toBe(mockResponse);
  });
});

describe('gameApi.getGameActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the game actions endpoint with the correct game id', async () => {
    const mockResponse = {
      data: {
        data: {
          actions: [
            { id: 1, game_id: 3, character_id: 7, action_type: 'move', action_data: {}, result_data: null, turn_number: 1, sequence_number: 1 },
          ],
        },
      },
    };

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse as never);

    const response = await gameApi.getGameActions(3);

    expect(apiClient.get).toHaveBeenCalledWith('/games/3/actions');
    expect(response).toBe(mockResponse);
  });
});

describe('gameApi.submitMoveAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls POST /games/:id/actions with move payload including target and path', async () => {
    const mockResponse = {
      data: {
        data: {
          action: { id: 9 },
          game_state: { game_id: 4 },
        },
      },
    };

    vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse as never);

    const response = await gameApi.submitMoveAction(4, {
      character_id: 77,
      target_x: 9,
      target_y: 3,
    });

    expect(apiClient.post).toHaveBeenCalledWith('/games/4/actions', {
      action_type: 'move',
      character_id: 77,
      target_x: 9,
      target_y: 3,
      action_data: { path: [{ x: 9, y: 3 }] },
    });
    expect(response).toBe(mockResponse);
  });
});
