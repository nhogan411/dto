import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CharacterDetailPage from './CharacterDetailPage';

describe('CharacterDetailPage', () => {
  it('renders correctly with character data', () => {
    const store = configureStore({
      reducer: {
        playerCharacters: (state = { characters: [{ id: 1, name: 'Conan', icon: 'warrior', locked: true }], status: 'succeeded', updateStatus: 'idle', error: null }) => state,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/characters/1']}>
          <Routes>
            <Route path="/characters/:id" element={<CharacterDetailPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByDisplayValue('Conan')).toBeInTheDocument();
    expect(screen.getByText('In Game')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Conan')).toBeDisabled();
  });
});
