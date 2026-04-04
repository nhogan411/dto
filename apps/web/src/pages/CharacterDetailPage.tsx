import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPlayerCharactersThunk, updatePlayerCharacterThunk, resetUpdateStatus } from '../store/slices/playerCharactersSlice';
import { ArchetypePicker } from '../components/characters/ArchetypePicker';
import { RacePicker } from '../components/characters/RacePicker';
import { usePageTitle } from '../hooks/usePageTitle';

export default function CharacterDetailPage() {
  usePageTitle('Edit Character');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { characters, status, updateStatus, error } = useAppSelector((state) => state.playerCharacters);
  const character = characters.find((c) => c.id === Number(id));

  const [name, setName] = useState('');
  const [archetype, setArchetype] = useState<'warrior' | 'scout'>('warrior');
  const [race, setRace] = useState<string>('human');

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchPlayerCharactersThunk());
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (character) {
      setName(character.name);
      setArchetype(character.archetype);
      setRace(character.race ?? 'human');
    }
  }, [character]);

  useEffect(() => {
    return () => {
      dispatch(resetUpdateStatus());
    };
  }, [dispatch]);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!character || character.locked) return;
    
    await dispatch(updatePlayerCharacterThunk({
      id: character.id,
      payload: { name, archetype, race },
    }));
  };

  if (status === 'loading') {
    return (
      <div className="max-w-4xl mx-auto p-8 text-neutral-300 bg-neutral-900 min-h-screen">
        Loading character details...
      </div>
    );
  }

  if (status === 'succeeded' && !character) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-red-400 bg-neutral-900 min-h-screen">
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

  return (
    <div className="max-w-4xl mx-auto p-8 text-white bg-neutral-900 min-h-screen">
      <div className="mb-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(`/characters/${id}`)}
          className="focus-ring bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-md border border-neutral-700 cursor-pointer transition-colors"
        >
          &larr; Back
        </button>
        <h1 className="text-3xl font-bold text-green-400 m-0">Edit Character</h1>
        {character?.locked && (
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg ml-auto">
            In Game
          </span>
        )}
      </div>

      {updateStatus === 'failed' && (
        <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
          {error || 'Failed to update character'}
        </div>
      )}

      {updateStatus === 'succeeded' && (
        <div role="status" className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg mb-6">
          Character updated successfully!
        </div>
      )}

      {character?.locked && (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-lg mb-6">
          This character is currently in a game and cannot be modified.
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-neutral-800 p-6 rounded-lg border border-neutral-700">
        <div className="mb-6">
          <label htmlFor="character-name" className="block text-sm font-medium text-neutral-300 mb-2">
            Character Name
          </label>
          <input
            id="character-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={character?.locked || updateStatus === 'loading'}
            className="focus-ring w-full bg-neutral-900 border border-neutral-700 rounded-md py-2 px-3 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            required
            maxLength={20}
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Character Archetype
          </label>
          <ArchetypePicker
            value={archetype}
            onChange={setArchetype}
            disabled={character?.locked || updateStatus === 'loading'}
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Character Race
          </label>
          <RacePicker
            value={race}
            onChange={setRace}
            disabled={character?.locked || updateStatus === 'loading'}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={character?.locked || updateStatus === 'loading' || name.trim() === ''}
            className="focus-ring bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-none"
          >
            {updateStatus === 'loading' ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
