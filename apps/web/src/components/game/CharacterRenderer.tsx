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
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isDead ? 0.5 : 1, filter: isDead ? 'grayscale(100%)' : 'none' }}>
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
        <foreignObject x="6" y="16" width="28" height="28">
          <div {...({ xmlns: "http://www.w3.org/1999/xhtml" } as React.HTMLAttributes<HTMLDivElement>)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '14px', lineHeight: '1' }}>
            {ICON_EMOJI[icon] ?? '❓'}
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}
