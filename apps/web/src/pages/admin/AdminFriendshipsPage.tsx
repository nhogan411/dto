import { useEffect, useState, useCallback, FormEvent } from 'react';
import {
  AdminFriendship,
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
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0] || 'Failed to fetch friendships');
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
    <div style={{ padding: '20px' }}>
      <h1>Admin: Friendships</h1>
      
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
              fetchFriendships();
            }}
            style={{ marginLeft: '10px' }}
          >
            Clear Filter
          </button>
        </form>
      </div>

      {loading ? (
        <div>Loading friendships...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>Error: {error}</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>ID</th>
              <th style={{ padding: '10px' }}>Requester (id: username)</th>
              <th style={{ padding: '10px' }}>Recipient (id: username)</th>
              <th style={{ padding: '10px' }}>Status</th>
              <th style={{ padding: '10px' }}>Created At</th>
            </tr>
          </thead>
          <tbody>
            {friendships.map((f) => (
              <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>{f.id}</td>
                <td style={{ padding: '10px' }}>
                  {f.requester.id}: {f.requester.username}
                </td>
                <td style={{ padding: '10px' }}>
                  {f.recipient.id}: {f.recipient.username}
                </td>
                <td style={{ padding: '10px' }}>{f.status}</td>
                <td style={{ padding: '10px' }}>{new Date(f.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
