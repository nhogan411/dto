import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCharacter } from '../../store/slices/gameSlice';
import { RACE_LABELS } from '../../constants/races';

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
  const actingCharacterId = useAppSelector(s =>
    s.game.gameState?.actingCharacterId ??
    (s.game.gameState?.turnOrder[s.game.gameState?.currentTurnIndex ?? 0] ?? null)
  );

  const displayId = selectedCharacterId ?? actingCharacterId;
  if (!displayId || !gameState) return null;
  const character = gameState.characters.find(c => c.id === displayId);
  if (!character) return null;

  const owner = character.userId === currentGame?.challenger_id
    ? (currentGame?.challenger_username ?? 'Unknown')
    : (currentGame?.challenged_username ?? 'Unknown');
  const isActiveTurn = gameState.currentTurnUserId === character.userId;
  const hpPercent = Math.max(0, Math.min(100, (character.currentHp / character.maxHp) * 100));
  const isDead = character.alive === false || character.currentHp <= 0;

  const isChallenger = character.userId === currentGame?.challenger_id;
  const isChallenged = character.userId === currentGame?.challenged_id;
  const teamColor = isChallenger ? 'var(--team-blue)' : isChallenged ? 'var(--team-green)' : '#d4d4d4';
  const teamTextClass = isChallenger ? 'text-blue-400' : isChallenged ? 'text-emerald-400' : 'text-neutral-300';

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
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className={`m-0 text-lg font-semibold ${teamTextClass}`}>{character.name}</h3>
            {typeof character.stats?.level === 'number' && (
              <span className="text-xs font-bold text-neutral-400">Lv. {character.stats.level}</span>
            )}
            {isDead && <span className="bg-neutral-600 text-neutral-300 px-1.5 py-0.5 rounded text-xs font-bold">DEAD</span>}
          </div>
          <p className="m-0 text-xs text-neutral-500">
            {RACE_LABELS[character.race] ?? character.race}
            {character.icon ? ` · ${character.icon.charAt(0).toUpperCase()}${character.icon.slice(1)}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => dispatch(selectCharacter(null))}
          aria-label="Close character info panel"
          className="bg-transparent border-none text-neutral-300 cursor-pointer text-base hover:text-white focus-ring"
        >
          ✕
        </button>
      </div>

      <p className="my-1"><strong>Owner:</strong> {owner}</p>
      {isActiveTurn && !isDead && <p className="my-1 text-green-400 font-bold">Active turn</p>}

      <div className="my-3">
        <div className="flex justify-between mb-1 text-sm" style={{ color: isDead ? '#d4d4d4' : 'inherit' }}>
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
        <span className="sr-only">{character.currentHp} out of {character.maxHp} HP ({Math.round(hpPercent)}%)</span>
      </div>

      {character.stats && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-300">
          <span><strong>MOV</strong> {character.stats.movement ?? '—'}</span>
          <span><strong>STR</strong> {character.stats.str ?? '—'}</span>
          <span><strong>DEX</strong> {character.stats.dex ?? '—'}</span>
        </div>
      )}

      <p className="my-1" style={{ color: isDead ? '#d4d4d4' : 'inherit' }}>
        <strong>Facing:</strong> {getFacingDirection(character.position, character.facingTile)}
      </p>
      {character.isDefending && !isDead && (
        <p className="my-1 text-blue-400">Defending</p>
      )}
    </div>
  );
}
