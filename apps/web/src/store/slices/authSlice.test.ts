import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../api/auth';

const sampleUser: User = {
  id: 1,
  email: 'player@example.com',
  username: 'player-one',
};

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('setCredentials sets user, tokens, and persists to localStorage', async () => {
    const { default: authReducer, setCredentials } = await import('./authSlice');

    const state = authReducer(
      undefined,
      setCredentials({
        user: sampleUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    );

    expect(state.user).toEqual(sampleUser);
    expect(state.accessToken).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
    expect(localStorage.getItem('accessToken')).toBe('access-token');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
  });

  it('clearCredentials clears state and removes from localStorage', async () => {
    const { default: authReducer, clearCredentials, setCredentials } = await import('./authSlice');

    const populatedState = authReducer(
      undefined,
      setCredentials({
        user: sampleUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    );

    const clearedState = authReducer(populatedState, clearCredentials());

    expect(clearedState.user).toBeNull();
    expect(clearedState.accessToken).toBeNull();
    expect(clearedState.refreshToken).toBeNull();
    expect(clearedState.status).toBe('idle');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('updateUser merges fields into the persisted auth user', async () => {
    const { default: authReducer, setCredentials, updateUser } = await import('./authSlice');

    const populatedState = authReducer(
      undefined,
      setCredentials({
        user: sampleUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    );

    const updatedState = authReducer(
      populatedState,
      updateUser({ email: 'updated@example.com' }),
    );

    expect(updatedState.user).toEqual({
      ...sampleUser,
      email: 'updated@example.com',
    });
    expect(localStorage.getItem('authUser')).toContain('updated@example.com');
  });

  it('initial state loads tokens from localStorage if present', async () => {
    localStorage.setItem('accessToken', 'stored-access-token');
    localStorage.setItem('refreshToken', 'stored-refresh-token');

    const { default: authReducer } = await import('./authSlice');
    const state = authReducer(undefined, { type: '@@INIT' });

    expect(state.user).toBeNull();
    expect(state.accessToken).toBe('stored-access-token');
    expect(state.refreshToken).toBe('stored-refresh-token');
    expect(state.status).toBe('idle');
  });
});
