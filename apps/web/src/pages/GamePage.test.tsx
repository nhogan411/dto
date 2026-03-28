import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GamePage from './GamePage';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getMoveBudget } from '../utils/character';

// Module-level callback capture
let capturedOnMessage: ((msg: unknown) => void) | null = null;

const mockDispatch = vi.fn((action) => Promise.resolve(action));
const mockNavigate = vi.fn();

const currentUserId = 1;
const opponentUserId = 2;

// Mock state factory
function createMockGameState(overrides = {}) {
  return {
    id: 1,
    status: 'active' as const,
    boardConfig: { tiles: [[{ type: 'normal' }]] },
    currentTurnUserId: currentUserId,
    actingCharacterId: null,
    turnOrder: [1, 2],
    currentTurnIndex: 0,
    characters: [],
    turnNumber: 1,
    winnerId: null,
    actingCharacterActions: null,
    ...overrides,
  };
}

const getMockGameState = vi.fn(() => createMockGameState());
const getMockCurrentGame = vi.fn(() => ({
  id: 1,
  challenger_id: currentUserId,
  challenged_id: opponentUserId,
  status: 'active',
}));

vi.mock('../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: unknown) => unknown) => {
    const mockState = {
      game: {
        currentGame: getMockCurrentGame(),
        gameState: getMockGameState(),
        status: 'succeeded',
        error: null,
        isSubmitting: false,
        pendingActions: [],
        replayInProgress: false,
        replayQueue: [],
        selectedCharacterId: null,
        gameActions: [],
      },
      auth: { user: { id: currentUserId }, token: 'token' },
    };
    return selector(mockState);
  },
}));

vi.mock('../cable/useGameChannel', () => ({
  useGameChannel: vi.fn((_gameId: unknown, onMessage: (msg: unknown) => void) => {
    capturedOnMessage = onMessage;
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: '1' }),
  };
});

vi.mock('../store/slices/gameSlice', async (importActual) => {
  const actual = await importActual<typeof import('../store/slices/gameSlice')>();
  return {
    ...actual,
    forfeitGameThunk: Object.assign(
      vi.fn(() => ({ type: 'game/forfeit/pending' })),
      { fulfilled: { match: () => false } }
    ),
    fetchGameStateThunk: Object.assign(
      vi.fn(() => ({ type: 'game/fetchState/pending' })),
      { fulfilled: { match: () => false } }
    ),
    fetchGameThunk: Object.assign(
      vi.fn(() => ({ type: 'game/fetchGame/pending' })),
      { fulfilled: { match: () => false } }
    ),
    submitActionThunk: Object.assign(
      vi.fn(() => ({ type: 'game/submitAction/pending' })),
      { fulfilled: { match: () => false } }
    ),
  };
});

// Mock heavy child components to speed up render and avoid canvas/WebGL errors
vi.mock('../components/game/GameBoard', () => ({
  GameBoard: () => <div data-testid="game-board" />,
}));
vi.mock('../components/game/CharacterInfo', () => ({
  CharacterInfo: () => null,
}));
vi.mock('../components/game/GameHistory', () => ({
  GameHistory: () => null,
}));
vi.mock('../components/game/TurnReplay', () => ({
  TurnReplay: () => null,
}));
vi.mock('../components/game/ActionPopover', () => ({
  ActionPopover: () => null,
}));

import { forfeitGameThunk, fetchGameStateThunk, handleGameChannelMessage } from '../store/slices/gameSlice';

