import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCharacter } from '../../store/slices/gameSlice';

function getFacingDirection(pos: { x: number; y: number }, facing: { x: number; y: number }): string {
  if (facing.y > pos.y) return 'North';
  if (facing.y < pos.y) return 'South';
  if (facing.x > pos.x) return 'East';
  if (facing.x < pos.x) return 'West';
  return 'Unknown';
}

export function CharacterInfo() {
  const dispatch = useAppDispatch();
  const selectedCharacterId = useAppSelector((state) => state.game.selectedCharacterId);
  const gameState = useAppSelector((state) => state.game.gameState);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  if (!selectedCharacterId || !gameState) return null;

  const character = gameState.characters.find((c) => c.id === selectedCharacterId);
  if (!character) return null;

  const owner = character.userId === currentUserId ? 'You' : 'Opponent';
  const isActiveTurn = gameState.currentTurnUserId === character.userId;
  const hpPercent = Math.max(0, Math.min(100, (character.currentHp / character.maxHp) * 100));

  return (
    <div style={{ padding: '1rem', border: '1px solid #444', borderRadius: '8px', marginBottom: '1rem', background: '#222' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Character Info</h3>
        <button
          onClick={() => dispatch(selectCharacter(null))}
          style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1rem' }}
        >
          ✕
        </button>
      </div>

      <p style={{ margin: '0.25rem 0' }}><strong>Owner:</strong> {owner}</p>
      {isActiveTurn && <p style={{ margin: '0.25rem 0', color: '#4ade80', fontWeight: 'bold' }}>Active turn</p>}

      <div style={{ margin: '0.75rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
          <span>HP</span>
          <span>{character.currentHp} / {character.maxHp}</span>
        </div>
        <div style={{ width: '100%', height: '10px', background: '#444', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ width: `${hpPercent}%`, height: '100%', background: '#ef4444', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      <p style={{ margin: '0.25rem 0' }}>
        <strong>Facing:</strong> {getFacingDirection(character.position, character.facingTile)}
      </p>
      {character.isDefending && (
        <p style={{ margin: '0.25rem 0', color: '#60a5fa' }}>Defending</p>
      )}
    </div>
  );
}
