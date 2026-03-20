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

function getHpColor(current: number, max: number): string {
  const ratio = current / max;
  if (ratio > 0.5) return '#4ade80';
  if (ratio >= 0.25) return '#fbbf24';
  return '#ef4444';
}

export function CharacterRenderer({
  userId: _userId,
  currentHp,
  maxHp,
  facing,
  isCurrentUser,
  team,
  isDead,
  mode: _mode = 'token',
  icon,
}: CharacterRendererProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
          team === 'challenger'
            ? 'var(--team-blue)'
            : team === 'challenged'
              ? 'var(--team-green)'
              : 'transparent',
        opacity: isDead ? 0.5 : 1,
        filter: isDead ? 'grayscale(100%)' : 'none',
      }}
    >
      <div
        role="img"
        aria-label={`${isCurrentUser ? 'Your character' : 'Opponent character'}${isDead ? ', dead' : ''}, facing ${facing}`}
        style={{ fontSize: '1.5rem', lineHeight: 1 }}
      >
        {ICON_EMOJI[icon] ?? '❓'}
        <span style={{ fontSize: '1rem', marginLeft: '2px' }}>{facing}</span>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          width: '80%',
          height: '4px',
          backgroundColor: '#333',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, (currentHp / maxHp) * 100))}%`,
            backgroundColor: getHpColor(currentHp, maxHp),
          }}
        />
      </div>
    </div>
  );
}
