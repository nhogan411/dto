import { useEffect, useRef } from 'react';
import { useAppSelector } from '../../store/hooks';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

export function GameHistory() {
  const gameActions = useAppSelector((state) => state.game.gameActions);
  const gameState = useAppSelector((state) => state.game.gameState);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [gameActions]);

  if (!gameActions || gameActions.length === 0) {
    return (
      <div className="p-4 border border-neutral-700 rounded-lg bg-neutral-800">
        <h3 className="m-0 mb-2 text-lg font-semibold flex-shrink-0 text-white">Game History</h3>
        <p className="text-neutral-300 m-0 text-sm">No actions yet.</p>
      </div>
    );
  }

  const renderActionDescription = (action: import('../../api/game').GameHistoryAction): React.ReactNode => {
    switch (action.action_type) {
      case 'move': {
        const path = action.action_data.path as { x: number; y: number }[] | undefined;
        if (path && path.length > 0) {
          const dest = path[path.length - 1];
          return `Moved to ${dest.x},${dest.y}`;
        }
        return 'Moved';
      }
      case 'attack': {
        if (action.result_data) {
          const roll = action.result_data.roll;
          const threshold = action.result_data.threshold;
          const hit = action.result_data.hit;
          const critical = action.result_data.critical;
          const damage = action.result_data.damage;
          const direction = action.result_data.direction;

          // D20 display
          if (roll !== undefined && threshold !== undefined && direction !== undefined) {
            const directionLabel = String(direction).charAt(0).toUpperCase() + String(direction).slice(1);
            let outcome: string;
            let color: string;
            let damageStr = '';

            if (critical) {
              outcome = 'CRITICAL HIT!';
              color = '#FFD700';
              damageStr = ` ${String(damage)} damage`;
            } else if (hit) {
              outcome = 'Hit!';
              color = '#4CAF50';
              damageStr = ` ${String(damage)} damage`;
            } else {
              outcome = 'Miss!';
              color = '#d4d4d4';
            }

            return (
              <span style={{ color }}>
                {`${directionLabel} attack — Rolled ${String(roll)} (needed ≥${String(threshold)}) — ${outcome}${damageStr}`}
              </span>
            );
          }

          // Fallback for old actions
          if (hit) {
            return `Attacked and hit for ${String(damage)} damage`;
          }
          return 'Attacked and missed';
        }
        return 'Attacked';
      }
      case 'defend':
        return 'Defending';
      case 'end_turn': {
        const facingTile = action.action_data.facing_tile as { x: number; y: number } | undefined;
        if (facingTile) {
          return `Ended turn, facing (${facingTile.x},${facingTile.y})`;
        }
        return 'Ended turn';
      }
      default:
        return `Performed ${action.action_type}`;
    }
  };

   return (
     <div className="p-4 border border-neutral-700 rounded-lg bg-neutral-800 flex flex-col h-full max-h-[400px]">
       <h3 className="m-0 mb-2 text-lg font-semibold flex-shrink-0 text-white">Game History</h3>
      <div 
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Game action history"
        tabIndex={0}
        className="flex-1 overflow-y-auto flex flex-col gap-2 pr-2"
      >
        {gameActions.map((action) => {
          const charName = gameState?.characters.find(c => c.id === action.game_character_id)?.name ?? '';
          return (
            <div key={action.id} className="p-2 bg-neutral-700 rounded text-sm">
              <div className="text-neutral-300 text-xs mb-0.5">
                Turn {action.turn_number}
              </div>
              <div>
                <strong>{charName ? `${charName} ` : ''}{action.action_type}:</strong> {renderActionDescription(action)}
              </div>
              {action.created_at && (
                <div className="text-neutral-400 text-xs mt-0.5">
                  Sent: {formatTimestamp(action.created_at)}
                </div>
              )}
              {action.received_at && (
                <div className="text-neutral-400 text-xs">
                  Received: {formatTimestamp(action.received_at)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
