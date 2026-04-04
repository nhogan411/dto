import axios from 'axios';
import { useEffect, useState, useCallback, type FormEvent } from 'react';
import type { AdminFriendship } from '../../api/admin';
import {
  getAdminFriendships
} from '../../api/admin';

export default function AdminFriendshipsPage() {
  const [friendships, setFriendships] = useState<AdminFriendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterUserId, setFilterUserId] = useState<string>('');

  const fetchFriendships = useCallback(async (userId?: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminFriendships(userId);
      setFriendships(data);
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.errors as string[] | undefined)?.[0] ?? 'Failed to fetch friendships' : 'Failed to fetch friendships');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriendships();
  }, [fetchFriendships]);

  const handleFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (filterUserId.trim() === '') {
      fetchFriendships();
    } else {
      const parsedId = parseInt(filterUserId, 10);
      if (!isNaN(parsedId)) {
        fetchFriendships(parsedId);
      }
    }
  };

  return (
    <div className="p-5 bg-[#121212] min-h-screen text-white">
      <h1>Admin: Friendships</h1>
      
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
              fetchFriendships();
            }}
            className="ml-2.5 text-white border border-neutral-600 px-3 py-1 hover:bg-neutral-800 rounded"
          >
            Clear Filter
          </button>
        </form>
      </div>

      {loading ? (
        <div>Loading friendships...</div>
      ) : error ? (
        <div className="text-red-400">Error: {error}</div>
      ) : (
        <table className="w-full border-collapse mt-5">
          <thead>
            <tr className="border-b-2 border-neutral-600 text-left">
              <th className="p-2.5">ID</th>
              <th className="p-2.5">Requester (id: username)</th>
              <th className="p-2.5">Recipient (id: username)</th>
              <th className="p-2.5">Status</th>
              <th className="p-2.5">Created At</th>
            </tr>
          </thead>
          <tbody>
            {friendships.map((f) => (
              <tr key={f.id} className="border-b border-neutral-700">
                <td className="p-2.5">{f.id}</td>
                <td className="p-2.5">
                  {f.requester.id}: {f.requester.username}
                </td>
                <td className="p-2.5">
                  {f.recipient.id}: {f.recipient.username}
                </td>
                <td className="p-2.5">{f.status}</td>
                <td className="p-2.5">{new Date(f.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
