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
  const currentGame = useAppSelector((state) => state.game.currentGame);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  if (!selectedCharacterId || !gameState) return null;

  const character = gameState.characters.find((c) => c.id === selectedCharacterId);
  if (!character) return null;

  const owner = character.userId === currentUserId ? 'You' : 'Opponent';
  const isActiveTurn = gameState.currentTurnUserId === character.userId;
  const hpPercent = Math.max(0, Math.min(100, (character.currentHp / character.maxHp) * 100));
  const isDead = character.alive === false || character.currentHp <= 0;

  const isChallenger = character.userId === currentGame?.challenger_id;
  const isChallenged = character.userId === currentGame?.challenged_id;
  const teamColor = isChallenger ? 'var(--team-blue)' : isChallenged ? 'var(--team-green)' : '#888';
  const teamName = isChallenger ? 'Challenger' : isChallenged ? 'Challenged' : 'Unknown';

  return (
    <div
      className="p-4 border-2 rounded-lg mb-4 bg-neutral-800 transition-all"
      style={{
        borderColor: teamColor,
        opacity: isDead ? 0.5 : 1,
        filter: isDead ? 'grayscale(100%)' : 'none'
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-lg font-semibold" style={{ color: teamColor }}>{teamName}</h3>
          {isDead && <span className="bg-neutral-600 text-neutral-300 px-1.5 py-0.5 rounded text-xs font-bold">DEAD</span>}
        </div>
        <button
          onClick={() => dispatch(selectCharacter(null))}
          className="bg-transparent border-none text-neutral-400 cursor-pointer text-base hover:text-white focus-ring"
        >
          ✕
        </button>
      </div>

      <p className="my-1"><strong>Owner:</strong> {owner}</p>
      {isActiveTurn && !isDead && <p className="my-1 text-green-400 font-bold">Active turn</p>}

      <div className="my-3">
        <div className="flex justify-between mb-1 text-sm" style={{ color: isDead ? '#888' : 'inherit' }}>
          <span>HP</span>
          <span>{character.currentHp} / {character.maxHp}</span>
        </div>
        <div className="w-full h-2.5 bg-neutral-600 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${hpPercent}%`,
              background: isDead ? '#666' : '#ef4444'
            }}
          />
        </div>
      </div>

      <p className="my-1" style={{ color: isDead ? '#888' : 'inherit' }}>
        <strong>Facing:</strong> {getFacingDirection(character.position, character.facingTile)}
      </p>
      {character.isDefending && !isDead && (
        <p className="my-1 text-blue-400">Defending</p>
      )}
    </div>
  );
}
