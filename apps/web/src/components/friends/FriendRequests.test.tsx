import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FriendRequests } from './FriendRequests';
import * as hooks from '../../store/hooks';
import * as friendsSlice from '../../store/slices/friendsSlice';

vi.mock('../../store/hooks');
vi.mock('../../store/slices/friendsSlice', async () => {
  const actual = await vi.importActual('../../store/slices/friendsSlice');
  return {
    ...actual,
    fetchFriendRequestsThunk: vi.fn(),
    acceptFriendRequestThunk: vi.fn(),
    declineFriendRequestThunk: vi.fn(),
  };
});

describe('FriendRequests', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (hooks.useAppDispatch as any).mockReturnValue(mockDispatch);
    
    // Mock fetchFriendRequestsThunk to return a thunk-like object with unwrap
    const mockThunk = Object.assign(vi.fn(), {
      unwrap: vi.fn().mockResolvedValue([]),
    });
    (friendsSlice.fetchFriendRequestsThunk as any).mockReturnValue(mockThunk);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders requester username from request.requester', () => {
    const pendingRequests = [
      {
        id: 1,
        requester_id: 10,
        recipient_id: 99,
        status: 'pending' as const,
        requester: {
          id: 10,
          username: 'thebadone411',
          email: 'bad@example.com',
        },
        recipient: undefined,
      },
    ];

    (hooks.useAppSelector as any).mockImplementation((selector: any) =>
      selector({
        friends: {
          pendingRequests,
          status: 'succeeded',
          error: null,
        },
      })
    );

    render(<FriendRequests />);
    expect(screen.getByText('thebadone411')).toBeInTheDocument();
    expect(screen.queryByText('Unknown User')).not.toBeInTheDocument();
  });

  it('falls back to "Unknown User" when requester is undefined', () => {
    const pendingRequests = [
      {
        id: 1,
        requester_id: 10,
        recipient_id: 99,
        status: 'pending' as const,
        requester: undefined,
        recipient: undefined,
      },
    ];

    (hooks.useAppSelector as any).mockImplementation((selector: any) =>
      selector({
        friends: {
          pendingRequests,
          status: 'succeeded',
          error: null,
        },
      })
    );

    render(<FriendRequests />);
    expect(screen.getByText('Unknown User')).toBeInTheDocument();
  });

  it('accept button aria-label contains requester username', () => {
    const pendingRequests = [
      {
        id: 1,
        requester_id: 10,
        recipient_id: 99,
        status: 'pending' as const,
        requester: {
          id: 10,
          username: 'thebadone411',
          email: 'bad@example.com',
        },
        recipient: undefined,
      },
    ];

    (hooks.useAppSelector as any).mockImplementation((selector: any) =>
      selector({
        friends: {
          pendingRequests,
          status: 'succeeded',
          error: null,
        },
      })
    );

    render(<FriendRequests />);
    expect(
      screen.getByRole('button', { name: /Accept friend request from thebadone411/i })
    ).toBeInTheDocument();
  });

  it('decline button aria-label contains requester username', () => {
    const pendingRequests = [
      {
        id: 1,
        requester_id: 10,
        recipient_id: 99,
        status: 'pending' as const,
        requester: {
          id: 10,
          username: 'thebadone411',
          email: 'bad@example.com',
        },
        recipient: undefined,
      },
    ];

    (hooks.useAppSelector as any).mockImplementation((selector: any) =>
      selector({
        friends: {
          pendingRequests,
          status: 'succeeded',
          error: null,
        },
      })
    );

    render(<FriendRequests />);
    expect(
      screen.getByRole('button', { name: /Decline friend request from thebadone411/i })
    ).toBeInTheDocument();
  });
});
