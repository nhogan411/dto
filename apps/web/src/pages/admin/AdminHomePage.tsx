import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminUser, AdminPlayerCharacter, AdminFriendship, AdminStats } from '../../api/admin';
import { getAdminUsers, getAdminPlayerCharacters, getAdminFriendships, getAdminStats } from '../../api/admin';

interface DashboardData {
  users: AdminUser[];
  characters: AdminPlayerCharacter[];
  friendships: AdminFriendship[];
  stats: AdminStats;
}

const NAV_LINKS = [
  { label: 'Users',             href: '/admin/users' },
  { label: 'Player Characters', href: '/admin/player-characters' },
  { label: 'Friendships',       href: '/admin/friendships' },
] as const;

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-neutral-600 p-4 min-w-32">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-neutral-400">{label}</div>
    </div>
  );
}

export default function AdminHomePage() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getAdminUsers(),
      getAdminPlayerCharacters(),
      getAdminFriendships(),
      getAdminStats(),
    ])
      .then(([users, characters, friendships, stats]) => {
        setData({ users, characters, friendships, stats });
      })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-5 bg-[#121212] min-h-screen text-white">Loading dashboard...</div>;
  if (error)   return <div className="p-5 bg-[#121212] min-h-screen text-red-400">Error: {error}</div>;

  const { users, characters, friendships, stats } = data!;

  const recentUsers = [...users]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const OVERVIEW_STATS = [
    { label: 'Total Users',             value: users.length },
    { label: 'Total Player Characters', value: characters.length },
    { label: 'Total Friendships',       value: friendships.length },
  ];

  const ACTIVITY_STATS = [
    { label: 'Total Games',          value: stats.total_games },
    { label: 'Active Games',         value: stats.active_games },
    { label: 'Games (Last 7 Days)',  value: stats.games_last_7_days },
    { label: 'Forfeit Rate',         value: `${(stats.forfeit_rate * 100).toFixed(1)}%` },
  ];

  const USER_STATS = [
    { label: 'Avg Games / User',    value: stats.avg_games_per_user },
    { label: 'Users With No Games', value: stats.users_with_no_games },
  ];

  const BALANCE_STATS = [
    { label: 'Avg Character Level', value: stats.avg_character_level },
  ];

  return (
    <div className="p-5 bg-[#121212] min-h-screen text-white">
      <h1>Admin: Dashboard</h1>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Overview</h2>
      <div className="flex flex-wrap gap-4">
        {OVERVIEW_STATS.map(({ label, value }) => <StatCard key={label} label={label} value={value} />)}
      </div>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Activity</h2>
      <div className="flex flex-wrap gap-4">
        {ACTIVITY_STATS.map(({ label, value }) => <StatCard key={label} label={label} value={value} />)}
      </div>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Users</h2>
      <div className="flex flex-wrap gap-4">
        {USER_STATS.map(({ label, value }) => <StatCard key={label} label={label} value={value} />)}
      </div>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Game Balance</h2>
      <div className="flex flex-wrap gap-4">
        {BALANCE_STATS.map(({ label, value }) => <StatCard key={label} label={label} value={value} />)}
        {Object.entries(stats.avg_level_by_archetype).map(([archetype, avg]) => (
          <StatCard key={archetype} label={`Avg Level — ${archetype}`} value={avg} />
        ))}
      </div>

      <div className="mt-6">
        <h2 className="text-base font-semibold mb-2 text-neutral-400">Top Winning Compositions</h2>
        {stats.top_winning_compositions.length === 0 ? (
          <p className="text-neutral-500 text-sm">No completed games yet.</p>
        ) : (
          <table className="border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-600 text-left">
                <th className="p-2.5">Archetypes</th>
                <th className="p-2.5">Wins</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_winning_compositions.map(({ archetypes, count }) => (
                <tr key={archetypes.join('+')} className="border-b border-neutral-700">
                  <td className="p-2.5">{archetypes.join(' + ')}</td>
                  <td className="p-2.5">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-base font-semibold mb-2 text-neutral-400">Top Users by Games Played</h2>
        <table className="border-collapse">
          <thead>
            <tr className="border-b-2 border-neutral-600 text-left">
              <th className="p-2.5">Username</th>
              <th className="p-2.5">Games</th>
            </tr>
          </thead>
          <tbody>
            {stats.top_users_by_games.map(({ id, username, games_count }) => (
              <tr key={id} className="border-b border-neutral-700">
                <td className="p-2.5">
                  <Link to={`/admin/users/${id}`} className="hover:underline">{username}</Link>
                </td>
                <td className="p-2.5">{games_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="text-base font-semibold mb-2 text-neutral-400">Recent Users</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-neutral-600 text-left">
              <th className="p-2.5">ID</th>
              <th className="p-2.5">Username</th>
              <th className="p-2.5">Email</th>
              <th className="p-2.5">Role</th>
              <th className="p-2.5">Games</th>
              <th className="p-2.5">W / L / F</th>
              <th className="p-2.5">Joined</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.map((user) => (
              <tr key={user.id} className="border-b border-neutral-700">
                <td className="p-2.5">{user.id}</td>
                <td className="p-2.5">
                  <Link to={`/admin/users/${user.id}`} className="hover:underline">{user.username}</Link>
                </td>
                <td className="p-2.5">{user.email}</td>
                <td className="p-2.5">{user.role}</td>
                <td className="p-2.5">{user.games_count}</td>
                <td className="p-2.5">{user.wins} / {user.losses} / {user.forfeits}</td>
                <td className="p-2.5">{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="text-base font-semibold mb-2 text-neutral-400">Manage</h2>
        <div className="flex gap-4">
          {NAV_LINKS.map(({ label, href }) => (
            <Link key={href} to={href} className="border border-neutral-600 p-4 text-white hover:bg-neutral-800">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
