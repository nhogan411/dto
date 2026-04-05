import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { registerThunk } from '../store/slices/authSlice';
import { usePageTitle } from '../hooks/usePageTitle';

export default function RegisterPage() {
  usePageTitle('Register');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const status = useAppSelector((state) => state.auth.status);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setErrors([]);

    if (password !== confirmPassword) {
      setErrors(['Passwords do not match']);
      return;
    }

    try {
      await dispatch(registerThunk({ email, username, password })).unwrap();
      navigate('/');
    } catch (err: unknown) {
      const e = err as { errors?: string[]; message?: string } | null;
      if (e?.errors && Array.isArray(e.errors)) {
        setErrors(e.errors);
      } else if (e?.message) {
        setErrors([e.message]);
      } else {
        setErrors(['An unknown error occurred']);
      }
    }
  };

  const hasErrors = errors.length > 0;

  return (
    <main className="flex min-h-screen bg-neutral-950 text-white font-sans justify-center items-center p-4">
      <div className="bg-neutral-900 p-8 rounded-lg w-full max-w-[400px] shadow-lg border border-neutral-800">
        <h1 className="text-center text-[var(--team-green)] mb-6 text-3xl font-bold mt-0">DTO Register</h1>
        
        {hasErrors && (
          <div 
            id="register-errors"
            className="bg-red-500/10 text-red-400 p-3 rounded mb-4 border border-red-500/50 text-sm"
            role="alert"
          >
            <ul className="m-0 pl-5">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
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
              aria-invalid={hasErrors}
              aria-describedby={hasErrors ? "register-errors" : undefined}
              className={`w-full p-3 rounded border bg-neutral-800 text-white box-border focus-ring transition-colors ${
                hasErrors ? 'border-red-500' : 'border-neutral-700'
              }`}
            />
          </div>

          <div>
            <label htmlFor="username" className="block mb-2 text-sm font-medium text-neutral-200">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              aria-invalid={hasErrors}
              aria-describedby={hasErrors ? "register-errors" : undefined}
              className={`w-full p-3 rounded border bg-neutral-800 text-white box-border focus-ring transition-colors ${
                hasErrors ? 'border-red-500' : 'border-neutral-700'
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
              aria-invalid={hasErrors}
              aria-describedby={hasErrors ? "register-errors" : undefined}
              className={`w-full p-3 rounded border bg-neutral-800 text-white box-border focus-ring transition-colors ${
                hasErrors ? 'border-red-500' : 'border-neutral-700'
              }`}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-neutral-200">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              aria-invalid={hasErrors}
              aria-describedby={hasErrors ? "register-errors" : undefined}
              className={`w-full p-3 rounded border bg-neutral-800 text-white box-border focus-ring transition-colors ${
                hasErrors ? 'border-red-500' : 'border-neutral-700'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="mt-2 p-3 bg-[var(--team-green)] text-neutral-950 border-none rounded font-bold cursor-pointer focus-ring transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-neutral-300">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 no-underline hover:underline focus-ring rounded px-1">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