describe('GamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnMessage = null;
    getMockGameState.mockReturnValue(createMockGameState());
    getMockCurrentGame.mockReturnValue({
      id: 1,
      challenger_id: currentUserId,
      challenged_id: opponentUserId,
      status: 'active',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Test 1: closes forfeit modal and shows game-over modal when game_over WS event received', async () => {
    render(
      <MemoryRouter initialEntries={['/game/1']}>
        <Routes>
          <Route path="/game/:id" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Click forfeit button
    const forfeitButton = screen.getByRole('button', { name: 'Forfeit game' });
    fireEvent.click(forfeitButton);

    // Forfeit modal should appear
    const forfeitModal = screen.getByRole('dialog', { name: 'Confirm Forfeit' });
    expect(forfeitModal).toBeInTheDocument();

    // Confirm forfeit
    const confirmButton = screen.getByRole('button', { name: 'Forfeit' });
    fireEvent.click(confirmButton);

    expect(forfeitGameThunk).toHaveBeenCalledWith(1);

    // Simulate WS game_over event
    expect(capturedOnMessage).toBeTruthy();
    getMockGameState.mockReturnValue(createMockGameState({ status: 'forfeited', winnerId: opponentUserId }));
    capturedOnMessage!({ event: 'game_over', status: 'forfeited', winner_id: opponentUserId });

    // RED PHASE: Forfeit modal should be gone, game-over modal should appear
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Confirm Forfeit' })).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Game Over' })).toBeInTheDocument();
    });
  });

  it('Test 2: dispatches fetchGameStateThunk after 5s timeout if WS event not received', async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/game/1']}>
        <Routes>
          <Route path="/game/:id" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Forfeit game' })).toBeInTheDocument();
    });

    vi.clearAllMocks();

    fireEvent.click(screen.getByRole('button', { name: 'Forfeit game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Forfeit' }));

    expect(forfeitGameThunk).toHaveBeenCalledWith(1);

    // Advance past 5 seconds
    await vi.advanceTimersByTimeAsync(5001);

    // RED PHASE: Should dispatch fetchGameStateThunk as fallback
    expect(fetchGameStateThunk).toHaveBeenCalledWith(1);
  });

  it('Test 3: forfeit modal stays open after confirm click before WS event', async () => {
    render(
      <MemoryRouter initialEntries={['/game/1']}>
        <Routes>
          <Route path="/game/:id" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forfeit game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Forfeit' }));

    expect(forfeitGameThunk).toHaveBeenCalledWith(1);

    // Modal should still be visible (waiting for WS event)
    expect(screen.getByRole('dialog', { name: 'Confirm Forfeit' })).toBeInTheDocument();
  });

  it('Test 4: clicking "Keep Playing" closes forfeit modal without dispatching forfeitGameThunk', async () => {
    render(
      <MemoryRouter initialEntries={['/game/1']}>
        <Routes>
          <Route path="/game/:id" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forfeit game' }));

    const keepPlayingButton = screen.getByRole('button', { name: 'Keep Playing' });
    fireEvent.click(keepPlayingButton);

    expect(forfeitGameThunk).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Confirm Forfeit' })).not.toBeInTheDocument();
  });

  it('Test 5: forfeit button not visible when game status is not active', () => {
    getMockGameState.mockReturnValue(createMockGameState({ status: 'completed' }));

    render(
      <MemoryRouter initialEntries={['/game/1']}>
        <Routes>
          <Route path="/game/:id" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: 'Forfeit game' })).not.toBeInTheDocument();
  });

  it('Test 6: forfeit button not visible when user is not a player in the game', () => {
    getMockCurrentGame.mockReturnValue({
      id: 1,
      challenger_id: 99,
      challenged_id: 100,
      status: 'active',
    });

    render(
      <MemoryRouter initialEntries={['/game/1']}>
        <Routes>
          <Route path="/game/:id" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: 'Forfeit game' })).not.toBeInTheDocument();
  });

  it('Test 7: game-over modal appears immediately when game is already over', () => {
    getMockGameState.mockReturnValue(createMockGameState({ status: 'completed', winnerId: currentUserId }));

    render(
      <MemoryRouter initialEntries={['/game/1']}>
        <Routes>
          <Route path="/game/:id" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('dialog', { name: 'Game Over' })).toBeInTheDocument();
  });

  it('Test 8: unmounting component cancels timeout and prevents fetchGameStateThunk dispatch', async () => {
    vi.useFakeTimers();

    const { unmount } = render(
      <MemoryRouter initialEntries={['/game/1']}>
        <Routes>
          <Route path="/game/:id" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Forfeit game' })).toBeInTheDocument();
    });

    vi.clearAllMocks();

    fireEvent.click(screen.getByRole('button', { name: 'Forfeit game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Forfeit' }));

    // Wait for forfeit thunk to dispatch and timeout to be set
    await vi.waitFor(() => {
      expect(forfeitGameThunk).toHaveBeenCalledWith(1);
    });

    // Unmount component before timeout
    unmount();

    // Advance past timeout
    await vi.advanceTimersByTimeAsync(6000);

    // GREEN PHASE: Unmount clears forfeitTimeoutRef → timeout callback never fires
    // fetchGameStateThunk must NOT be called after component unmounts
    expect(fetchGameStateThunk).not.toHaveBeenCalled();
  });

  it('Test 9: dispatches handleGameChannelMessage when action_completed WS event received', () => {
    render(
      <MemoryRouter initialEntries={['/game/1']}>
        <Routes>
          <Route path="/game/:id" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(capturedOnMessage).toBeTruthy();

    const payload = {
      event: 'action_completed',
      game_id: 1,
      data: {
        game_state: {
          id: 1,
          status: 'active',
          current_turn_user_id: 1,
          acting_character_id: null,
          turn_order: [1, 2],
          current_turn_index: 0,
          characters: [],
          turn_number: 1,
          winner_id: null,
          acting_character_actions: null,
        },
        action: {
          id: 42,
          game_id: 1,
          game_character_id: 10,
          action_type: 'move',
          action_data: { direction: 'up' },
          turn_number: 1,
          sequence_number: 1,
          result_data: null,
          created_at: '2026-03-28T14:02:31.000Z',
        },
      },
    };

    capturedOnMessage!(payload);

    expect(mockDispatch).toHaveBeenCalledWith(
      handleGameChannelMessage(payload)
    );
  });

  it('Test 10: dispatches handleGameChannelMessage when turn_changed WS event received', () => {
    render(
      <MemoryRouter initialEntries={['/game/1']}>
        <Routes>
          <Route path="/game/:id" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(capturedOnMessage).toBeTruthy();

    const payload = {
      event: 'turn_changed',
      game_id: 1,
      current_turn_user_id: 2,
      current_turn_index: 1,
      next_character_id: 11,
    };

    capturedOnMessage!(payload);

    expect(mockDispatch).toHaveBeenCalledWith(
      handleGameChannelMessage(payload)
    );
  });

  it('getMoveBudget: Scout character with stats.movement = 5 returns 5', () => {
    const scoutCharacter = { stats: { movement: 5 } };
    expect(getMoveBudget(scoutCharacter)).toBe(5);
  });

  it('getMoveBudget: Warrior character with stats.movement = 3 returns 3', () => {
    const warriorCharacter = { stats: { movement: 3 } };
    expect(getMoveBudget(warriorCharacter)).toBe(3);
  });

  it('getMoveBudget: Character with empty stats returns fallback of 3', () => {
    const characterWithEmptyStats = { stats: {} };
    expect(getMoveBudget(characterWithEmptyStats)).toBe(3);
  });
});

