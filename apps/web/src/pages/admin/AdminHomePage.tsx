import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminUser, AdminPlayerCharacter, AdminFriendship } from '../../api/admin';
import { getAdminUsers, getAdminPlayerCharacters, getAdminFriendships } from '../../api/admin';

interface DashboardData {
  users: AdminUser[];
  characters: AdminPlayerCharacter[];
  friendships: AdminFriendship[];
}

const NAV_LINKS = [
  { label: 'Users', href: '/admin/users' },
  { label: 'Player Characters', href: '/admin/player-characters' },
  { label: 'Friendships', href: '/admin/friendships' },
] as const;

export default function AdminHomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAdminUsers(), getAdminPlayerCharacters(), getAdminFriendships()])
      .then(([users, characters, friendships]) => {
        setData({ users, characters, friendships });
      })
      .catch(() => {
        setError('Failed to load dashboard data');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  const recentUsers = [...(data?.users ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 5);

  const STATS = [
    { label: 'Total Users', value: data?.users.length ?? 0 },
    { label: 'Total Player Characters', value: data?.characters.length ?? 0 },
    { label: 'Total Friendships', value: data?.friendships.length ?? 0 },
  ];

  return (
    <div className="p-5">
      <h1>Admin: Dashboard</h1>

      <div className="mt-5 flex gap-5">
        {STATS.map(({ label, value }) => (
          <div key={label} className="border border-neutral-400 p-4 min-w-32">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-neutral-600">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Recent Users</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-neutral-400 text-left">
              <th className="p-2.5">ID</th>
              <th className="p-2.5">Username</th>
              <th className="p-2.5">Email</th>
              <th className="p-2.5">Role</th>
              <th className="p-2.5">Joined</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.map((user) => (
              <tr key={user.id} className="border-b border-neutral-200">
                <td className="p-2.5">{user.id}</td>
                <td className="p-2.5">{user.username}</td>
                <td className="p-2.5">{user.email}</td>
                <td className="p-2.5">{user.role}</td>
                <td className="p-2.5">{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Manage</h2>
        <div className="flex gap-4">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              to={href}
              className="border border-neutral-400 p-4 hover:bg-neutral-100"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
