import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CharactersPage from './CharactersPage';
import playerCharactersReducer from '../store/slices/playerCharactersSlice';

describe('CharactersPage', () => {
  it('renders loading state initially', () => {
    const store = configureStore({
      reducer: {
        playerCharacters: playerCharactersReducer,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <CharactersPage />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Characters')).toBeInTheDocument();
    expect(screen.getByText('Loading characters...')).toBeInTheDocument();
  });

  it('renders characters when succeeded', () => {
    const store = configureStore({
      reducer: {
        playerCharacters: (state = { characters: [{ id: 1, name: 'Conan', icon: 'warrior', locked: true }], status: 'succeeded', updateStatus: 'idle', error: null }) => state,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <CharactersPage />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Conan')).toBeInTheDocument();
    expect(screen.getByText('In Game')).toBeInTheDocument();
    expect(screen.getByText('warrior')).toBeInTheDocument();
  });
});
