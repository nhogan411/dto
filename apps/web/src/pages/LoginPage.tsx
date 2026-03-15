import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginThunk } from '../store/slices/authSlice';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const status = useAppSelector((state) => state.auth.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await dispatch(loginThunk({ email, password })).unwrap();
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#121212',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: '#1e1e1e',
        padding: '2rem',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        border: '1px solid #333'
      }}>
        <h1 style={{ textAlign: 'center', color: '#4ade80', marginBottom: '1.5rem' }}>DTO Login</h1>
        
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #ef4444',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #333',
                backgroundColor: '#2a2a2a',
                color: 'white',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #333',
                backgroundColor: '#2a2a2a',
                color: 'white',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              backgroundColor: status === 'loading' ? '#22c55e88' : '#22c55e',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {status === 'loading' ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#a3a3a3' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#4ade80', textDecoration: 'none' }}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
