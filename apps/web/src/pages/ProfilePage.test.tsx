import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';

const mockDispatch = vi.fn();
const mockUpdateProfile = vi.fn();
const mockUpdateUser = vi.fn((payload: { email?: string }) => ({ type: 'auth/updateUser', payload }));

vi.mock('../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: { auth: { user: { id: number; email: string; username: string } } }) => unknown) =>
    selector({
      auth: {
        user: {
          id: 1,
          email: 'player@example.com',
          username: 'player-one',
        },
      },
    }),
}));

vi.mock('../api/profileApi', () => ({
  profileApi: {
    updateProfile: (payload: unknown) => mockUpdateProfile(payload),
  },
}));

vi.mock('../store/slices/authSlice', () => ({
  updateUser: (payload: { email?: string }) => mockUpdateUser(payload),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders separate email and password sections', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveValue('player@example.com');
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
  });

  it('updates email and dispatches auth user update', async () => {
    mockUpdateProfile.mockResolvedValue({ data: { message: 'Profile updated' } });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'updated@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update email/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ email: 'updated@example.com' });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'auth/updateUser',
        payload: { email: 'updated@example.com' },
      });
      expect(screen.getByText('Email updated successfully.')).toBeInTheDocument();
    });
  });

  it('shows API validation errors for password changes', async () => {
    mockUpdateProfile.mockRejectedValue(
      axios.AxiosError.from(new Error('Request failed'), undefined, undefined, undefined, {
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: {},
        config: { headers: {} as never },
        data: { errors: ['Current password is incorrect'] },
      }),
    );

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
    });
  });
});
