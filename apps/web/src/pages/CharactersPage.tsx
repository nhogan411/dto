import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPlayerCharactersThunk } from '../store/slices/playerCharactersSlice';
import { usePageTitle } from '../hooks/usePageTitle';

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
                <div className="text-neutral-300 capitalize mt-1">{character.icon}</div>
              </div>
              {character.locked && (
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  In Game
                </span>
              )}
            </div>
            
            <button
              onClick={() => navigate(`/characters/${character.id}`)}
              className="focus-ring mt-2 bg-blue-600 hover:bg-blue-500 text-white border-none py-2 px-4 rounded-md font-bold cursor-pointer transition-colors w-full"
            >
              Edit Character
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
