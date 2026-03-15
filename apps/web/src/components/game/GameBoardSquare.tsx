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
  } | null;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick?: () => void;
}

export function GameBoardSquare({
  isBlocked,
  character,
  isSelected,
  isHighlighted,
  onClick,
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
    borderColor = character.isCurrentUser ? '#4ade80' : '#ef4444';
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
    <div style={squareStyle} onClick={onClick}>
      {character && (
        <>
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
        </>
      )}
    </div>
  );
}
