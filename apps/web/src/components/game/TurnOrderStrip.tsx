import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectCharacter } from '../../store/slices/gameSlice';
import { ICON_EMOJI } from '../../constants/icons';

export function TurnOrderStrip() {
  const dispatch = useAppDispatch();
  const turnOrder = useAppSelector(s => s.game.gameState?.turnOrder ?? []);
  const actingCharacterId = useAppSelector(s => s.game.gameState?.actingCharacterId ?? null);
  const characters = useAppSelector(s => s.game.gameState?.characters ?? []);
  const currentUserId = useAppSelector(s => s.auth.user?.id);

  if (turnOrder.length === 0) return null;

  return (
    <div data-testid="turn-order-strip" className="flex flex-row gap-1 bg-neutral-900 border-b border-neutral-700 px-4 py-2 w-full justify-center">
      {turnOrder.map((id) => {
        const character = characters.find(c => c.id === id);
        if (!character) return null;

        const isTeam = character.userId === currentUserId;
        const isActive = character.id === actingCharacterId;
        const isDead = character.alive === false || character.currentHp <= 0;
        const hpPercent = character.maxHp > 0 ? (character.currentHp / character.maxHp) * 100 : 0;
        const hpColor = isTeam ? 'bg-blue-500' : 'bg-red-500';

        const statusEffects: { icon: string; name: string }[] = [];
        if (character.isDefending && character.alive) {
          statusEffects.push({ icon: '🛡️', name: 'Defending' });
        }

        return (
          <button
            type="button"
            key={character.id}
            data-testid={`turn-slot-${character.id}`}
            onClick={() => dispatch(selectCharacter(character.id))}
            style={isActive ? { animation: 'activeTurnFlash 0.8s ease-in-out infinite' } : undefined}
            className={`group relative flex flex-col items-center justify-between w-14 h-[88px] bg-neutral-800 border ${isActive ? 'border-neutral-600' : 'border-neutral-700'} rounded cursor-pointer hover:border-neutral-500 transition-colors ${isDead ? 'opacity-50 grayscale' : ''} p-0`}
          >
            <div className={`w-full h-1 ${isTeam ? 'bg-blue-500' : 'bg-red-500'}`} />

            <div className="flex-1 flex flex-col items-center justify-center relative">
              <span className="text-2xl">{ICON_EMOJI[character.icon] || '❓'}</span>
            </div>

            <div data-testid="status-icon-row" className="w-full h-5 flex items-center justify-center gap-0.5 px-0.5">
              {statusEffects.slice(0, 3).map((se) => (
                <span key={se.name} className="text-xs leading-none" title={se.name}>{se.icon}</span>
              ))}
            </div>

            <div className="w-full h-1 bg-neutral-900">
              <div className={`h-full ${hpColor}`} style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }} />
            </div>

            {isActive && <div data-testid="turn-slot-active" className="hidden" />}
            {isDead && <div data-testid="turn-slot-dead" className="hidden opacity-50 grayscale" />}

            <div data-testid="character-tooltip" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 hidden group-hover:block w-48 bg-neutral-900 border border-neutral-600 rounded-lg p-2 text-left text-xs text-white pointer-events-none shadow-lg">
              <div className="font-bold mb-1">{character.name}</div>
              <div className="text-neutral-400">HP: {character.currentHp} / {character.maxHp}</div>
              {statusEffects.length > 0 && (
                <div className="mt-1.5">
                  <div className="text-neutral-400 mb-0.5">Status:</div>
                  {statusEffects.map((se) => (
                    <div key={se.name} className="flex items-center gap-1">
                      <span>{se.icon}</span>
                      <span>{se.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {statusEffects.length === 0 && <div className="text-neutral-500 mt-1">No active effects</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
