import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';
import type { GameHistoryAction } from '../../api/game';
import gameReducer, { gameActionsReceived, updateGameState } from '../../store/slices/gameSlice';
import type { CharacterState } from '../../store/slices/gameSlice';
import { GameHistory } from './GameHistory';

const makeAttackAction = (overrides: Partial<any> = {}): GameHistoryAction => ({
  id: 1,
  game_id: 1,
  game_character_id: 1,
  action_type: 'attack',
  turn_number: 1,
  sequence_number: 1,
  action_data: {},
  result_data: {
    hit: true,
    critical: false,
    damage: 1,
    roll: 14,
    threshold: 7,
    direction: 'side',
  },
  ...overrides,
});

const makeCharacterState = (overrides: Partial<CharacterState> = {}): CharacterState => ({
  id: 1,
  userId: 1,
  position: { x: 1, y: 1 },
  facingTile: { x: 1, y: 2 },
  currentHp: 10,
  maxHp: 10,
  isDefending: false,
  icon: 'warrior',
  name: 'Thorin',
  alive: true,
  race: 'human',
  stats: {},
  ...overrides,
});

const renderWithActions = (actions: GameHistoryAction[]) => {
  const store = configureStore({
    reducer: {
      game: gameReducer,
    },
  });

  store.dispatch(gameActionsReceived(actions));

  return render(
    <Provider store={store}>
      <GameHistory />
    </Provider>,
  );
};

const renderWithActionsAndCharacters = (actions: GameHistoryAction[], characters: CharacterState[]) => {
  const store = configureStore({
    reducer: {
      game: gameReducer,
    },
  });

  store.dispatch(gameActionsReceived(actions));
  store.dispatch(updateGameState({
    id: 1,
    status: 'active',
    boardConfig: { tiles: [] },
    currentTurnUserId: 1,
    actingCharacterId: 1,
    turnOrder: [],
    currentTurnIndex: 0,
    characters,
    turnNumber: 1,
    winnerId: null,
  }));

  return render(
    <Provider store={store}>
      <GameHistory />
    </Provider>,
  );
};

describe('GameHistory D20 attack display', () => {
  it('renders D20 hit details with direction, roll, threshold', () => {
    renderWithActions([makeAttackAction()]);

    expect(screen.getByText(/Side attack/i)).toBeInTheDocument();
    expect(screen.getByText(/Rolled 14/i)).toBeInTheDocument();
    expect(screen.getByText(/needed ≥7/i)).toBeInTheDocument();
    expect(screen.getByText(/Hit! 1 damage/i)).toBeInTheDocument();
  });

  it('renders miss correctly', () => {
    renderWithActions([
      makeAttackAction({
        result_data: { hit: false, critical: false, damage: 0, roll: 8, threshold: 11, direction: 'front' },
      }),
    ]);

    expect(screen.getByText(/Front attack/i)).toBeInTheDocument();
    expect(screen.getByText(/Rolled 8/i)).toBeInTheDocument();
    expect(screen.getByText(/needed ≥11/i)).toBeInTheDocument();
    expect(screen.getByText(/Miss!/i)).toBeInTheDocument();
  });

  it('renders critical hit correctly', () => {
    renderWithActions([
      makeAttackAction({
        result_data: { hit: true, critical: true, damage: 2, roll: 20, threshold: 3, direction: 'back' },
      }),
    ]);

    expect(screen.getByText(/Back attack/i)).toBeInTheDocument();
    expect(screen.getByText(/CRITICAL HIT!/i)).toBeInTheDocument();
    expect(screen.getByText(/2 damage/i)).toBeInTheDocument();
  });

  it('falls back to old format for actions without D20 fields', () => {
    renderWithActions([
      makeAttackAction({
        result_data: { hit: true, damage: 1 },
      }),
    ]);

    expect(screen.getByText(/Attacked and hit for 1 damage/i)).toBeInTheDocument();
  });
});

describe('GameHistory character name rendering', () => {
  it('renders character name before action type', () => {
    renderWithActionsAndCharacters(
      [makeAttackAction({ game_character_id: 1 })],
      [makeCharacterState({ id: 1, name: 'Thorin' })]
    );
    expect(screen.getByText(/Thorin attack/i)).toBeInTheDocument();
  });

  it('renders without crashing when character not in state', () => {
    renderWithActionsAndCharacters(
      [makeAttackAction({ game_character_id: 99 })],
      [] // no characters in state
    );
    // Should not render "undefined" anywhere
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
    // Should still render the turn info
    expect(screen.getByText(/Turn 1/i)).toBeInTheDocument();
  });
});
