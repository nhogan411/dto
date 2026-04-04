import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPlayerCharactersThunk } from '../store/slices/playerCharactersSlice';
import { usePageTitle } from '../hooks/usePageTitle';
import { RACE_LABELS } from '../constants/races';
import { XP_THRESHOLDS } from '../constants/xp';

export default function CharactersPage() {
  usePageTitle('Characters');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { characters, status, error } = useAppSelector((state) => state.playerCharacters);

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchPlayerCharactersThunk());
    }
  }, [dispatch, status]);

  return (
    <div className="max-w-6xl mx-auto p-8 text-white bg-neutral-900 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-green-400 m-0">Characters</h1>
      </div>

      {status === 'loading' && <div className="text-neutral-300">Loading characters...</div>}
      
      {status === 'failed' && (
        <div role="alert" className="text-red-400 bg-red-500/10 p-4 rounded-lg mb-6 border border-red-500/20">
          {error}
        </div>
      )}

      {status === 'succeeded' && characters.length === 0 && (
        <div className="text-neutral-300">No characters found in your stable.</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {characters.map((character) => (
          <div
            key={character.id}
            className="bg-neutral-800 p-6 rounded-lg border border-neutral-700 flex flex-col gap-4 relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold m-0 text-white">{character.name}</h2>
                <div className="flex items-center gap-2 mt-1">
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
                <div className="text-neutral-400 text-sm mt-2 flex gap-3">
                  <span>HP {character.max_hp}</span>
                </div>
              </div>
              {character.locked && (
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  In Game
                </span>
              )}
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-bold text-white">Level {character.level}</span>
                {character.level < 20 ? (
                  <span className="text-neutral-400 text-xs">
                    {character.xp - (XP_THRESHOLDS[character.level] ?? 0)} / {(XP_THRESHOLDS[character.level + 1] ?? 0) - (XP_THRESHOLDS[character.level] ?? 0)} XP to next level
                  </span>
                ) : (
                  <span className="text-yellow-400 text-xs font-bold">Max Level</span>
                )}
              </div>
              {character.level < 20 && (
                <div className="w-full h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-[width] duration-300"
                    style={{
                      width: `${Math.min(100, ((character.xp - (XP_THRESHOLDS[character.level] ?? 0)) / ((XP_THRESHOLDS[character.level + 1] ?? 1) - (XP_THRESHOLDS[character.level] ?? 0))) * 100)}%`
                    }}
                  />
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => navigate(`/characters/${character.id}`)}
              className="focus-ring mt-2 bg-neutral-700 hover:bg-neutral-600 text-white border-none py-2 px-4 rounded-md font-bold cursor-pointer transition-colors w-full"
            >
              View Character
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
