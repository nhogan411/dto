import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminRoute from './AdminRoute';

vi.mock('../store/hooks', () => ({
  useAppSelector: vi.fn(),
}));

import { useAppSelector } from '../store/hooks';

const mockedSelector = useAppSelector as MockedFunction<typeof useAppSelector>;

describe('AdminRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects authenticated non-admin users to /', () => {
    mockedSelector.mockImplementation((selector) =>
      selector({
        auth: {
          user: { id: 1, email: 'player@test.com', username: 'player', role: 'player' },
          accessToken: 'token123',
          status: 'succeeded',
        },
      } as never)
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
    mockedSelector.mockImplementation((selector) =>
      selector({
        auth: {
          user: { id: 1, email: 'admin@test.com', username: 'admin', role: 'admin' },
          accessToken: 'token123',
          status: 'succeeded',
        },
      } as never)
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
