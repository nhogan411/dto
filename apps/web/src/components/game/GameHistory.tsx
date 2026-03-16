import { useEffect, useRef } from 'react';
import { useAppSelector } from '../../store/hooks';

export function GameHistory() {
  const gameActions = useAppSelector((state) => state.game.gameActions);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [gameActions]);

  if (!gameActions || gameActions.length === 0) {
    return (
      <div style={{ padding: '1rem', border: '1px solid #444', borderRadius: '8px', background: '#222' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>Game History</h3>
        <p style={{ color: '#aaa', margin: 0, fontSize: '0.9rem' }}>No actions yet.</p>
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
              color = '#888';
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
    <div style={{ padding: '1rem', border: '1px solid #444', borderRadius: '8px', background: '#222', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '400px' }}>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', flexShrink: 0 }}>Game History</h3>
      <div 
        ref={listRef}
        style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}
      >
        {gameActions.map((action) => (
          <div key={action.id} style={{ padding: '0.5rem', background: '#333', borderRadius: '4px', fontSize: '0.9rem' }}>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
              Turn {action.turn_number}
            </div>
            <div>
              <strong>{action.action_type}:</strong> {renderActionDescription(action)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
