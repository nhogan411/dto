import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FriendsList } from './FriendsList';
import * as hooks from '../../store/hooks';
import * as gameApi from '../../api/game';
import * as dashboardSlice from '../../store/slices/dashboardSlice';

vi.mock('../../store/hooks');
vi.mock('../../api/game');
vi.mock('../../store/slices/dashboardSlice', async () => {
  const actual = await vi.importActual('../../store/slices/dashboardSlice');
  return {
    ...actual,
    fetchGamesThunk: vi.fn(),
  };
});

describe('FriendsList', () => {
  const mockDispatch = vi.fn();
  const mockFriends = [
    { id: 1, username: 'Alice' },
    { id: 2, username: 'Bob' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useAppDispatch).mockReturnValue(mockDispatch);
    vi.mocked(hooks.useAppSelector).mockImplementation((selector) =>
      selector({
        friends: {
          friends: mockFriends,
          status: 'succeeded',
          error: null,
        },
      } as never)
    );
    // Default successful mock
    vi.mocked(gameApi.gameApi.createGame).mockResolvedValue({
      data: { game: { id: 1, status: 'pending' } },
    } as never);
    const mockThunk = Object.assign(vi.fn(), {
      unwrap: vi.fn().mockResolvedValue([]),
    });
    vi.mocked(dashboardSlice.fetchGamesThunk).mockReturnValue(mockThunk as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders friends list with invite buttons', () => {
    render(<FriendsList />);
    expect(screen.getByText('Friends')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getAllByText('Invite to Game')).toHaveLength(2);
  });

  it('calls gameApi.createGame with friend id on invite button click', async () => {
    render(<FriendsList />);
    const inviteButtons = screen.getAllByText('Invite to Game');
    fireEvent.click(inviteButtons[0]);

    await waitFor(() => {
      expect(gameApi.gameApi.createGame).toHaveBeenCalledWith(1);
    });
  });

  it('disables button while loading', async () => {
    vi.mocked(gameApi.gameApi.createGame).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { game: { id: 1 } } } as never), 100);
        })
    );

    render(<FriendsList />);
    const inviteButtons = screen.getAllByText('Invite to Game');
    const inviteButton = inviteButtons[0];

    fireEvent.click(inviteButton);

    expect(inviteButton).toBeDisabled();
    expect(screen.getByText('Inviting...')).toBeInTheDocument();

    await waitFor(() => {
      expect(inviteButton).not.toBeDisabled();
      expect(screen.getAllByText('Invite to Game').length).toBeGreaterThan(0);
    });
  });

  it('calls fetchGamesThunk on success', async () => {
    render(<FriendsList />);
    const inviteButtons = screen.getAllByText('Invite to Game');

    fireEvent.click(inviteButtons[0]);

    await waitFor(() => {
      expect(dashboardSlice.fetchGamesThunk).toHaveBeenCalled();
    });
  });

  it('displays error message on failure', async () => {
    const errorMessage = 'Active or pending game already exists for this pair';
    vi.mocked(gameApi.gameApi.createGame).mockRejectedValueOnce({
      response: {
        data: {
          errors: [errorMessage],
        },
      },
    });

    render(<FriendsList />);
    const inviteButtons = screen.getAllByText('Invite to Game');
    fireEvent.click(inviteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('displays generic error message when error detail is missing', async () => {
    vi.mocked(gameApi.gameApi.createGame).mockRejectedValueOnce({
      response: {
        data: {},
      },
    });

    render(<FriendsList />);
    const inviteButtons = screen.getAllByText('Invite to Game');
    fireEvent.click(inviteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Failed to create game')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
