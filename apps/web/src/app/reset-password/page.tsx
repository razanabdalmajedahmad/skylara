'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await apiPost<{ success: boolean; message: string; error?: string }>(
        '/auth/reset-password',
        { token, password }
      );

      if (response.success) {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setError(response.error || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-5 sm:p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-900 dark:text-white mb-2">SkyLara</h1>
            <p className="text-gray-600 dark:text-gray-400">Set New Password</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {success ? (
            <div>
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg">
                Password reset successfully! Redirecting to login...
              </div>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold">
                  Go to Login
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!searchParams.get('token') && (
                <div>
                  <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reset Token
                  </label>
                  <input
                    id="token"
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:placeholder-gray-400"
                    placeholder="Paste your reset token"
                  />
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:placeholder-gray-400"
                  placeholder="Min. 8 characters"
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:placeholder-gray-400"
                  placeholder="Re-enter password"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-600 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold">
                  Back to Login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
