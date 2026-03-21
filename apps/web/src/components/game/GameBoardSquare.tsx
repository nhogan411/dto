import React from 'react';
import { CharacterRenderer } from './CharacterRenderer';

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
    isActiveTurn: boolean;
    icon: string;
  } | null;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onHover?: () => void;
  renderingMode?: 'token';
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
  renderingMode,
}: GameBoardSquareProps) {
  let backgroundColor = '#6b7280';
  let borderColor = '#333';

  if (isBlocked) {
    backgroundColor = '#000000';
  } else if (isHighlighted) {
    backgroundColor = 'rgba(74, 222, 128, 0.2)';
  }

  if (isSelected) {
    borderColor = '#fbbf24';
  } else if (character) {
    borderColor = '#555';
  }

  const isActiveAndAlive = !!(character && character.isActiveTurn && !character.isDead && !isSelected);

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
    animation: isActiveAndAlive ? 'activeTurnFlash 0.8s ease-in-out infinite' : undefined,
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
        <CharacterRenderer
          mode={renderingMode}
          userId={character.userId}
          currentHp={character.currentHp}
          maxHp={character.maxHp}
          facing={character.facing}
          isCurrentUser={character.isCurrentUser}
          team={character.team}
          isDead={character.isDead}
          icon={character.icon}
        />
      )}
    </div>
  );
}
