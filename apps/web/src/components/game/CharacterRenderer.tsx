import { ICON_EMOJI } from '../../constants/icons';

interface CharacterRendererProps {
  userId: number;
  currentHp: number;
  maxHp: number;
  facing: string;
  isCurrentUser: boolean;
  team?: 'challenger' | 'challenged';
  isDead: boolean;
  mode?: 'token';
  icon: string;
}

export function CharacterRenderer({
  userId: _userId,
  currentHp: _currentHp,
  maxHp: _maxHp,
  facing,
  isCurrentUser,
  team,
  isDead,
  mode: _mode = 'token',
  icon,
}: CharacterRendererProps) {
  const facingRotation: Record<string, number> = {
    '↑': 0,
    '→': 90,
    '↓': 180,
    '←': 270,
  };
  const rotation = facingRotation[facing] ?? 0;
  const teamColor = team === 'challenger' ? 'var(--team-blue)' : team === 'challenged' ? 'var(--team-green)' : '#6b7280';

  return (
    <div className="w-full h-full flex items-center justify-center relative" style={{ opacity: isDead ? 0.5 : 1, filter: isDead ? 'grayscale(100%)' : 'none' }}>
      <svg
        data-testid="teardrop-svg"
        width="75%"
        height="75%"
        viewBox="0 0 40 48"
        style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center center', overflow: 'visible' }}
        aria-label={`${isCurrentUser ? 'Your character' : 'Opponent character'}${isDead ? ', dead' : ''}, facing ${facing}`}
      >
        <path
          d="M20,2 C20,2 6,16 6,28 A14,14 0 0,0 34,28 C34,16 20,2 20,2 Z"
          fill={teamColor}
        />
      </svg>
      <div
        data-testid="icon-emoji"
        className="absolute text-[160%] leading-none pointer-events-none select-none"
      >
        {ICON_EMOJI[icon] ?? '❓'}
      </div>
    </div>
  );
}
