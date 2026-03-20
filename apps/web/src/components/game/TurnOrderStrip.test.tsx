import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TurnOrderStrip } from './TurnOrderStrip';

vi.mock('../../store/hooks', () => ({
  useAppSelector: vi.fn(),
  useAppDispatch: vi.fn(),
}));

vi.mock('../../store/slices/gameSlice', () => ({
  selectCharacter: (id: number) => ({ type: 'game/selectCharacter', payload: id }),
}));

import { useAppSelector, useAppDispatch } from '../../store/hooks';

const mockState = {
  game: {
    gameState: {
      turnOrder: [1, 2],
      currentTurnIndex: 0,
      actingCharacterId: 1,
      characters: [
        {
          id: 1,
          userId: 99,
          name: 'Hero',
          icon: 'warrior',
          currentHp: 50,
          maxHp: 100,
          alive: true,
          isDefending: false,
          position: { x: 0, y: 0 },
          facingTile: { x: 0, y: 0 },
          stats: {},
        },
        {
          id: 2,
          userId: 77,
          name: 'Enemy',
          icon: 'mage',
          currentHp: 30,
          maxHp: 60,
          alive: true,
          isDefending: false,
          position: { x: 1, y: 1 },
          facingTile: { x: 1, y: 1 },
          stats: {},
        },
      ],
    },
    currentGame: { challenger_id: 99, challenged_id: 77 },
  },
  auth: { user: { id: 99 } },
};

describe('TurnOrderStrip', () => {
  let mockDispatch: any;

  beforeEach(() => {
    mockDispatch = vi.fn();
    (useAppDispatch as any).mockReturnValue(mockDispatch);
    (useAppSelector as any).mockImplementation((selector: any) => selector(mockState));
  });

  it('Test 1: Renders a slot for each character in turnOrder', () => {
    render(<TurnOrderStrip />);
    expect(screen.getByTestId('turn-slot-1')).toBeInTheDocument();
    expect(screen.getByTestId('turn-slot-2')).toBeInTheDocument();
  });

  it('Test 2: Active slot has data-testid="turn-slot-active"', () => {
    render(<TurnOrderStrip />);
    expect(screen.getByTestId('turn-slot-active')).toBeInTheDocument();
  });

  it('Test 3: Own character has blue HP bar', () => {
    render(<TurnOrderStrip />);
    const slot = screen.getByTestId('turn-slot-1');
    const hpBar = slot.querySelector('[class*="bg-blue"]') || slot.querySelector('[style*="blue"]');
    expect(hpBar).toBeInTheDocument();
  });

  it('Test 4: Opponent character has red HP bar', () => {
    render(<TurnOrderStrip />);
    const slot = screen.getByTestId('turn-slot-2');
    const hpBar = slot.querySelector('[class*="bg-red"]') || slot.querySelector('[style*="red"]');
    expect(hpBar).toBeInTheDocument();
  });

  it('Test 5: Dead character slot has opacity-50 and grayscale classes', () => {
    const stateWithDead = {
      ...mockState,
      game: {
        ...mockState.game,
        gameState: {
          ...mockState.game.gameState,
          characters: [
            {
              ...mockState.game.gameState.characters[0],
              alive: false,
            },
            mockState.game.gameState.characters[1],
          ],
        },
      },
    };
    (useAppSelector as any).mockImplementation((selector: any) => selector(stateWithDead));
    render(<TurnOrderStrip />);
    const deadSlot = screen.getByTestId('turn-slot-dead');
    expect(deadSlot).toHaveClass('opacity-50');
    expect(deadSlot).toHaveClass('grayscale');
  });

  it('Test 6: Defending character shows shield icon', () => {
    const stateWithDefending = {
      ...mockState,
      game: {
        ...mockState.game,
        gameState: {
          ...mockState.game.gameState,
          characters: [
            {
              ...mockState.game.gameState.characters[0],
              isDefending: true,
            },
            mockState.game.gameState.characters[1],
          ],
        },
      },
    };
    (useAppSelector as any).mockImplementation((selector: any) => selector(stateWithDefending));
    render(<TurnOrderStrip />);
    expect(screen.getByText('🛡️')).toBeInTheDocument();
  });

  it('Test 7: Clicking a slot dispatches selectCharacter(characterId)', async () => {
    const user = userEvent.setup();
    render(<TurnOrderStrip />);
    const slot = screen.getByTestId('turn-slot-1');
    await user.click(slot);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'game/selectCharacter',
        payload: 1,
      })
    );
  });

  it('Test 8: Empty turnOrder renders null', () => {
    const stateWithEmpty = {
      ...mockState,
      game: {
        ...mockState.game,
        gameState: {
          ...mockState.game.gameState,
          turnOrder: [],
        },
      },
    };
    (useAppSelector as any).mockImplementation((selector: any) => selector(stateWithEmpty));
    const { container } = render(<TurnOrderStrip />);
    expect(container.firstChild).toBeNull();
  });

  it('Test 9: When actingCharacterId is null, no turn-slot-active exists', () => {
    const stateWithNull = {
      ...mockState,
      game: {
        ...mockState.game,
        gameState: {
          ...mockState.game.gameState,
          actingCharacterId: null,
        },
      },
    };
    (useAppSelector as any).mockImplementation((selector: any) => selector(stateWithNull));
    render(<TurnOrderStrip />);
    expect(screen.queryByTestId('turn-slot-active')).not.toBeInTheDocument();
  });

  it('Test 10: Characters render in turnOrder array order (not characters array order)', () => {
    const stateWithReorderedTurn = {
      ...mockState,
      game: {
        ...mockState.game,
        gameState: {
          ...mockState.game.gameState,
          turnOrder: [2, 1],
          characters: [
            mockState.game.gameState.characters[0],
            mockState.game.gameState.characters[1],
          ],
        },
      },
    };
    (useAppSelector as any).mockImplementation((selector: any) => selector(stateWithReorderedTurn));
    render(<TurnOrderStrip />);
    const slots = screen.getAllByTestId(/turn-slot-/);
    expect(slots[0]).toHaveAttribute('data-testid', 'turn-slot-2');
    expect(slots[1]).toHaveAttribute('data-testid', 'turn-slot-1');
  });
});
