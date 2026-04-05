import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FriendSearch } from './FriendSearch';
import * as hooks from '../../store/hooks';

vi.mock('../../store/hooks');
vi.mock('../../store/slices/friendsSlice', async () => {
  const actual = await vi.importActual<typeof import('../../store/slices/friendsSlice')>('../../store/slices/friendsSlice');
  return {
    ...actual,
    sendFriendRequestThunk: vi.fn(),
    searchUsersThunk: vi.fn(),
    clearSearchResults: actual.clearSearchResults,
  };
});

describe('FriendSearch', () => {
  const mockDispatch = vi.fn();
  const mockSearchResults = [
    { id: 1, username: 'thebadone411', email: 'bad@example.com' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useAppDispatch).mockReturnValue(mockDispatch);
    vi.mocked(hooks.useAppSelector).mockImplementation((selector) =>
      selector({
        friends: {
          searchResults: mockSearchResults,
          status: 'succeeded',
          error: null,
        },
      } as never)
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders Add Friend button for each search result', () => {
    render(<FriendSearch />);
    const buttons = screen.getAllByText('Add Friend');
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]).toBeInTheDocument();
  });

  it("shows 'Request Sent ✓' and disables button after successful send", async () => {
    const mockThunk = Object.assign(vi.fn(), {
      unwrap: vi.fn().mockResolvedValue({}),
    });
    mockDispatch.mockReturnValue(mockThunk);

    render(<FriendSearch />);
    const addButton = screen.getByText('Add Friend');

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Request Sent ✓')).toBeInTheDocument();
      expect(addButton).toBeDisabled();
    });
  });

  it('does not affect other users buttons when one request is sent', async () => {
    vi.mocked(hooks.useAppSelector).mockImplementation((selector) =>
      selector({
        friends: {
          searchResults: [
            { id: 1, username: 'user1', email: 'user1@example.com' },
            { id: 2, username: 'user2', email: 'user2@example.com' },
          ],
          status: 'succeeded',
          error: null,
        },
      } as never)
    );

    const mockThunk = Object.assign(vi.fn(), {
      unwrap: vi.fn().mockResolvedValue({}),
    });
    mockDispatch.mockReturnValue(mockThunk);

    render(<FriendSearch />);
    const addButtons = screen.getAllByText('Add Friend');

    fireEvent.click(addButtons[0]);

    await waitFor(() => {
      const remainingAddFriendButtons = screen.getAllByText('Add Friend');
      expect(remainingAddFriendButtons.length).toBe(1);
      expect(remainingAddFriendButtons[0]).not.toBeDisabled();
    });
  });

  it('button remains clickable if send request fails', async () => {
    const mockThunk = Object.assign(vi.fn(), {
      unwrap: vi.fn().mockRejectedValue(new Error('Failed')),
    });
    mockDispatch.mockReturnValue(mockThunk);

    render(<FriendSearch />);
    const addButton = screen.getByText('Add Friend');

    fireEvent.click(addButton);

    await waitFor(() => {
      const buttons = screen.getAllByText('Add Friend');
      expect(buttons.length).toBeGreaterThan(0);
      expect(buttons[0]).not.toBeDisabled();
    });
  });
});
