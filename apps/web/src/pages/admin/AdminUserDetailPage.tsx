import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { AdminUserDetail } from '../../api/admin';
import { getAdminUserDetail } from '../../api/admin';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser]       = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getAdminUserDetail(Number(id))
      .then(setUser)
      .catch((err: unknown) => {
        setError(axios.isAxiosError(err) ? (err.response?.data?.errors as string[] | undefined)?.[0] ?? 'Failed to load user' : 'Failed to load user');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-5 bg-[#121212] min-h-screen text-white">Loading user...</div>;
  if (error)   return <div className="p-5 bg-[#121212] min-h-screen text-red-400">Error: {error}</div>;
  if (!user)   return null;

  return (
    <div className="p-5 bg-[#121212] min-h-screen text-white">
      <div className="mb-4">
        <Link to="/admin/users" className="text-neutral-400 hover:text-white text-sm">← Back to Users</Link>
      </div>

      <h1 className="text-xl font-bold">{user.username}</h1>
      <p className="text-neutral-400 text-sm mt-1"><span>{user.email}</span> · {user.role} · Joined {new Date(user.created_at).toLocaleDateString()}</p>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Game Record</h2>
      <div className="flex gap-4">
        {[
          { label: 'Total Games', value: user.games_count },
          { label: 'Wins',        value: user.wins },
          { label: 'Losses',      value: user.losses },
          { label: 'Forfeits',    value: user.forfeits },
        ].map(({ label, value }) => (
          <div key={label} className="border border-neutral-600 p-4 min-w-24">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-neutral-400">{label}</div>
          </div>
        ))}
      </div>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Characters</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-600 text-left">
            <th className="p-2.5">Name</th>
            <th className="p-2.5">Archetype</th>
            <th className="p-2.5">Race</th>
            <th className="p-2.5">Level</th>
            <th className="p-2.5">XP</th>
            <th className="p-2.5">Max HP</th>
            <th className="p-2.5">Locked</th>
          </tr>
        </thead>
        <tbody>
          {user.characters.map((pc) => (
            <tr key={pc.id} className="border-b border-neutral-700">
              <td className="p-2.5">{pc.name}</td>
              <td className="p-2.5">{pc.archetype}</td>
              <td className="p-2.5">{pc.race}</td>
              <td className="p-2.5">{pc.level}</td>
              <td className="p-2.5">{pc.xp}</td>
              <td className="p-2.5">{pc.max_hp}</td>
              <td className="p-2.5">{pc.locked ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Winning Compositions</h2>
      {user.winning_compositions.length === 0 ? (
        <p className="text-neutral-500 text-sm">No wins recorded yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-neutral-600 text-left">
              <th className="p-2.5">Archetypes</th>
              <th className="p-2.5">Win Count</th>
            </tr>
          </thead>
          <tbody>
            {user.winning_compositions.map(({ archetypes, count }) => (
              <tr key={archetypes.join('+')} className="border-b border-neutral-700">
                <td className="p-2.5">{archetypes.join(' + ')}</td>
                <td className="p-2.5">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}