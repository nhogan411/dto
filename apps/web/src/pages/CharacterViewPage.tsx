import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPlayerCharactersThunk } from '../store/slices/playerCharactersSlice';
import { usePageTitle } from '../hooks/usePageTitle';
import { RACE_LABELS } from '../constants/races';
import { XP_THRESHOLDS } from '../constants/xp';

export default function CharacterViewPage() {
  usePageTitle('Character');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { characters, status } = useAppSelector((state) => state.playerCharacters);
  const character = characters.find((c) => c.id === Number(id));

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchPlayerCharactersThunk());
    }
  }, [dispatch, status]);

  if (status === 'loading') {
    return (
      <div className="max-w-2xl mx-auto p-8 text-neutral-300 bg-neutral-900 min-h-screen">
        Loading character...
      </div>
    );
  }

  if (status === 'succeeded' && !character) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-red-400 bg-neutral-900 min-h-screen">
        Character not found.
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate('/characters')}
            className="text-blue-400 hover:text-blue-300 underline cursor-pointer bg-transparent border-none p-0"
          >
            Back to Characters
          </button>
        </div>
      </div>
    );
  }

  if (!character) return null;

  const currentThreshold = XP_THRESHOLDS[character.level] ?? 0;
  const nextThreshold = character.level < 20 ? (XP_THRESHOLDS[character.level + 1] ?? 0) : null;
  const xpIntoLevel = character.xp - currentThreshold;
  const xpNeeded = nextThreshold !== null ? nextThreshold - currentThreshold : null;
  const xpPercent = xpNeeded !== null && xpNeeded > 0 ? Math.min(100, (xpIntoLevel / xpNeeded) * 100) : 100;

  return (
    <div className="max-w-2xl mx-auto p-8 text-white bg-neutral-900 min-h-screen">
      <div className="mb-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/characters')}
          className="focus-ring bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-md border border-neutral-700 cursor-pointer transition-colors"
        >
          &larr; Back
        </button>
        <h1 className="text-3xl font-bold text-green-400 m-0">{character.name}</h1>
        {character.locked && (
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg ml-auto">
            In Game
          </span>
        )}
      </div>

      <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-6 flex flex-col gap-6">

        {/* Identity */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-purple-500/20 text-purple-400 border border-purple-500/30">
            {RACE_LABELS[character.race] ?? character.race}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
            ${character.archetype === 'warrior'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
            {character.archetype}
          </span>
        </div>

        {/* Level + XP */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xl font-bold">Level {character.level}</span>
            {xpNeeded !== null ? (
              <span className="text-sm text-neutral-400">
                {xpIntoLevel} / {xpNeeded} XP to next level
              </span>
            ) : (
              <span className="text-sm text-yellow-400 font-bold">Max Level</span>
            )}
          </div>
          <div className="w-full h-2 bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-[width] duration-300"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-neutral-500">{character.xp} total XP</div>
        </div>

        {/* Stats */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 mb-3">Stats</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-neutral-900 rounded-md p-3 flex justify-between">
              <span className="text-neutral-400">Max HP</span>
              <span className="font-bold">{character.max_hp}</span>
            </div>
          </div>
        </div>

      </div>

      {!character.locked && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => navigate(`/characters/${character.id}/edit`)}
            className="focus-ring bg-blue-600 hover:bg-blue-500 text-white border-none py-2 px-6 rounded-md font-bold cursor-pointer transition-colors"
          >
            Edit Character
          </button>
        </div>
      )}
    </div>
  );
}