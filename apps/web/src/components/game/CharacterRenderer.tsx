import React from 'react';

interface CharacterRendererProps {
  userId: number;
  currentHp: number;
  maxHp: number;
  facing: string;
  isCurrentUser: boolean;
  team?: 'challenger' | 'challenged';
  isDead: boolean;
  mode?: 'token';
}

function getHpColor(current: number, max: number): string {
  const ratio = current / max;
  if (ratio > 0.5) return '#4ade80';
  if (ratio >= 0.25) return '#fbbf24';
  return '#ef4444';
}

export function CharacterRenderer({
  userId,
  currentHp,
  maxHp,
  facing,
  isCurrentUser,
  team,
  isDead,
  mode = 'token',
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
      <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>
        {isCurrentUser ? '⚔️' : '🛡️'}
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
