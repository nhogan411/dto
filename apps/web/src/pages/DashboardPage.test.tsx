import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from './DashboardPage';
import { MemoryRouter } from 'react-router-dom';

// Module-level callback capture for useNotificationChannel
let capturedNotificationHandler: ((msg: unknown) => void) | null = null;

const mockDispatch = vi.fn((action) => Promise.resolve(action));
const mockNavigate = vi.fn();

// Mock state factory
function createMockState(overrides = {}) {
  return {
    notifications: {
      notifications: [],
      count: 0,
      ...overrides.notifications,
    },
    auth: {
      user: { id: 1, username: 'testuser' },
      token: 'token',
      ...overrides.auth,
    },
    dashboard: {
      games: [],
      gamesStatus: 'idle',
      ...overrides.dashboard,
    },
    friends: {
      friends: [
        { id: 2, username: 'alice' },
        { id: 3, username: 'bob' },
      ],
      ...overrides.friends,
    },
  };
}

const getMockState = vi.fn(() => createMockState());

vi.mock('../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: unknown) => unknown) => {
    const state = getMockState();
    return selector(state);
  },
}));

vi.mock('../cable/useNotificationChannel', () => ({
  useNotificationChannel: vi.fn((onMessage: (msg: unknown) => void) => {
    capturedNotificationHandler = onMessage;
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock action creators
vi.mock('../store/slices/notificationSlice', async (importActual) => {
  const actual = await importActual<typeof import('../store/slices/notificationSlice')>();
  return {
    ...actual,
    addGameInvitation: vi.fn((payload) => ({ type: 'notifications/addGameInvitation', payload })),
    markYourTurn: vi.fn((payload) => ({ type: 'notifications/markYourTurn', payload })),
  };
});

vi.mock('../store/slices/dashboardSlice', async (importActual) => {
  const actual = await importActual<typeof import('../store/slices/dashboardSlice')>();
  return {
    ...actual,
    declineGameThunk: Object.assign(
      vi.fn((id) => ({ type: 'dashboard/declineGame/pending', meta: { arg: id } })),
      {
        fulfilled: { match: () => false },
        unwrap: vi.fn(() => Promise.resolve()),
      },
    ),
    fetchGamesThunk: Object.assign(
      vi.fn(() => ({ type: 'dashboard/fetchGames/pending' })),
      { fulfilled: { match: () => false } },
    ),
  };
});

vi.mock('../store/slices/friendsSlice', async (importActual) => {
  const actual = await importActual<typeof import('../store/slices/friendsSlice')>();
  return {
    ...actual,
    fetchFriendRequestsThunk: Object.assign(
      vi.fn(() => ({ type: 'friends/fetchFriendRequests/pending' })),
      { fulfilled: { match: () => false } },
    ),
    fetchFriendsThunk: Object.assign(
      vi.fn(() => ({ type: 'friends/fetchFriends/pending' })),
      { fulfilled: { match: () => false } },
    ),
  };
});

// Mock friend components to avoid complex rendering
vi.mock('../components/friends/FriendsList', () => ({
  FriendsList: () => null,
}));
vi.mock('../components/friends/FriendSearch', () => ({
  FriendSearch: () => null,
}));
vi.mock('../components/friends/FriendRequests', () => ({
  FriendRequests: () => null,
}));

// Mock page title hook
vi.mock('../hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

// Mock focus trap hook
vi.mock('../hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}));

import { addGameInvitation, markYourTurn } from '../store/slices/notificationSlice';
import { declineGameThunk } from '../store/slices/dashboardSlice';

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedNotificationHandler = null;
    getMockState.mockReturnValue(createMockState());
  });

  it('Test 1: game_invitation_received notification triggers dispatch AND navigate to lobby', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    // Verify notification handler was captured
    expect(capturedNotificationHandler).toBeTruthy();

    // Clear mount-time dispatch calls
    vi.clearAllMocks();

    // Simulate game_invitation_received WebSocket event
    capturedNotificationHandler!({
      event: 'game_invitation_received',
      game_id: 5,
      challenger_username: 'alice',
    });

    // Verify addGameInvitation action was dispatched
    expect(addGameInvitation).toHaveBeenCalledWith({
      gameId: 5,
      challengerUsername: 'alice',
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'notifications/addGameInvitation',
      payload: { gameId: 5, challengerUsername: 'alice' },
    });

    // Update mock state to include the pending game invitation
    getMockState.mockReturnValue(
      createMockState({
        dashboard: {
          games: [
            {
              id: 5,
              status: 'pending',
              challenger_id: 2,
              challenged_id: 1,
              challenger_username: 'alice',
              challenged_username: 'testuser',
            },
          ],
          gamesStatus: 'succeeded',
        },
      }),
    );

    // Re-render to show the pending invitation
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    // Find and click the Accept button for this invitation
    const acceptButton = screen.getByRole('button', { name: /Accept invitation from alice/i });
    fireEvent.click(acceptButton);

    // Verify navigation to lobby
    expect(mockNavigate).toHaveBeenCalledWith('/games/5/lobby');
  });

  it('Test 2: your_turn notification dispatches markYourTurn action', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(capturedNotificationHandler).toBeTruthy();

    vi.clearAllMocks();

    // Simulate your_turn WebSocket event
    capturedNotificationHandler!({
      event: 'your_turn',
      game_id: 3,
    });

    // Verify markYourTurn action was dispatched with correct payload
    expect(markYourTurn).toHaveBeenCalledWith({ gameId: 3 });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'notifications/markYourTurn',
      payload: { gameId: 3 },
    });

    // Verify navigate was NOT called (your_turn does not trigger navigation)
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('Test 3: declining game invitation dispatches declineGameThunk without navigation', async () => {
    // Setup: render with a pending invitation already in state
    getMockState.mockReturnValue(
      createMockState({
        dashboard: {
          games: [
            {
              id: 7,
              status: 'pending',
              challenger_id: 3,
              challenged_id: 1,
              challenger_username: 'bob',
              challenged_username: 'testuser',
            },
          ],
          gamesStatus: 'succeeded',
        },
      }),
    );

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    vi.clearAllMocks();

    // Find and click the Decline button
    const declineButton = screen.getByRole('button', { name: /Decline invitation from bob/i });
    fireEvent.click(declineButton);

    // Verify declineGameThunk was called with the game ID
    expect(declineGameThunk).toHaveBeenCalledWith(7);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'dashboard/declineGame/pending',
        meta: expect.objectContaining({ arg: 7 }),
      }),
    );

    // Verify navigation was NOT called (decline stays on dashboard)
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('Test 4: New Game modal opens and closes correctly', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    // Click "New Game" button to open modal
    const newGameButton = screen.getByRole('button', { name: 'Start a new game' });
    fireEvent.click(newGameButton);

    // Verify modal is visible with correct aria-labelledby
    const modal = screen.getByRole('dialog', { name: 'Start New Game' });
    expect(modal).toBeInTheDocument();

    // Click Cancel button to close modal
    const cancelButton = screen.getByRole('button', { name: 'Cancel game creation' });
    fireEvent.click(cancelButton);

    // Verify modal is no longer visible
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Start New Game' })).not.toBeInTheDocument();
    });
  });
});
