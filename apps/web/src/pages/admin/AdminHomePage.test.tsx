import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AdminHomePage from './AdminHomePage';
import * as adminApi from '../../api/admin';
import authReducer from '../../store/slices/authSlice';

vi.mock('../../api/admin');

const mockStats = {
  total_games: 10,
  active_games: 2,
  games_last_7_days: 4,
  forfeit_rate: 0.1,
  avg_games_per_user: 3.33,
  users_with_no_games: 1,
  avg_character_level: 2.5,
  avg_level_by_archetype: { warrior: 3.0, scout: 2.0 },
  top_users_by_games: [{ id: 1, username: 'alice', games_count: 5 }],
  top_winning_compositions: [{ archetypes: ['warrior', 'scout'], count: 3 }],
};

function renderPage() {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AdminHomePage />
      </MemoryRouter>
    </Provider>
  );
}

describe('AdminHomePage', () => {
  beforeEach(() => {
    vi.mocked(adminApi.getAdminUsers).mockResolvedValue([
      { id: 1, email: 'a@a.com', username: 'alice', role: 'admin', created_at: '2026-01-01T00:00:00Z', games_count: 5, wins: 3, losses: 1, forfeits: 1 },
      { id: 2, email: 'b@b.com', username: 'bob',   role: 'player', created_at: '2026-01-02T00:00:00Z', games_count: 2, wins: 1, losses: 1, forfeits: 0 },
    ]);
    vi.mocked(adminApi.getAdminPlayerCharacters).mockResolvedValue([
      { id: 1, user_id: 1, name: 'Hero',  icon: 'warrior', locked: false },
      { id: 2, user_id: 2, name: 'Scout', icon: 'scout',   locked: false },
      { id: 3, user_id: 1, name: 'Tank',  icon: 'warrior', locked: true },
    ]);
    vi.mocked(adminApi.getAdminFriendships).mockResolvedValue([
      { id: 1, requester_id: 1, recipient_id: 2, status: 'accepted', created_at: '2026-01-03T00:00:00Z', requester: { id: 1, username: 'alice' }, recipient: { id: 2, username: 'bob' } },
    ]);
    vi.mocked(adminApi.getAdminStats).mockResolvedValue(mockStats);
  });

  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders existing stat counts after load', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Total Player Characters')).toBeInTheDocument();
    expect(screen.getByText('Total Friendships')).toBeInTheDocument();
  });

  it('renders game activity stats', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('Total Games')).toBeInTheDocument();
    expect(screen.getByText('Active Games')).toBeInTheDocument();
    expect(screen.getByText('Games (Last 7 Days)')).toBeInTheDocument();
    expect(screen.getByText('Forfeit Rate')).toBeInTheDocument();
  });

  it('renders user management stats', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('Avg Games / User')).toBeInTheDocument();
    expect(screen.getByText('Users With No Games')).toBeInTheDocument();
    expect(screen.getAllByText('alice').length).toBeGreaterThan(0);
  });

  it('renders balance stats', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('Avg Character Level')).toBeInTheDocument();
    expect(screen.getAllByText(/warrior/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/scout/i).length).toBeGreaterThan(0);
  });

  it('renders management links', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: /users/i })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('link', { name: /player characters/i })).toHaveAttribute('href', '/admin/player-characters');
    expect(screen.getByRole('link', { name: /friendships/i })).toHaveAttribute('href', '/admin/friendships');
  });

  it('shows error message when fetch fails', async () => {
    vi.mocked(adminApi.getAdminUsers).mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());
  });
});
