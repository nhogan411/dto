import { type AttackPreviewResponse } from '../../api/game';

interface AttackPreviewTooltipProps {
  preview: AttackPreviewResponse;
  targetGridPosition: { x: number; y: number };
  tileSize: number;
}

export function AttackPreviewTooltip({ preview, targetGridPosition, tileSize }: AttackPreviewTooltipProps) {
  const isAbove = targetGridPosition.y > 3;
  
  const style = {
    position: 'absolute' as const,
    left: (targetGridPosition.x - 1) * tileSize + tileSize / 2,
    top: isAbove ? (targetGridPosition.y - 1) * tileSize : targetGridPosition.y * tileSize,
    transform: `translate(-50%, ${isAbove ? 'calc(-100% - 8px)' : '8px'})`,
    pointerEvents: 'none' as const,
    zIndex: 200,
  };

  const capitalize = (s: string) => {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  };

  const formatAttackRoll = (bonus: number) => {
    if (bonus < 0) return `d20 - ${Math.abs(bonus)}`;
    if (bonus === 0) return `d20`;
    return `d20 + ${bonus}`;
  };

  return (
    <div 
      className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-white shadow-xl min-w-[200px]"
      style={style}
    >
      <div className="font-semibold text-base mb-1">
        Hit Chance: {preview.hit_chance_percent}%
      </div>
      
      <hr className="border-neutral-700 my-2" />
      
      <div className="flex flex-col gap-1 text-neutral-300">
        <div className="flex justify-between">
          <span>Attack roll:</span>
          <span className="text-white">{formatAttackRoll(preview.attack_bonus)}</span>
        </div>
        <div className="flex justify-between">
          <span>Target AC:</span>
          <span className="text-white">{preview.target_ac}</span>
        </div>
        <div className="flex justify-between">
          <span>Direction:</span>
          <span className="text-white">{capitalize(preview.direction)}</span>
        </div>
        {preview.is_defending && (
          <div className="text-amber-400 font-medium text-center mt-1">
            (Defending)
          </div>
        )}
      </div>

      <hr className="border-neutral-700 my-2" />
      
      <div className="text-center text-neutral-200">
        Damage if hit: <span className="text-white font-semibold">{preview.damage_min}–{preview.damage_max}</span> <span className="text-neutral-400 text-xs ml-1">(avg {preview.damage_avg})</span>
      </div>
    </div>
  );
}
