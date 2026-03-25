import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminRoute from './AdminRoute';

vi.mock('../store/hooks', () => ({
  useAppSelector: vi.fn(),
}));

import { useAppSelector } from '../store/hooks';

describe('AdminRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders null while loading', () => {
    (useAppSelector as any).mockImplementation((selector) =>
      selector({
        auth: {
          user: null,
          accessToken: null,
          status: 'loading',
        },
      })
    );

    const { container } = render(
      <MemoryRouter>
        <AdminRoute />
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders null while idle (initial state)', () => {
    (useAppSelector as any).mockImplementation((selector) =>
      selector({
        auth: {
          user: null,
          accessToken: null,
          status: 'idle',
        },
      })
    );

    const { container } = render(
      <MemoryRouter>
        <AdminRoute />
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
  });

  it('redirects unauthenticated users to /login', () => {
    (useAppSelector as any).mockImplementation((selector) =>
      selector({
        auth: {
          user: null,
          accessToken: null,
          status: 'failed',
        },
      })
    );

    const { container } = render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<AdminRoute />} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(container.innerHTML).toContain('Login');
  });

  it('redirects authenticated non-admin users to /', () => {
    (useAppSelector as any).mockImplementation((selector) =>
      selector({
        auth: {
          user: { id: 1, email: 'player@test.com', username: 'player', role: 'player' },
          accessToken: 'token123',
          status: 'failed',
        },
      })
    );

    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AdminRoute />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(container.innerHTML).not.toContain('Dashboard');
  });

  it('renders Outlet when user is authenticated and admin', () => {
    (useAppSelector as any).mockImplementation((selector) =>
      selector({
        auth: {
          user: { id: 1, email: 'admin@test.com', username: 'admin', role: 'admin' },
          accessToken: 'token123',
          status: 'failed',
        },
      })
    );

    const { container } = render(
      <MemoryRouter>
        <Routes>
          <Route element={<AdminRoute />}>
            <Route index element={<div data-testid="admin-outlet">Admin Panel</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(container.querySelector('[data-testid="admin-outlet"]')).toBeInTheDocument();
  });
});
