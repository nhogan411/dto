import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CharacterRenderer } from './CharacterRenderer';

describe('CharacterRenderer', () => {
  const baseProps = {
    userId: 1,
    currentHp: 10,
    maxHp: 10,
    facing: '↑',
    isCurrentUser: true,
    team: 'challenger' as const,
    isDead: false,
    mode: 'token' as const,
    icon: 'warrior',
  };

  const renderChar = (overrides = {}) => {
    const props = { ...baseProps, ...overrides };
    const { container } = render(<CharacterRenderer {...props} />);
    return { container };
  };

  // GROUP 1: Icon emoji mapping
  describe('Icon emoji mapping', () => {
    it('renders ⚔️ emoji for warrior icon', () => {
      const { container } = renderChar({ icon: 'warrior' });
      const emojiDiv = container.querySelector('[data-testid="icon-emoji"]');
      expect(emojiDiv?.textContent).toBe('⚔️');
    });

    it('renders 🏹 emoji for scout icon', () => {
      const { container } = renderChar({ icon: 'scout' });
      const emojiDiv = container.querySelector('[data-testid="icon-emoji"]');
      expect(emojiDiv?.textContent).toBe('🏹');
    });

    it('renders ❓ emoji for unknown icon', () => {
      const { container } = renderChar({ icon: 'unknown' });
      const emojiDiv = container.querySelector('[data-testid="icon-emoji"]');
      expect(emojiDiv?.textContent).toBe('❓');
    });

    it('renders different emojis for warrior and scout', () => {
      const { container: container1 } = render(<CharacterRenderer {...baseProps} icon="warrior" />);
      const warriorEmoji = container1.querySelector('[data-testid="icon-emoji"]')?.textContent;

      const { container: container2 } = render(<CharacterRenderer {...baseProps} icon="scout" />);
      const scoutEmoji = container2.querySelector('[data-testid="icon-emoji"]')?.textContent;

      expect(warriorEmoji).not.toBe(scoutEmoji);
    });

    it('applies 160% font size to icon container', () => {
      const { container } = renderChar({ icon: 'warrior' });
      const emojiDiv = container.querySelector('[data-testid="icon-emoji"]') as HTMLElement;
      expect(emojiDiv?.style.fontSize).toBe('160%');
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

  // GROUP 5: Facing arrows (SVG rotation)
  describe('Facing direction (SVG rotation)', () => {
    it('renders ↑ arrow when facing is "↑" with rotate(0deg)', () => {
      const { container } = renderChar({ facing: '↑' });
      const svg = container.querySelector('[data-testid="teardrop-svg"]') as HTMLElement;
      expect(svg.style.transform).toBe('rotate(0deg)');
    });

    it('renders ↓ arrow when facing is "↓" with rotate(180deg)', () => {
      const { container } = renderChar({ facing: '↓' });
      const svg = container.querySelector('[data-testid="teardrop-svg"]') as HTMLElement;
      expect(svg.style.transform).toBe('rotate(180deg)');
    });

    it('renders ← arrow when facing is "←" with rotate(270deg)', () => {
      const { container } = renderChar({ facing: '←' });
      const svg = container.querySelector('[data-testid="teardrop-svg"]') as HTMLElement;
      expect(svg.style.transform).toBe('rotate(270deg)');
    });

    it('renders → arrow when facing is "→" with rotate(90deg)', () => {
      const { container } = renderChar({ facing: '→' });
      const svg = container.querySelector('[data-testid="teardrop-svg"]') as HTMLElement;
      expect(svg.style.transform).toBe('rotate(90deg)');
    });
  });

  // GROUP 6: Team colors
  describe('Team background colors (SVG fill)', () => {
    it('renders SVG path fill var(--team-blue) when team is "challenger"', () => {
      const { container } = renderChar({ team: 'challenger' });
      const path = container.querySelector('[data-testid="teardrop-svg"] path') as SVGPathElement;
      expect(path?.getAttribute('fill')).toBe('var(--team-blue)');
    });

    it('renders SVG path fill var(--team-green) when team is "challenged"', () => {
      const { container } = renderChar({ team: 'challenged' });
      const path = container.querySelector('[data-testid="teardrop-svg"] path') as SVGPathElement;
      expect(path?.getAttribute('fill')).toBe('var(--team-green)');
    });

    it('renders SVG path fill #6b7280 when team is undefined', () => {
      const { container } = renderChar({ team: undefined });
      const path = container.querySelector('[data-testid="teardrop-svg"] path') as SVGPathElement;
      expect(path?.getAttribute('fill')).toBe('#6b7280');
    });
  });
});
