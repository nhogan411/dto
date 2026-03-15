import React from 'react';
import { GameBoardSquare } from './GameBoardSquare';
import { type GameState } from '../../store/slices/gameSlice';
import { useAppSelector } from '../../store/hooks';

export interface GameBoardProps {
  boardConfig: {
    blocked_squares: number[][];
    start_positions: number[][];
  };
  gameState: GameState | null;
  selectedSquare: { x: number; y: number } | null;
  highlightedSquares: { x: number; y: number }[];
  onSquareClick?: (x: number, y: number) => void;
}

export function GameBoard({
  boardConfig,
  gameState,
  selectedSquare,
  highlightedSquares,
  onSquareClick,
}: GameBoardProps) {
  const user = useAppSelector((state) => state.auth.user);

  const getFacingDirection = (position: { x: number; y: number }, facingTile: { x: number; y: number }) => {
    if (facingTile.y < position.y) return '↑';
    if (facingTile.y > position.y) return '↓';
    if (facingTile.x < position.x) return '←';
    if (facingTile.x > position.x) return '→';
    return '';
  };

  const getCharacterAt = (x: number, y: number) => {
    if (!gameState) return null;
    return gameState.characters.find((c) => c.position.x === x && c.position.y === y) || null;
  };

  const isSquareBlocked = (x: number, y: number) => {
    return boardConfig.blocked_squares.some(([bx, by]) => bx === x && by === y);
  };

  const isSquareHighlighted = (x: number, y: number) => {
    return highlightedSquares.some((sq) => sq.x === x && sq.y === y);
  };

  const isSquareSelected = (x: number, y: number) => {
    return selectedSquare?.x === x && selectedSquare?.y === y;
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gridTemplateRows: 'repeat(8, 1fr)',
    gap: '2px',
    width: '100%',
    aspectRatio: '1',
    maxWidth: '600px',
    backgroundColor: '#333',
    padding: '2px',
    margin: '0 auto',
  };

  const squares = [];
  for (let y = 1; y <= 8; y++) {
    for (let x = 1; x <= 8; x++) {
      const char = getCharacterAt(x, y);
      const characterData = char
        ? {
            userId: char.userId,
            currentHp: char.currentHp,
            maxHp: char.maxHp,
            facing: getFacingDirection(char.position, char.facingTile),
            isCurrentUser: char.userId === user?.id,
          }
        : null;

      squares.push(
        <GameBoardSquare
          key={`${x}-${y}`}
          x={x}
          y={y}
          isBlocked={isSquareBlocked(x, y)}
          character={characterData}
          isSelected={isSquareSelected(x, y)}
          isHighlighted={isSquareHighlighted(x, y)}
          onClick={onSquareClick ? () => onSquareClick(x, y) : undefined}
        />
      );
    }
  }

  return <div style={gridStyle}>{squares}</div>;
}
