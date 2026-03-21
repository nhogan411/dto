import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameBoardSquare } from './GameBoardSquare';

describe('GameBoardSquare', () => {
  const baseCharacter = {
    userId: 1,
    currentHp: 10,
    maxHp: 10,
    facing: '→' as const,
    isCurrentUser: true,
    team: 'challenger' as const,
    isDead: false,
    isActiveTurn: false,
    icon: 'warrior',
  };

  const baseProps = {
    x: 1,
    y: 1,
    isBlocked: false,
    isSelected: false,
    isHighlighted: false,
    character: baseCharacter,
  };

  const renderSquare = (overrides = {}) => {
    const props = { ...baseProps, ...overrides };
    const { container } = render(<GameBoardSquare {...props} />);
    return { container };
  };

  // GROUP 1: Active turn flash animation
  describe('Active turn flash animation', () => {
    it('applies activeTurnFlash animation when isActiveTurn is true and isDead is false', () => {
      const { container } = renderSquare({
        character: { ...baseCharacter, isActiveTurn: true, isDead: false },
      });
      const square = container.firstChild as HTMLElement;
      expect(square.style.animation).toContain('activeTurnFlash');
    });

    it('does not apply animation when isActiveTurn is false', () => {
      const { container } = renderSquare({
        character: { ...baseCharacter, isActiveTurn: false },
      });
      const square = container.firstChild as HTMLElement;
      expect(square.style.animation).toBeFalsy();
    });

    it('does not apply animation when isActiveTurn is true but isDead is true', () => {
      const { container } = renderSquare({
        character: { ...baseCharacter, isActiveTurn: true, isDead: true },
      });
      const square = container.firstChild as HTMLElement;
      expect(square.style.animation).toBeFalsy();
    });

    it('does not apply animation when square has no character', () => {
      const { container } = render(
        <GameBoardSquare
          x={1}
          y={1}
          isBlocked={false}
          isSelected={false}
          isHighlighted={false}
        />
      );
      const square = container.firstChild as HTMLElement;
      expect(square.style.animation).toBeFalsy();
    });

    it('does not apply animation when isSelected is true even if isActiveTurn is true', () => {
      const { container } = renderSquare({
        isSelected: true,
        character: { ...baseCharacter, isActiveTurn: true },
      });
      const square = container.firstChild as HTMLElement;
      expect(square.style.animation).toBeFalsy();
    });
  });

  // GROUP 2: Existing border colors
  describe('Border colors', () => {
    it('uses neutral #555 border for challenger character without isActiveTurn', () => {
      const { container } = renderSquare({
        character: { ...baseCharacter, team: 'challenger', isActiveTurn: false },
      });
      const square = container.firstChild as HTMLElement;
      expect(square.style.border).toContain('#555');
    });

    it('uses yellow selection border when isSelected is true', () => {
      const { container } = renderSquare({
        isSelected: true,
        character: { ...baseCharacter, isActiveTurn: false },
      });
      const square = container.firstChild as HTMLElement;
      expect(square.style.border).toContain('#fbbf24');
    });
  });
});
