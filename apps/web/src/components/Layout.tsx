import { Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearCredentials } from '../store/slices/authSlice';

export default function Layout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#fff', fontFamily: 'sans-serif' }}>
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '1rem 2rem', 
        backgroundColor: '#1e1e1e',
        borderBottom: '1px solid #333' 
      }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#4ade80' }}>
          DTO
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {user && <span style={{ color: '#a3a3a3' }}>{user.username}</span>}
          <button 
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      <main style={{ padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}

