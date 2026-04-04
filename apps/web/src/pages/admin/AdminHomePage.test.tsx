import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AdminHomePage from './AdminHomePage';
import * as adminApi from '../../api/admin';
import authReducer from '../../store/slices/authSlice';

vi.mock('../../api/admin');

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
      { id: 1, email: 'a@a.com', username: 'alice', role: 'admin', created_at: '2026-01-01T00:00:00Z' },
      { id: 2, email: 'b@b.com', username: 'bob',   role: 'player', created_at: '2026-01-02T00:00:00Z' },
    ]);
    vi.mocked(adminApi.getAdminPlayerCharacters).mockResolvedValue([
      { id: 1, user_id: 1, name: 'Hero', icon: 'warrior', locked: false },
      { id: 2, user_id: 2, name: 'Scout', icon: 'scout', locked: false },
      { id: 3, user_id: 1, name: 'Tank', icon: 'warrior', locked: true },
    ]);
    vi.mocked(adminApi.getAdminFriendships).mockResolvedValue([
      { id: 1, requester_id: 1, recipient_id: 2, status: 'accepted', created_at: '2026-01-03T00:00:00Z', requester: { id: 1, username: 'alice' }, recipient: { id: 2, username: 'bob' } },
    ]);
  });

  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders stat counts after load', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Total Player Characters')).toBeInTheDocument();
    expect(screen.getByText('Total Friendships')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders recent users list', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
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
