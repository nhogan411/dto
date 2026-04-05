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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-neutral-600 p-4 min-w-32">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-neutral-400">{label}</div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">{children}</h2>;
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

  if (loading) return <div className="p-6 text-white">Loading dashboard...</div>;
  if (error)   return <div className="p-6 text-red-400">Error: {error}</div>;

  const { users, characters, friendships, stats } = data!;

  const mostActiveUsers = [...users]
    .sort((a, b) => b.games_count - a.games_count)
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

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        <div>
          <SectionHeader>Overview</SectionHeader>
          <div className="flex flex-wrap gap-4">
            {OVERVIEW_STATS.map(({ label, value }) => <StatCard key={label} label={label} value={value} />)}
          </div>

          <SectionHeader>Activity</SectionHeader>
          <div className="flex flex-wrap gap-4">
            {ACTIVITY_STATS.map(({ label, value }) => <StatCard key={label} label={label} value={value} />)}
          </div>

          <SectionHeader>Users</SectionHeader>
          <div className="flex flex-wrap gap-4">
            {USER_STATS.map(({ label, value }) => <StatCard key={label} label={label} value={value} />)}
          </div>
        </div>

        <div>
          <SectionHeader>Avg Character Level</SectionHeader>
          <table className="w-full border-collapse">
            <tbody>
              {Object.entries(stats.avg_level_by_archetype).map(([archetype, avg]) => (
                <tr key={archetype} className="border-b border-neutral-700">
                  <td className="p-2.5 capitalize">{archetype}</td>
                  <td className="p-2.5">{avg}</td>
                </tr>
              ))}
              <tr className="border-b border-neutral-600 font-semibold">
                <td className="p-2.5">All Characters</td>
                <td className="p-2.5">{stats.avg_character_level}</td>
              </tr>
            </tbody>
          </table>

          <SectionHeader>Top Winning Compositions</SectionHeader>
          {stats.top_winning_compositions.length === 0 ? (
            <p className="text-neutral-500 text-sm">No completed games yet.</p>
          ) : (
            <table className="w-full border-collapse">
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

          <SectionHeader>Most Active Users</SectionHeader>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-600 text-left">
                <th className="p-2.5">Username</th>
                <th className="p-2.5">Email</th>
                <th className="p-2.5">Role</th>
                <th className="p-2.5">Games</th>
                <th className="p-2.5">W / L / F</th>
              </tr>
            </thead>
            <tbody>
              {mostActiveUsers.map((user) => (
                <tr key={user.id} className="border-b border-neutral-700">
                  <td className="p-2.5">
                    <Link to={`/admin/users/${user.id}`} className="hover:underline">{user.username}</Link>
                  </td>
                  <td className="p-2.5">{user.email}</td>
                  <td className="p-2.5">{user.role}</td>
                  <td className="p-2.5">{user.games_count}</td>
                  <td className="p-2.5">{user.wins} / {user.losses} / {user.forfeits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}