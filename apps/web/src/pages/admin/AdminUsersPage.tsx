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
   if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="p-5">
      <h1>Admin: Users</h1>
      <table className="w-full border-collapse mt-5">
        <thead>
          <tr className="border-b-2 border-neutral-400 text-left">
            <th className="p-2.5">ID</th>
            <th className="p-2.5">Email</th>
            <th className="p-2.5">Username</th>
            <th className="p-2.5">Role</th>
            <th className="p-2.5">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-neutral-200">
              <td className="p-2.5">{user.id}</td>
              <td className="p-2.5">{user.email}</td>
              <td className="p-2.5">{user.username}</td>
              <td className="p-2.5">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  disabled={user.id === currentUserId}
                >
                  <option value="player">player</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td className="p-2.5">
                {user.id !== currentUserId && (
                  <button type="button" onClick={() => handleDelete(user.id)} className="text-red-500">
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
