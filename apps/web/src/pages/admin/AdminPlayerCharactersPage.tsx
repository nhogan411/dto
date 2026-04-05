import { useEffect, useState, useCallback, type FormEvent } from 'react';
import type { AdminPlayerCharacter } from '../../api/admin';
import {
  getAdminPlayerCharacters,
  createAdminPlayerCharacter,
  updateAdminPlayerCharacter,
  deleteAdminPlayerCharacter
} from '../../api/admin';
import { extractApiError } from '../../utils/extractApiError';

export default function AdminPlayerCharactersPage() {
  const [characters, setCharacters] = useState<AdminPlayerCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterUserId, setFilterUserId] = useState<string>('');
  
  const [newUserId, setNewUserId] = useState('');
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newLocked, setNewLocked] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editLocked, setEditLocked] = useState(false);

  const fetchCharacters = useCallback(async (userId?: number) => {
    try {
      setLoading(true);
      setError(null);
      const chars = await getAdminPlayerCharacters(userId);
      setCharacters(chars);
    } catch (err: unknown) {
      setError(extractApiError(err, 'Failed to fetch characters'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const handleFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (filterUserId.trim() === '') {
      fetchCharacters();
    } else {
      const parsedId = parseInt(filterUserId, 10);
      if (!isNaN(parsedId)) {
        fetchCharacters(parsedId);
      }
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const parsedUserId = parseInt(newUserId, 10);
      if (isNaN(parsedUserId)) {
        alert('User ID must be a valid number');
        return;
      }
      await createAdminPlayerCharacter({
        user_id: parsedUserId,
        name: newName,
        icon: newIcon,
        locked: newLocked
      });
      setNewUserId('');
      setNewName('');
      setNewIcon('');
      setNewLocked(false);
      
      const parsedFilter = parseInt(filterUserId, 10);
      await fetchCharacters(isNaN(parsedFilter) ? undefined : parsedFilter);
    } catch (err: unknown) {
      alert(extractApiError(err, 'Failed to create character'));
    }
  };

  const handleEditClick = (char: AdminPlayerCharacter) => {
    setEditingId(char.id);
    setEditName(char.name);
    setEditIcon(char.icon);
    setEditLocked(char.locked);
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  const handleEditSave = async (id: number) => {
    try {
      await updateAdminPlayerCharacter(id, {
        name: editName,
        icon: editIcon,
        locked: editLocked
      });
      setEditingId(null);
      const parsedFilter = parseInt(filterUserId, 10);
      await fetchCharacters(isNaN(parsedFilter) ? undefined : parsedFilter);
    } catch (err: unknown) {
      alert(extractApiError(err, 'Failed to update character'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this character?')) return;
    try {
      await deleteAdminPlayerCharacter(id);
      const parsedFilter = parseInt(filterUserId, 10);
      await fetchCharacters(isNaN(parsedFilter) ? undefined : parsedFilter);
    } catch (err: unknown) {
      alert(extractApiError(err, 'Failed to delete character'));
    }
  };

   return (
     <div className="p-6 text-white">
      <h1>Admin: Player Characters</h1>
      
      <div className="mb-5 p-2.5 border border-neutral-600">
        <h3>Create New Character</h3>
        <form onSubmit={handleCreate}>
          <input
            type="number"
            placeholder="User ID"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            required
            className="mr-2.5 bg-neutral-800 text-white border border-neutral-600 rounded px-2 py-1 placeholder:text-neutral-500"
          />
          <input
            type="text"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            className="mr-2.5 bg-neutral-800 text-white border border-neutral-600 rounded px-2 py-1 placeholder:text-neutral-500"
          />
          <input
            type="text"
            placeholder="Icon"
            value={newIcon}
            onChange={(e) => setNewIcon(e.target.value)}
            required
            className="mr-2.5 bg-neutral-800 text-white border border-neutral-600 rounded px-2 py-1 placeholder:text-neutral-500"
          />
          <label className="mr-2.5">
            <input
              type="checkbox"
              checked={newLocked}
              onChange={(e) => setNewLocked(e.target.checked)}
              className="mr-1"
            />
            Locked
          </label>
          <button type="submit" className="text-white border border-neutral-600 px-3 py-1 hover:bg-neutral-800 rounded">Create</button>
        </form>
      </div>

      <div className="mb-5">
        <form onSubmit={handleFilterSubmit}>
          <input
            type="number"
            placeholder="Filter by User ID"
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="mr-2.5 bg-neutral-800 text-white border border-neutral-600 rounded px-2 py-1 placeholder:text-neutral-500"
          />
          <button type="submit" className="text-white border border-neutral-600 px-3 py-1 hover:bg-neutral-800 rounded">Filter</button>
          <button
            type="button"
            onClick={() => {
              setFilterUserId('');
              fetchCharacters();
            }}
            className="ml-2.5 text-white border border-neutral-600 px-3 py-1 hover:bg-neutral-800 rounded"
          >
            Clear Filter
          </button>
        </form>
      </div>

      {loading ? (
        <div>Loading characters...</div>
      ) : error ? (
        <div className="text-red-400">Error: {error}</div>
      ) : (
        <table className="w-full border-collapse mt-5">
          <thead>
            <tr className="border-b-2 border-neutral-600 text-left">
              <th className="p-2.5">ID</th>
              <th className="p-2.5">User ID</th>
              <th className="p-2.5">Name</th>
              <th className="p-2.5">Icon</th>
              <th className="p-2.5">Locked</th>
              <th className="p-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {characters.map((char) => (
              <tr key={char.id} className="border-b border-neutral-700">
                <td className="p-2.5">{char.id}</td>
                <td className="p-2.5">{char.user_id}</td>
                <td className="p-2.5">
                  {editingId === char.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-neutral-800 text-white border border-neutral-600 rounded px-2 py-1"
                    />
                  ) : (
                    char.name
                  )}
                </td>
                <td className="p-2.5">
                  {editingId === char.id ? (
                    <input
                      type="text"
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      className="bg-neutral-800 text-white border border-neutral-600 rounded px-2 py-1"
                    />
                  ) : (
                    char.icon
                  )}
                </td>
                <td className="p-2.5">
                  {editingId === char.id ? (
                    <input
                      type="checkbox"
                      checked={editLocked}
                      onChange={(e) => setEditLocked(e.target.checked)}
                    />
                  ) : (
                    char.locked ? 'Yes' : 'No'
                  )}
                </td>
                <td className="p-2.5">
                  {editingId === char.id ? (
                    <>
                      <button type="button" onClick={() => handleEditSave(char.id)} className="mr-1.5 text-white border border-neutral-600 px-2 py-0.5 hover:bg-neutral-800 rounded">
                        Save
                      </button>
                      <button type="button" onClick={handleEditCancel} className="text-white border border-neutral-600 px-2 py-0.5 hover:bg-neutral-800 rounded">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => handleEditClick(char)} className="mr-1.5 text-white border border-neutral-600 px-2 py-0.5 hover:bg-neutral-800 rounded">
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(char.id)} className="text-red-400 hover:text-red-300">
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
