import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { registerThunk } from '../store/slices/authSlice';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const status = useAppSelector((state) => state.auth.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    try {
      await dispatch(registerThunk({ email, username, password })).unwrap();
      navigate('/');
    } catch (err: any) {
      if (err?.errors && Array.isArray(err.errors)) {
        setErrors(err.errors);
      } else if (err?.message) {
        setErrors([err.message]);
      } else {
        setErrors(['An unknown error occurred']);
      }
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
        <h1 style={{ textAlign: 'center', color: '#4ade80', marginBottom: '1.5rem' }}>DTO Register</h1>
        
        {errors.length > 0 && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #ef4444',
            fontSize: '0.875rem'
          }}>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
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
            <label htmlFor="username" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            {status === 'loading' ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#a3a3a3' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#4ade80', textDecoration: 'none' }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
