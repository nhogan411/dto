import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CharacterRenderer } from './CharacterRenderer';

describe('CharacterRenderer', () => {
  const baseProps = {
    userId: 1,
    currentHp: 10,
    maxHp: 10,
    facing: '↑' as const,
    isCurrentUser: true,
    team: 'challenger' as const,
    isDead: false,
    mode: 'token' as const,
  };

  const renderChar = (overrides = {}) => {
    const props = { ...baseProps, ...overrides };
    const { container } = render(<CharacterRenderer {...props} />);
    return { container };
  };

  // GROUP 1: Emoji by role
  describe('Emoji by role', () => {
    it('renders ⚔️ emoji when isCurrentUser is true', () => {
      render(
        <CharacterRenderer
          {...baseProps}
          isCurrentUser={true}
        />
      );
      expect(screen.getByText('⚔️')).toBeInTheDocument();
    });

    it('renders 🛡️ emoji when isCurrentUser is false', () => {
      render(
        <CharacterRenderer
          {...baseProps}
          isCurrentUser={false}
        />
      );
      expect(screen.getByText('🛡️')).toBeInTheDocument();
    });
  });

  // GROUP 2: HP bar width calculation
  describe('HP bar width', () => {
    it('renders HP bar at 70% width when currentHp=7, maxHp=10', () => {
      const { container } = renderChar({ currentHp: 7, maxHp: 10 });
      const hpBarInner = container.querySelector('div > div > div:last-child > div');
      expect(hpBarInner?.style.width).toBe('70%');
    });

    it('renders HP bar at 0% width when currentHp=0, maxHp=10', () => {
      const { container } = renderChar({ currentHp: 0, maxHp: 10 });
      const hpBarInner = container.querySelector('div > div > div:last-child > div');
      expect(hpBarInner?.style.width).toBe('0%');
    });

    it('renders HP bar at 100% width when currentHp=10, maxHp=10', () => {
      const { container } = renderChar({ currentHp: 10, maxHp: 10 });
      const hpBarInner = container.querySelector('div > div > div:last-child > div');
      expect(hpBarInner?.style.width).toBe('100%');
    });
  });

  // GROUP 3: HP color thresholds
  describe('HP color thresholds', () => {
    it('renders green (#4ade80) background when HP ratio > 0.5', () => {
      const { container } = renderChar({ currentHp: 6, maxHp: 10 });
      const hpBarInner = container.querySelector('div > div > div:last-child > div');
      expect(hpBarInner?.style.backgroundColor).toBe('#4ade80');
    });

    it('renders yellow (#fbbf24) background when HP ratio 0.25-0.5', () => {
      const { container } = renderChar({ currentHp: 3, maxHp: 10 });
      const hpBarInner = container.querySelector('div > div > div:last-child > div');
      expect(hpBarInner?.style.backgroundColor).toBe('#fbbf24');
    });

    it('renders red (#ef4444) background when HP ratio < 0.25', () => {
      const { container } = renderChar({ currentHp: 2, maxHp: 10 });
      const hpBarInner = container.querySelector('div > div > div:last-child > div');
      expect(hpBarInner?.style.backgroundColor).toBe('#ef4444');
    });
  });

  // GROUP 4: Dead state
  describe('Dead state styles', () => {
    it('renders with opacity: 0.5 and filter: grayscale(100%) when isDead is true', () => {
      const { container } = renderChar({ isDead: true });
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.style.opacity).toBe('0.5');
      expect(outerDiv.style.filter).toBe('grayscale(100%)');
    });

    it('renders with opacity: 1 and filter: none when isDead is false', () => {
      const { container } = renderChar({ isDead: false });
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.style.opacity).toBe('1');
      expect(outerDiv.style.filter).toBe('none');
    });
  });

  // GROUP 5: Facing arrows
  describe('Facing arrows', () => {
    it('renders ↑ arrow when facing is "↑"', () => {
      render(
        <CharacterRenderer
          {...baseProps}
          facing='↑'
        />
      );
      expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('renders ↓ arrow when facing is "↓"', () => {
      render(
        <CharacterRenderer
          {...baseProps}
          facing='↓'
        />
      );
      expect(screen.getByText('↓')).toBeInTheDocument();
    });

    it('renders ← arrow when facing is "←"', () => {
      render(
        <CharacterRenderer
          {...baseProps}
          facing='←'
        />
      );
      expect(screen.getByText('←')).toBeInTheDocument();
    });

    it('renders → arrow when facing is "→"', () => {
      render(
        <CharacterRenderer
          {...baseProps}
          facing='→'
        />
      );
      expect(screen.getByText('→')).toBeInTheDocument();
    });
  });

  // GROUP 6: Team backgrounds
  describe('Team background colors', () => {
    it('renders backgroundColor var(--team-blue) when team is "challenger"', () => {
      const { container } = renderChar({ team: 'challenger' });
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.style.backgroundColor).toBe('var(--team-blue)');
    });

    it('renders backgroundColor var(--team-green) when team is "challenged"', () => {
      const { container } = renderChar({ team: 'challenged' });
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.style.backgroundColor).toBe('var(--team-green)');
    });

    it('renders backgroundColor transparent when team is undefined', () => {
      const { container } = renderChar({ team: undefined });
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.style.backgroundColor).toBe('transparent');
    });
  });
});
