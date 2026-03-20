import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LobbyPage from './LobbyPage';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockDispatch = vi.fn((action) => Promise.resolve(action));
const mockNavigate = vi.fn();

const currentUserId = 1;
const opponentUserId = 2;

// Mock state factory
const getMockCurrentGame = vi.fn(() => ({
  id: 1,
  challenger_id: currentUserId,
  challenged_id: opponentUserId,
  status: 'pending' as const,
  challenger_username: 'player1',
  challenged_username: 'player2',
  challenger_picks: null,
  challenged_picks: null,
  board_config: {
    tiles: Array.from({ length: 12 }, () =>
      Array.from({ length: 12 }, () => ({ type: 'open' }))
    ),
  },
}));

vi.mock('../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: unknown) => unknown) => {
    const mockState = {
      game: {
        currentGame: getMockCurrentGame(),
        status: 'succeeded',
        error: null,
      },
      playerCharacters: {
        characters: [
          { id: 1, name: 'Warrior', icon: '⚔️', locked: false },
          { id: 2, name: 'Mage', icon: '🔮', locked: false },
          { id: 3, name: 'Rogue', icon: '🗡️', locked: false },
        ],
        status: 'succeeded',
      },
      auth: { user: { id: currentUserId, username: 'player1' } },
    };
    return selector(mockState);
  },
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
    fetchGameThunk: Object.assign(
      vi.fn(() => ({ type: 'game/fetchGame/pending' })),
      { fulfilled: { match: () => false } }
    ),
    clearGame: vi.fn(() => ({ type: 'game/clearGame' })),
  };
});

vi.mock('../store/slices/playerCharactersSlice', async (importActual) => {
  const actual = await importActual<typeof import('../store/slices/playerCharactersSlice')>();
  return {
    ...actual,
    fetchPlayerCharactersThunk: Object.assign(
      vi.fn(() => ({ type: 'playerCharacters/fetch/pending' })),
      { fulfilled: { match: () => false } }
    ),
  };
});

vi.mock('../api/game', () => ({
  gameApi: {
    declineGame: vi.fn(() => Promise.resolve()),
    selectCharacters: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

import { gameApi } from '../api/game';

describe('LobbyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMockCurrentGame.mockReturnValue({
      id: 1,
      challenger_id: currentUserId,
      challenged_id: opponentUserId,
      status: 'pending' as const,
      challenger_username: 'player1',
      challenged_username: 'player2',
      challenger_picks: null,
      challenged_picks: null,
      board_config: {
        tiles: Array.from({ length: 12 }, () =>
          Array.from({ length: 12 }, () => ({ type: 'open' }))
        ),
      },
    });
  });

  it('Test 1: auto-navigates to /games/:id when game status becomes active', async () => {
    // Start with pending status
    const { rerender } = render(
      <MemoryRouter initialEntries={['/lobby/1']}>
        <Routes>
          <Route path="/lobby/:id" element={<LobbyPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify initial render with pending status
    await waitFor(() => {
      expect(screen.getByText('Your Stable')).toBeInTheDocument();
    });

    // Simulate game becoming active (e.g., both players locked in)
    getMockCurrentGame.mockReturnValue({
      id: 1,
      challenger_id: currentUserId,
      challenged_id: opponentUserId,
      status: 'active' as never,
      challenger_username: 'player1',
      challenged_username: 'player2',
      challenger_picks: [1, 2] as unknown as null,
      challenged_picks: [3, 4] as unknown as null,
      board_config: {
        tiles: Array.from({ length: 12 }, () =>
          Array.from({ length: 12 }, () => ({ type: 'open' }))
        ),
      },
    });

    // Trigger re-render with new state
    rerender(
      <MemoryRouter initialEntries={['/lobby/1']}>
        <Routes>
          <Route path="/lobby/:id" element={<LobbyPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Assert navigate was called with correct path
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/games/1');
    });
  });

  it('Test 2: decline button dispatches decline API call and navigates to /', async () => {
    render(
      <MemoryRouter initialEntries={['/lobby/1']}>
        <Routes>
          <Route path="/lobby/:id" element={<LobbyPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for lobby to render
    await waitFor(() => {
      expect(screen.getByText('Your Stable')).toBeInTheDocument();
    });

    // Find and click decline button
    const declineButton = screen.getByRole('button', { name: 'Decline Invitation' });
    fireEvent.click(declineButton);

    // Assert API call was made
    await waitFor(() => {
      expect(gameApi.declineGame).toHaveBeenCalledWith(1);
    });

    // Assert navigation to home
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('Test 3: challenger sees "Game Lobby" title, challenged sees "Game Invitation" title', async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/lobby/1']}>
        <Routes>
          <Route path="/lobby/:id" element={<LobbyPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Game Lobby')).toBeInTheDocument();
    });
    expect(screen.queryByText('Game Invitation')).not.toBeInTheDocument();

    unmount();
    vi.clearAllMocks();

    getMockCurrentGame.mockReturnValue({
      id: 1,
      challenger_id: opponentUserId,
      challenged_id: currentUserId,
      status: 'pending' as const,
      challenger_username: 'player2',
      challenged_username: 'player1',
      challenger_picks: null,
      challenged_picks: null,
      board_config: {
        tiles: Array.from({ length: 12 }, () =>
          Array.from({ length: 12 }, () => ({ type: 'open' }))
        ),
      },
    });

    render(
      <MemoryRouter initialEntries={['/lobby/1']}>
        <Routes>
          <Route path="/lobby/:id" element={<LobbyPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Game Invitation')).toBeInTheDocument();
    });
    expect(screen.queryByText('Game Lobby')).not.toBeInTheDocument();
  });

  it('Test 4: Lock In Team button is disabled until exactly 2 characters are selected', async () => {
    render(
      <MemoryRouter initialEntries={['/lobby/1']}>
        <Routes>
          <Route path="/lobby/:id" element={<LobbyPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Your Stable')).toBeInTheDocument();
    });

    // Lock In button should be disabled initially (0 selected)
    const lockInButton = screen.getByRole('button', { name: 'Confirm Picks' });
    expect(lockInButton).toBeDisabled();

    // Select first character
    const warrior = screen.getByRole('button', { name: 'Select Warrior' });
    fireEvent.click(warrior);

    // Still disabled (1 selected)
    expect(lockInButton).toBeDisabled();

    // Select second character
    const mage = screen.getByRole('button', { name: 'Select Mage' });
    fireEvent.click(mage);

    // Now enabled (2 selected)
    expect(lockInButton).not.toBeDisabled();

    // Try to select third character (should not increase count beyond 2)
    const rogue = screen.getByRole('button', { name: 'Select Rogue' });
    fireEvent.click(rogue);

    // Should still be enabled with 2 characters
    expect(lockInButton).not.toBeDisabled();
    expect(screen.getByText('/ 2 selected')).toBeInTheDocument();
  });
});
