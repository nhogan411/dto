import { Link } from 'react-router-dom';
import type { XpAward } from '../../constants/xp';
import { XP_THRESHOLDS } from '../../constants/xp';

interface Props {
  winnerId: number | null;
  currentUserId: number;
  xpAwards: XpAward[];
}

function xpProgressToNextLevel(level: number, totalXp: number): { current: number; needed: number } {
  const nextLevel = Math.min(level + 1, 20);
  const currentThreshold = XP_THRESHOLDS[level] ?? 0;
  const nextThreshold = XP_THRESHOLDS[nextLevel] ?? (XP_THRESHOLDS[20] as number);
  return {
    current: totalXp - currentThreshold,
    needed: nextThreshold - currentThreshold,
  };
}

function CharacterRow({ award, isWinningTeam }: { award: XpAward; isWinningTeam: boolean }) {
  const isDead = award.xp_earned === 0 && !isWinningTeam;
  const progress = xpProgressToNextLevel(award.new_level, award.xp_total);

  return (
    <div className={`flex flex-col gap-1 rounded-lg border border-neutral-700 p-3 ${isDead ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-white">{award.character_name}</span>
          <span className="ml-2 text-sm capitalize text-neutral-400">
            {award.race} {award.archetype}
          </span>
        </div>
        <span className={`text-sm font-bold ${award.xp_earned > 0 ? 'text-green-400' : 'text-neutral-500'}`}>
          +{award.xp_earned} XP
        </span>
      </div>
      <div className="text-xs text-neutral-400">
        Level {award.new_level} — {progress.current} / {progress.needed} XP to next level
      </div>
      {award.leveled_up && (
        <div className="flex items-center gap-2">
          {award.player_character_id !== null ? (
            <Link
              to={`/characters/${award.player_character_id}`}
              className="inline-block rounded bg-yellow-500 px-2 py-0.5 text-xs font-bold text-black hover:bg-yellow-400"
            >
              ⬆ Level up!
            </Link>
          ) : (
            <span className="inline-block rounded bg-yellow-500 px-2 py-0.5 text-xs font-bold text-black">
              ⬆ Level up!
            </span>
          )}
          <span className="text-xs text-neutral-400">
            Max HP: {award.old_max_hp} → {award.new_max_hp}
          </span>
        </div>
      )}
    </div>
  );
}

export function GameOverScreen({ winnerId, currentUserId, xpAwards }: Props) {
  const myTeam = xpAwards.filter((a) => a.team_user_id === currentUserId);
  const theirTeam = xpAwards.filter((a) => a.team_user_id !== currentUserId);
  const iWon = winnerId === currentUserId;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75">
      <div className="w-full max-w-2xl rounded-xl bg-neutral-900 border border-neutral-700 p-6 shadow-2xl text-white">
        <h2 className="mb-6 text-center text-2xl font-bold">
          {iWon ? '🏆 Victory!' : '💀 Defeat'}
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">Your Team</h3>
            <div className="flex flex-col gap-2">
              {myTeam.map((award) => (
                <CharacterRow key={award.game_character_id} award={award} isWinningTeam={iWon} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">Opponent</h3>
            <div className="flex flex-col gap-2">
              {theirTeam.map((award) => (
                <CharacterRow key={award.game_character_id} award={award} isWinningTeam={!iWon} />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-block rounded-md bg-blue-500 px-5 py-3 font-bold text-white hover:bg-blue-600"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
