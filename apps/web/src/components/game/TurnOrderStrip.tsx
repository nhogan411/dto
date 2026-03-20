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

        return (
          <button
            type="button"
            key={character.id}
            data-testid={`turn-slot-${character.id}`}
            onClick={() => dispatch(selectCharacter(character.id))}
            style={isActive ? { animation: 'activeTurnFlash 0.8s ease-in-out infinite' } : undefined}
            className={`relative flex flex-col items-center justify-between w-14 h-[72px] bg-neutral-800 border ${isActive ? 'border-yellow-400 border-2' : 'border-neutral-700'} rounded overflow-hidden cursor-pointer hover:border-neutral-500 transition-colors ${isDead ? 'opacity-50 grayscale' : ''} p-0`}
          >
            <div className={`w-full h-1 ${isTeam ? 'bg-blue-500' : 'bg-red-500'}`} />

            <div className="flex-1 flex flex-col items-center justify-center relative">
              <span className="text-2xl">{ICON_EMOJI[character.icon] || '❓'}</span>
              {character.isDefending && character.alive && (
                <span className="text-xs absolute bottom-0">🛡️</span>
              )}
            </div>

            <div className="w-full h-1 bg-neutral-900">
              <div className={`h-full ${hpColor}`} style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }} />
            </div>

            {isActive && <div data-testid="turn-slot-active" className="hidden" />}
            {isDead && <div data-testid="turn-slot-dead" className="hidden opacity-50 grayscale" />}
          </button>
        );
      })}
    </div>
  );
}
