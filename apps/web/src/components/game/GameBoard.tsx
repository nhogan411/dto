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
  attackableSquares?: { x: number; y: number }[];
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
  attackableSquares = [],
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

  const isSquareAttackable = (x: number, y: number) => {
    return attackableSquares.some((sq) => sq.x === x && sq.y === y);
  };

  const isSquareSelected = (x: number, y: number) => {
    return selectedSquare?.x === x && selectedSquare?.y === y;
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
          isAttackable={isSquareAttackable(x, y)}
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
    <div className="relative">
      <div className="grid grid-cols-12 grid-rows-12 gap-0.5 w-full aspect-square max-w-[600px] bg-[#bbb] p-0.5 mx-auto" aria-label="Game board">{squares}</div>
      {attackPreview && (
        <div className="absolute top-0 right-[-20px] translate-x-full bg-black/85 border border-neutral-500 rounded-md px-3 py-2 text-white text-sm pointer-events-none z-[100] whitespace-nowrap">
          <div>Attack — {attackPreview.hit_chance_percent}% (need ≥{attackPreview.threshold}) — {attackPreview.direction.charAt(0).toUpperCase() + attackPreview.direction.slice(1)}</div>
          {attackPreview.is_defending && <div className="text-amber-400 mt-1">(Defending)</div>}
        </div>
      )}
    </div>
  );
}
