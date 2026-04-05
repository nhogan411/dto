import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginThunk } from '../store/slices/authSlice';
import { usePageTitle } from '../hooks/usePageTitle';

export default function LoginPage() {
  usePageTitle('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const status = useAppSelector((state) => state.auth.status);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    try {
      await dispatch(loginThunk({ email, password })).unwrap();
      navigate('/');
    } catch {
      setError('Invalid email or password');
    }
  };

  const isError = error !== null;

  return (
    <main className="flex min-h-screen bg-neutral-950 text-white font-sans justify-center items-center p-4">
      <div className="bg-neutral-900 p-8 rounded-lg w-full max-w-[400px] shadow-lg border border-neutral-800">
        <h1 className="text-center text-[var(--team-green)] mb-6 text-3xl font-bold mt-0">DTO Login</h1>
        
        {error && (
          <div 
            id="login-error"
            className="bg-red-500/10 text-red-400 p-3 rounded mb-4 border border-red-500/50 text-center"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-neutral-200">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={isError}
              aria-describedby={isError ? "login-error" : undefined}
              className={`w-full p-3 rounded border bg-neutral-800 text-white box-border focus-ring transition-colors ${
                isError ? 'border-red-500' : 'border-neutral-700'
              }`}
            />
          </div>

          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-neutral-200">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={isError}
              aria-describedby={isError ? "login-error" : undefined}
              className={`w-full p-3 rounded border bg-neutral-800 text-white box-border focus-ring transition-colors ${
                isError ? 'border-red-500' : 'border-neutral-700'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="mt-2 p-3 bg-[var(--team-green)] text-neutral-950 border-none rounded font-bold cursor-pointer focus-ring transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-neutral-300">
          Don't have an account?{' '}
          <Link to="/register" className="text-emerald-400 no-underline hover:underline focus-ring rounded px-1">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
