import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearCredentials } from '../store/slices/authSlice';

const ADMIN_NAV_LINKS = [
  { label: 'Dashboard',  href: '/admin' },
  { label: 'Users',      href: '/admin/users' },
  { label: 'Characters', href: '/admin/player-characters' },
] as const;

export default function AdminLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-white focus:text-black">
        Skip to main content
      </a>
      <nav aria-label="Admin navigation" className="flex justify-between items-center px-8 py-4 bg-surface-popover border-b border-border-subtle">
        <Link to="/admin" className="focus-ring rounded px-1 text-xl font-bold text-accent-green no-underline">
          DTO
        </Link>
        <div className="flex items-center gap-6">
          {ADMIN_NAV_LINKS.map(({ label, href }) => (
            <Link key={href} to={href} className="focus-ring rounded px-1 text-neutral-300 no-underline font-semibold">
              {label}
            </Link>
          ))}
          {user && <span className="text-neutral-300">{user.username}</span>}
          <button
            type="button"
            onClick={handleLogout}
            className="focus-ring px-4 py-2 bg-transparent text-red-400 border border-red-400 rounded cursor-pointer font-bold transition-all duration-200"
          >
            Logout
          </button>
        </div>
      </nav>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
