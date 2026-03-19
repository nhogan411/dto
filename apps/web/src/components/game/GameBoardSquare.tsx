import React from 'react';

export interface GameBoardSquareProps {
  x: number;
  y: number;
  isBlocked: boolean;
  character?: {
    userId: number;
    currentHp: number;
    maxHp: number;
    facing: string;
    isCurrentUser: boolean;
    team?: 'challenger' | 'challenged';
    isDead: boolean;
  } | null;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onHover?: () => void;
}

export function GameBoardSquare({
  x,
  y,
  isBlocked,
  character,
  isSelected,
  isHighlighted,
  onClick,
  onHover,
}: GameBoardSquareProps) {
  let backgroundColor = '#1e1e1e';
  let borderColor = '#333';

  if (isBlocked) {
    backgroundColor = '#2a2a2a';
  } else if (isHighlighted) {
    backgroundColor = 'rgba(74, 222, 128, 0.2)';
  }

  if (isSelected) {
    borderColor = '#fbbf24';
  } else if (character) {
    borderColor = character.team === 'challenger' ? 'var(--team-blue)' : character.team === 'challenged' ? 'var(--team-green)' : (character.isCurrentUser ? '#4ade80' : '#ef4444');
  }

  const squareStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor,
    border: `2px solid ${borderColor}`,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: onClick && !isBlocked ? 'pointer' : 'default',
    position: 'relative',
  };

  const getHpColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio > 0.5) return '#4ade80';
    if (ratio >= 0.25) return '#fbbf24';
    return '#ef4444';
  };

  return (
    <div 
      style={squareStyle} 
      onClick={onClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent);
        }
      } : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Board square ${x}, ${y}${character ? ', occupied' : ''}`}
      onMouseEnter={onHover}
      className={(character ? `character-marker ${character.team === 'challenger' ? 'team-blue' : character.team === 'challenged' ? 'team-green' : ''}` : '') + (onClick ? ' focus-ring' : '')}
    >
      {character && (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: character.team === 'challenger' ? 'var(--team-blue)' : character.team === 'challenged' ? 'var(--team-green)' : 'transparent',
          opacity: character.isDead ? 0.5 : 1,
          filter: character.isDead ? 'grayscale(100%)' : 'none',
        }}>
          <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>
            {character.isCurrentUser ? '⚔️' : '🛡️'}
            <span style={{ fontSize: '1rem', marginLeft: '2px' }}>{character.facing}</span>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '4px',
              width: '80%',
              height: '4px',
              backgroundColor: '#333',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.max(0, Math.min(100, (character.currentHp / character.maxHp) * 100))}%`,
                backgroundColor: getHpColor(character.currentHp, character.maxHp),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
