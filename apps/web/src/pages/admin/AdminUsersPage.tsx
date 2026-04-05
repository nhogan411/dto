import axios from 'axios';
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import type { AdminUser } from '../../api/admin';
import { getAdminUsers, updateAdminUser, deleteAdminUser } from '../../api/admin';

export default function AdminUsersPage() {
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setUsers(await getAdminUsers());
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.errors as string[] | undefined)?.[0] ?? 'Failed to fetch users' : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (id: number, newRole: string) => {
    try {
      await updateAdminUser(id, { role: newRole });
      await fetchUsers();
    } catch (err: unknown) {
      alert(axios.isAxiosError(err) ? (err.response?.data?.errors as string[] | undefined)?.[0] ?? 'Failed to update user role' : 'Failed to update user role');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteAdminUser(id);
      await fetchUsers();
    } catch (err: unknown) {
      alert(axios.isAxiosError(err) ? (err.response?.data?.errors as string[] | undefined)?.[0] ?? 'Failed to delete user' : 'Failed to delete user');
    }
  };

   if (loading) return <div className="p-6 text-white">Loading users...</div>;
   if (error)   return <div className="p-6 text-red-400">Error: {error}</div>;

   return (
     <div className="p-6 text-white">
      <h1>Admin: Users</h1>
      <table className="w-full border-collapse mt-5">
        <thead>
          <tr className="border-b-2 border-neutral-600 text-left">
            <th className="p-2.5">ID</th>
            <th className="p-2.5">Username</th>
            <th className="p-2.5">Email</th>
            <th className="p-2.5">Role</th>
            <th className="p-2.5">Games</th>
            <th className="p-2.5">W / L / F</th>
            <th className="p-2.5">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-neutral-700">
              <td className="p-2.5">{user.id}</td>
              <td className="p-2.5">
                <Link to={`/admin/users/${user.id}`} className="hover:underline">{user.username}</Link>
              </td>
              <td className="p-2.5">{user.email}</td>
              <td className="p-2.5">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  disabled={user.id === currentUserId}
                  className="bg-neutral-800 text-white border border-neutral-600 rounded px-1 py-0.5 disabled:opacity-50"
                >
                  <option value="player">player</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td className="p-2.5">{user.games_count}</td>
              <td className="p-2.5">{user.wins} / {user.losses} / {user.forfeits}</td>
              <td className="p-2.5">
                {user.id !== currentUserId && (
                  <button type="button" onClick={() => handleDelete(user.id)} className="text-red-400 hover:text-red-300">
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