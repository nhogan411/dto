import { useEffect, useState, useCallback, FormEvent } from 'react';
import type { AdminPlayerCharacter } from '../../api/admin';
import {
  getAdminPlayerCharacters,
  createAdminPlayerCharacter,
  updateAdminPlayerCharacter,
  deleteAdminPlayerCharacter
} from '../../api/admin';

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
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0] || 'Failed to fetch characters');
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
    } catch (err: any) {
      alert(err.response?.data?.errors?.[0] || 'Failed to create character');
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
    } catch (err: any) {
      alert(err.response?.data?.errors?.[0] || 'Failed to update character');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this character?')) return;
    try {
      await deleteAdminPlayerCharacter(id);
      const parsedFilter = parseInt(filterUserId, 10);
      await fetchCharacters(isNaN(parsedFilter) ? undefined : parsedFilter);
    } catch (err: any) {
      alert(err.response?.data?.errors?.[0] || 'Failed to delete character');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin: Player Characters</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>Create New Character</h3>
        <form onSubmit={handleCreate}>
          <input
            type="number"
            placeholder="User ID"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            required
            style={{ marginRight: '10px' }}
          />
          <input
            type="text"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            style={{ marginRight: '10px' }}
          />
          <input
            type="text"
            placeholder="Icon"
            value={newIcon}
            onChange={(e) => setNewIcon(e.target.value)}
            required
            style={{ marginRight: '10px' }}
          />
          <label style={{ marginRight: '10px' }}>
            <input
              type="checkbox"
              checked={newLocked}
              onChange={(e) => setNewLocked(e.target.checked)}
            />
            Locked
          </label>
          <button type="submit">Create</button>
        </form>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <form onSubmit={handleFilterSubmit}>
          <input
            type="number"
            placeholder="Filter by User ID"
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            style={{ marginRight: '10px' }}
          />
          <button type="submit">Filter</button>
          <button
            type="button"
            onClick={() => {
              setFilterUserId('');
              fetchCharacters();
            }}
            style={{ marginLeft: '10px' }}
          >
            Clear Filter
          </button>
        </form>
      </div>

      {loading ? (
        <div>Loading characters...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>Error: {error}</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>ID</th>
              <th style={{ padding: '10px' }}>User ID</th>
              <th style={{ padding: '10px' }}>Name</th>
              <th style={{ padding: '10px' }}>Icon</th>
              <th style={{ padding: '10px' }}>Locked</th>
              <th style={{ padding: '10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {characters.map((char) => (
              <tr key={char.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{char.id}</td>
                <td style={{ padding: '10px' }}>{char.user_id}</td>
                <td style={{ padding: '10px' }}>
                  {editingId === char.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  ) : (
                    char.name
                  )}
                </td>
                <td style={{ padding: '10px' }}>
                  {editingId === char.id ? (
                    <input
                      type="text"
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                    />
                  ) : (
                    char.icon
                  )}
                </td>
                <td style={{ padding: '10px' }}>
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
                <td style={{ padding: '10px' }}>
                  {editingId === char.id ? (
                    <>
                      <button type="button" onClick={() => handleEditSave(char.id)} style={{ marginRight: '5px' }}>
                        Save
                      </button>
                      <button type="button" onClick={handleEditCancel}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => handleEditClick(char)} style={{ marginRight: '5px' }}>
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(char.id)} style={{ color: 'red' }}>
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
