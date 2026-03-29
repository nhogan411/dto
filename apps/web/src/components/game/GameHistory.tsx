import { useEffect, useRef } from 'react';
import { useAppSelector } from '../../store/hooks';

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

          const naturalRoll = action.result_data?.natural_roll as number | undefined;
          const attackBonus = action.result_data?.attack_bonus as number | undefined;
          const targetAc = action.result_data?.target_ac as number | undefined;

          // D&D 5e extended display
          if (naturalRoll !== undefined && attackBonus !== undefined && targetAc !== undefined) {
            const directionLabel = direction ? String(direction).charAt(0).toUpperCase() + String(direction).slice(1) : 'Melee';
            
            if (critical) {
              return (
                <span style={{ color: '#FFD700' }}>
                  {`${directionLabel} attack — CRITICAL HIT! Rolled ${naturalRoll} — ${String(damage)} damage`}
                </span>
              );
            } else if (hit) {
              return (
                <span style={{ color: '#4CAF50' }}>
                  {`${directionLabel} attack — Rolled ${naturalRoll} + ${attackBonus} vs AC ${targetAc} — Hit! ${String(damage)} damage`}
                </span>
              );
            } else {
              return (
                <span style={{ color: '#d4d4d4' }}>
                  {`${directionLabel} attack — Rolled ${naturalRoll} + ${attackBonus} vs AC ${targetAc} — Miss`}
                </span>
              );
            }
          }

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
    <div className="p-4 border border-neutral-700 rounded-lg bg-neutral-800 flex flex-col h-full">
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

          if (action.action_type === 'attack' && action.result_data?.natural_roll !== undefined) {
            const rd = action.result_data;
            const directionStr = rd.direction as string | undefined;
            const directionLabel = directionStr ? directionStr.charAt(0).toUpperCase() + directionStr.slice(1) : 'Front';
            const naturalRoll = rd.natural_roll as number;
            const attackBonusNum = rd.attack_bonus as number;
            const total = naturalRoll + attackBonusNum;
            const targetAc = rd.target_ac as number;
            const targetId = rd.target_id as string | number | undefined;
            const targetName = gameState?.characters.find(c => String(c.id) === String(targetId))?.name ?? "Unknown";
            const hit = rd.hit as boolean;
            const critical = rd.critical as boolean;
            const damage = rd.damage as number | undefined;

            const formatBonus = (n: number) => n >= 0 ? `+${n}` : `${n}`;

            const attacker = gameState?.characters.find(c => c.id === action.game_character_id);
            const attackStat = attacker?.stats?.attack_stat as string | undefined;
            const statValue = attackStat ? (attacker?.stats?.[attackStat] as number | undefined) : undefined;
            const abilityMod = statValue !== undefined ? Math.floor((statValue - 10) / 2) : undefined;
            const profBonus = attacker?.stats?.proficiency_bonus as number | undefined;
            const positionalBonus = { front: 0, side: 1, back: 2 }[directionStr as 'front'|'side'|'back'] ?? 0;
            const statLabel = attackStat?.toUpperCase() ?? 'STR';

            const hasStats = abilityMod !== undefined && profBonus !== undefined;

            return (
              <div key={action.id} className="p-2 bg-neutral-700 rounded text-sm text-left">
                <div className="text-neutral-300 text-xs mb-1">
                  Turn {action.turn_number}
                </div>
                <div className="font-semibold mb-1">
                  {charName ? `${charName} ` : ''}{directionLabel} Attacks {targetName}
                </div>
                <div className="text-neutral-200">
                  <div>Attack Roll: {naturalRoll}</div>
                  <div className="relative inline-block group cursor-help">
                    <span>Attack Modifier: {formatBonus(attackBonusNum)}</span>
                    <span className="ml-1 text-neutral-500 text-xs">[?]</span>
                    {hasStats && (
                      <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block
                                      bg-neutral-900 border border-neutral-600 rounded p-2
                                      text-xs text-neutral-200 whitespace-nowrap z-50 shadow-lg">
                        <div>{statLabel} Modifier: {formatBonus(abilityMod!)}</div>
                        <div>Proficiency Bonus: {formatBonus(profBonus!)}</div>
                        <div>Positional Bonus ({directionLabel}): {formatBonus(positionalBonus)}</div>
                        <div className="border-t border-neutral-600 mt-1 pt-1">
                          Total Modifier: {formatBonus(abilityMod! + profBonus! + positionalBonus)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>Total: {total}{critical ? ' (Critical!)' : ''}</div>
                  <div>Target AC: {targetAc}</div>
                  <div className="mt-1">
                    Result:{' '}
                    {critical ? (
                      <span className="text-yellow-400">Critical Hit — {damage} damage</span>
                    ) : hit ? (
                      <span className="text-green-400">Hit — {damage} damage</span>
                    ) : (
                      <span className="text-neutral-400">Miss</span>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={action.id} className="p-2 bg-neutral-700 rounded text-sm text-left">
              <div className="text-neutral-300 text-xs mb-0.5">
                Turn {action.turn_number}
              </div>
              <div>
                <strong>{charName ? `${charName} ` : ''}{action.action_type}:</strong> {renderActionDescription(action)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
