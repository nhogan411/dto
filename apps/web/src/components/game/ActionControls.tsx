import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { submitActionThunk, type GameState } from '../../store/slices/gameSlice';

interface ActionControlsProps {
  gameId: number;
  currentUserId: number;
  gameState: GameState | null;
  selectedSquare: { x: number; y: number } | null;
  selectedTarget: number | null;
  onSelectMode: (mode: 'move' | 'attack' | null) => void;
  activeMode: 'move' | 'attack' | null;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  gameId,
  currentUserId,
  gameState,
  onSelectMode,
  activeMode,
}) => {
  const dispatch = useAppDispatch();
  const { isSubmitting, error } = useAppSelector((state) => state.game);
  
  const [facingDirection, setFacingDirection] = useState<'N' | 'S' | 'E' | 'W'>('N');
  
  const isMyTurn = gameState?.currentTurnUserId === currentUserId;
  const activeCharacter = gameState?.characters.find(c => c.userId === currentUserId);

  const handleDefend = () => {
    dispatch(submitActionThunk({
      gameId,
      actionType: 'defend',
      actionData: {}
    }));
  };

  const handleEndTurn = () => {
    if (!activeCharacter) return;
    
    let facingTile = { ...activeCharacter.position };
    switch (facingDirection) {
      case 'N': facingTile.y -= 1; break;
      case 'S': facingTile.y += 1; break;
      case 'E': facingTile.x += 1; break;
      case 'W': facingTile.x -= 1; break;
    }

    dispatch(submitActionThunk({
      gameId,
      actionType: 'end_turn',
      actionData: { facing_tile: facingTile }
    }));
  };

  if (!gameState) return null;

  return (
    <div className="bg-[#1e1e1e] p-4 rounded-lg border border-[#333] mt-4 flex flex-col gap-4 max-w-2xl mx-auto">
      <div className="flex gap-4 items-center flex-wrap">
        <button
          disabled={!isMyTurn || isSubmitting || activeMode === 'move'}
          onClick={() => onSelectMode('move')}
          className={`focus-ring px-4 py-2 rounded font-medium ${
            activeMode === 'move'
              ? 'bg-[#4ade80] text-[#121212]'
              : 'bg-[#333] text-white hover:bg-[#444] disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          Move
        </button>

        <button
          disabled={!isMyTurn || isSubmitting || activeMode === 'attack'}
          onClick={() => onSelectMode('attack')}
          className={`focus-ring px-4 py-2 rounded font-medium ${
            activeMode === 'attack'
              ? 'bg-[#4ade80] text-[#121212]'
              : 'bg-[#333] text-white hover:bg-[#444] disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          Attack
        </button>

        <button
          disabled={!isMyTurn || isSubmitting}
          onClick={handleDefend}
          className="focus-ring bg-[#333] text-white hover:bg-[#444] px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Defend
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <select
            aria-label="Facing Direction"
            value={facingDirection}
            onChange={(e) => setFacingDirection(e.target.value as 'N' | 'S' | 'E' | 'W')}
            disabled={!isMyTurn || isSubmitting}
            className="bg-[#333] text-white rounded px-2 py-2 border border-[#444] focus-ring"
          >
            <option value="N">North (Up)</option>
            <option value="S">South (Down)</option>
            <option value="E">East (Right)</option>
            <option value="W">West (Left)</option>
          </select>
          <button
            disabled={!isMyTurn || isSubmitting}
            onClick={handleEndTurn}
            className="focus-ring bg-[#4ade80] text-[#121212] hover:bg-[#22c55e] px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            End Turn
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[#ef4444] text-sm font-medium bg-[#ef4444]/10 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
};