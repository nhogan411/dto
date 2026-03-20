import React from 'react';
import { GameBoardSquare } from './GameBoardSquare';
import { type GameState } from '../../store/slices/gameSlice';
import { useAppSelector } from '../../store/hooks';

export interface GameBoardProps {
  boardConfig: {
    tiles: Array<Array<{ type: string }>>;
  };
  gameState: GameState | null;
  selectedSquare: { x: number; y: number } | null;
  highlightedSquares: { x: number; y: number }[];
  onSquareClick?: (x: number, y: number, e: React.MouseEvent) => void;
  onSquareHover?: (x: number, y: number) => void;
  attackPreview?: import('../../api/game').AttackPreviewResponse | null;
  challengerId?: number;
  challengedId?: number;
  renderingMode?: 'token';
}

export function GameBoard({
  boardConfig,
  gameState,
  selectedSquare,
  highlightedSquares,
  onSquareClick,
  onSquareHover,
  attackPreview,
  challengerId,
  challengedId,
  renderingMode,
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
    return boardConfig.tiles[y - 1]?.[x - 1]?.type === 'blocked';
  };

  const isSquareHighlighted = (x: number, y: number) => {
    return highlightedSquares.some((sq) => sq.x === x && sq.y === y);
  };

  const isSquareSelected = (x: number, y: number) => {
    return selectedSquare?.x === x && selectedSquare?.y === y;
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gridTemplateRows: 'repeat(12, 1fr)',
    gap: '2px',
    width: '100%',
    aspectRatio: '1',
    maxWidth: '600px',
    backgroundColor: '#bbb',
    padding: '2px',
    margin: '0 auto',
  };

  const squares = [];
  for (let y = 1; y <= 12; y++) {
    for (let x = 1; x <= 12; x++) {
      const char = getCharacterAt(x, y);
       const characterData = char
          ? {
              userId: char.userId,
              currentHp: char.currentHp,
              maxHp: char.maxHp,
              facing: getFacingDirection(char.position, char.facingTile),
              isCurrentUser: char.userId === user?.id,
              team: char.userId === challengerId ? ('challenger' as const) : char.userId === challengedId ? ('challenged' as const) : undefined,
              isDead: char.alive === false || char.currentHp <= 0,
              isActiveTurn: char.id === gameState!.actingCharacterId,
              icon: char.icon,
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
          onClick={onSquareClick ? (e) => onSquareClick(x, y, e) : undefined}
          onHover={onSquareHover ? () => onSquareHover(x, y) : undefined}
          renderingMode={renderingMode}
        />
      );
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={gridStyle} aria-label="Game board">{squares}</div>
      {attackPreview && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: '-20px',
          transform: 'translateX(100%)',
          background: 'rgba(0,0,0,0.85)',
          border: '1px solid #666',
          borderRadius: '6px',
          padding: '0.5rem 0.75rem',
          color: '#fff',
          fontSize: '0.85rem',
          pointerEvents: 'none',
          zIndex: 100,
          whiteSpace: 'nowrap'
        }}>
          <div>Attack — {attackPreview.hit_chance_percent}% (need ≥{attackPreview.threshold}) — {attackPreview.direction.charAt(0).toUpperCase() + attackPreview.direction.slice(1)}</div>
          {attackPreview.is_defending && <div style={{ color: '#f59e0b', marginTop: '4px' }}>(Defending)</div>}
        </div>
      )}
    </div>
  );
}
