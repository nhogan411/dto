import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AdminUsersPage from './AdminUsersPage';
import * as adminApi from '../../api/admin';
import authReducer from '../../store/slices/authSlice';

vi.mock('../../api/admin');

function renderPage() {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    </Provider>
  );
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.mocked(adminApi.getAdminUsers).mockResolvedValue([
      { id: 1, email: 'a@a.com', username: 'alice', role: 'admin',  created_at: '2026-01-01T00:00:00Z', games_count: 5, wins: 3, losses: 1, forfeits: 1 },
      { id: 2, email: 'b@b.com', username: 'bob',   role: 'player', created_at: '2026-01-02T00:00:00Z', games_count: 2, wins: 1, losses: 1, forfeits: 0 },
    ]);
  });

  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders user rows with game stats', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('Games')).toBeInTheDocument();
    expect(screen.getByText('W / L / F')).toBeInTheDocument();
  });

  it('renders links to user detail pages', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    const aliceLink = screen.getByRole('link', { name: 'alice' });
    expect(aliceLink).toHaveAttribute('href', '/admin/users/1');
  });

  it('shows error on fetch failure', async () => {
    vi.mocked(adminApi.getAdminUsers).mockRejectedValue(new Error('fail'));
    renderPage();
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());
  });
});
