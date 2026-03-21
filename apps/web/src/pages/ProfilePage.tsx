import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateUser } from '../store/slices/authSlice';
import { profileApi } from '../api/profileApi';
import { usePageTitle } from '../hooks/usePageTitle';

type ApiErrorResponse = {
  errors?: string[];
};

const getErrorMessages = (error: unknown) => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const messages = error.response?.data?.errors;

    if (Array.isArray(messages) && messages.length > 0) {
      return messages;
    }
  }

  if (error instanceof Error && error.message) {
    return [error.message];
  }

  return ['Something went wrong. Please try again.'];
};

export default function ProfilePage() {
  usePageTitle('Profile Settings');
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  
  const [emailErrors, setEmailErrors] = useState<string[]>([]);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);

  useEffect(() => {
    setEmail(user?.email ?? '');
  }, [user?.email]);

  const handleEmailSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailErrors([]);
    setEmailSuccess(null);
    setIsSavingEmail(true);

    try {
      const trimmedEmail = email.trim();

      await profileApi.updateProfile({ email: trimmedEmail });
      dispatch(updateUser({ email: trimmedEmail }));
      setEmailSuccess('Email updated successfully.');
    } catch (error) {
      setEmailErrors(getErrorMessages(error));
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handlePasswordSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordErrors([]);
    setPasswordSuccess(null);
    setIsSavingPassword(true);

    try {
      await profileApi.updateProfile({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });

      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      setPasswordSuccess('Password updated successfully.');
    } catch (error) {
      setPasswordErrors(getErrorMessages(error));
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen bg-neutral-950 p-8 items-center justify-center">
        <div className="mx-auto max-w-[600px] w-full rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-300 text-center" role="alert">
          Unable to load your profile.
        </div>
      </div>
    );
  }

  const hasEmailErrors = emailErrors.length > 0;
  const hasPasswordErrors = passwordErrors.length > 0;

  return (
    <div style={{ padding: '2rem' }} className="min-h-screen bg-neutral-950 p-8 text-white font-sans">
      <div className="mx-auto flex max-w-[800px] flex-col gap-8">
        <header className="space-y-2">
          <h1 className="m-0 text-3xl font-bold text-[var(--team-green)]">Profile Settings</h1>
          <p className="text-neutral-400 m-0">Update your email address or change your password.</p>
        </header>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-lg">
          <header className="mb-6">
            <h2 className="m-0 text-xl font-semibold text-white">Email</h2>
            <p className="mt-1 text-sm text-neutral-300 m-0">Your login email must stay unique and valid.</p>
          </header>

          {hasEmailErrors && (
            <div id="email-error" className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400" role="alert">
              <ul className="list-disc space-y-1 pl-5 m-0">
                {emailErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          {emailSuccess && (
            <div id="email-success" className="mb-6 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-400" role="alert">
              {emailSuccess}
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-email" className="text-sm font-medium text-neutral-200">
                Email address
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`focus-ring w-full rounded-md border bg-neutral-800 p-3 text-white transition-colors ${hasEmailErrors ? 'border-red-500' : 'border-neutral-700'}`}
                autoComplete="email"
                required
                disabled={isSavingEmail}
                aria-invalid={hasEmailErrors}
                aria-describedby={`email-helper ${hasEmailErrors ? 'email-error' : ''} ${emailSuccess ? 'email-success' : ''}`.trim()}
              />
              <p id="email-helper" className="text-xs text-neutral-300 m-0">
                This email is used for logging into your account.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingEmail || email.trim() === ''}
                className="focus-ring rounded-md border-none bg-[var(--team-blue)] px-6 py-2.5 font-bold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingEmail ? 'Saving...' : 'Update Email'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-lg">
          <header className="mb-6">
            <h2 className="m-0 text-xl font-semibold text-white">Password</h2>
            <p className="mt-1 text-sm text-neutral-300 m-0">Keep your account secure by updating your password.</p>
          </header>

          {hasPasswordErrors && (
            <div id="password-error" className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400" role="alert">
              <ul className="list-disc space-y-1 pl-5 m-0">
                {passwordErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          {passwordSuccess && (
            <div id="password-success" className="mb-6 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-400" role="alert">
              {passwordSuccess}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <fieldset className="space-y-6 border-none p-0 m-0">
              <div className="flex flex-col gap-2">
                <label htmlFor="current-password" className="text-sm font-medium text-neutral-200">
                  Current password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className={`focus-ring w-full rounded-md border bg-neutral-800 p-3 pr-20 text-white transition-colors ${hasPasswordErrors ? 'border-red-500' : 'border-neutral-700'}`}
                    autoComplete="current-password"
                    required
                    disabled={isSavingPassword}
                    aria-invalid={hasPasswordErrors}
                    aria-describedby={`current-password-helper ${hasPasswordErrors ? 'password-error' : ''} ${passwordSuccess ? 'password-success' : ''}`.trim()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 text-xs font-semibold text-neutral-300 hover:text-white focus-ring rounded p-1 bg-transparent border-none cursor-pointer"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    disabled={isSavingPassword}
                  >
                    {showCurrentPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <p id="current-password-helper" className="text-xs text-neutral-300 m-0">
                  Enter your current password to make changes.
                </p>
              </div>

              <div className="h-[1px] w-full bg-neutral-800 my-2"></div>

              <div className="flex flex-col gap-2">
                <label htmlFor="new-password" className="text-sm font-medium text-neutral-200">
                  New password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className={`focus-ring w-full rounded-md border bg-neutral-800 p-3 pr-20 text-white transition-colors ${hasPasswordErrors ? 'border-red-500' : 'border-neutral-700'}`}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    disabled={isSavingPassword}
                    aria-invalid={hasPasswordErrors}
                    aria-describedby={`new-password-helper ${hasPasswordErrors ? 'password-error' : ''} ${passwordSuccess ? 'password-success' : ''}`.trim()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 text-xs font-semibold text-neutral-300 hover:text-white focus-ring rounded p-1 bg-transparent border-none cursor-pointer"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    disabled={isSavingPassword}
                  >
                    {showNewPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <p id="new-password-helper" className="text-xs text-neutral-300 m-0">
                  Minimum 8 characters.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="new-password-confirmation" className="text-sm font-medium text-neutral-200">
                  Confirm new password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="new-password-confirmation"
                    type={showNewPasswordConfirm ? "text" : "password"}
                    value={newPasswordConfirmation}
                    onChange={(event) => setNewPasswordConfirmation(event.target.value)}
                    className={`focus-ring w-full rounded-md border bg-neutral-800 p-3 pr-20 text-white transition-colors ${hasPasswordErrors ? 'border-red-500' : 'border-neutral-700'}`}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    disabled={isSavingPassword}
                    aria-invalid={hasPasswordErrors}
                    aria-describedby={`confirm-password-helper ${hasPasswordErrors ? 'password-error' : ''} ${passwordSuccess ? 'password-success' : ''}`.trim()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPasswordConfirm((prev) => !prev)}
                    className="absolute right-3 text-xs font-semibold text-neutral-300 hover:text-white focus-ring rounded p-1 bg-transparent border-none cursor-pointer"
                    aria-label={showNewPasswordConfirm ? "Hide password" : "Show password"}
                    disabled={isSavingPassword}
                  >
                    {showNewPasswordConfirm ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <p id="confirm-password-helper" className="text-xs text-neutral-300 m-0">
                  Please confirm your new password.
                </p>
              </div>
            </fieldset>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={
                  isSavingPassword ||
                  currentPassword.trim() === '' ||
                  newPassword.trim() === '' ||
                  newPasswordConfirmation.trim() === ''
                }
                className="focus-ring rounded-md border-none bg-[var(--team-blue)] px-6 py-2.5 font-bold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingPassword ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
