import { useEffect, useState, useCallback } from 'react';
import { useAppSelector } from '../../store/hooks';
import type { AdminUser } from '../../api/admin';
import {
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser
} from '../../api/admin';

export default function AdminUsersPage() {
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const users = await getAdminUsers();
      setUsers(users);
    } catch (err: any) {
      setError(err.response?.data?.errors?.[0] || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (id: number, newRole: string) => {
    try {
      await updateAdminUser(id, { role: newRole });
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.errors?.[0] || 'Failed to update user role');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await deleteAdminUser(id);
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.errors?.[0] || 'Failed to delete user');
    }
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin: Users</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>ID</th>
            <th style={{ padding: '10px' }}>Email</th>
            <th style={{ padding: '10px' }}>Username</th>
            <th style={{ padding: '10px' }}>Role</th>
            <th style={{ padding: '10px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>{user.id}</td>
              <td style={{ padding: '10px' }}>{user.email}</td>
              <td style={{ padding: '10px' }}>{user.username}</td>
              <td style={{ padding: '10px' }}>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  disabled={user.id === currentUserId}
                >
                  <option value="player">player</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td style={{ padding: '10px' }}>
                {user.id !== currentUserId && (
                  <button type="button" onClick={() => handleDelete(user.id)} style={{ color: 'red' }}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
