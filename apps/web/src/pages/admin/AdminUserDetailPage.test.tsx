import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AdminUserDetailPage from './AdminUserDetailPage';
import * as adminApi from '../../api/admin';
import authReducer from '../../store/slices/authSlice';

vi.mock('../../api/admin');

const mockDetail = {
  id: 1,
  email: 'a@a.com',
  username: 'alice',
  role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
  games_count: 5,
  wins: 3,
  losses: 1,
  forfeits: 1,
  characters: [
    { id: 1, user_id: 1, name: 'Hero', icon: 'warrior', locked: false, archetype: 'warrior', race: 'human', level: 4, xp: 2700, max_hp: 12 },
  ],
  winning_compositions: [
    { archetypes: ['warrior', 'scout'], count: 2 },
  ],
};

function renderPage() {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/admin/users/1']}>
        <Routes>
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    vi.mocked(adminApi.getAdminUserDetail).mockResolvedValue(mockDetail);
  });

  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders user info after load', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('a@a.com')).toBeInTheDocument();
  });

  it('renders game record', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/wins/i)).toBeInTheDocument();
    expect(screen.getByText(/losses/i)).toBeInTheDocument();
    expect(screen.getByText(/forfeits/i)).toBeInTheDocument();
  });

  it('renders characters table', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('warrior')).toBeInTheDocument();
  });

  it('renders winning compositions', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/warrior \+ scout/i)).toBeInTheDocument();
  });

  it('shows error on fetch failure', async () => {
    vi.mocked(adminApi.getAdminUserDetail).mockRejectedValue(new Error('fail'));
    renderPage();
    await waitFor(() => expect(screen.getByText(/failed to load user/i)).toBeInTheDocument());
  });
});