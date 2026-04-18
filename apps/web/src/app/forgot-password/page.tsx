'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiPost<{
        success: boolean;
        message: string;
        resetToken?: string;
      }>('/auth/forgot-password', { email });

      setSuccess(true);

      // In dev mode the API returns the token directly
      if (response.resetToken) {
        setResetToken(response.resetToken);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
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
            <p className="text-gray-600 dark:text-gray-400">Reset Your Password</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {success ? (
            <div>
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg">
                If that email is registered, a password reset link has been sent.
              </div>

              {resetToken && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Dev mode: Use this token to reset your password:
                  </p>
                  <button
                    onClick={() => router.push(`/reset-password?token=${resetToken}`)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                  >
                    Reset Password Now
                  </button>
                </div>
              )}

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold">
                  Back to Login
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:placeholder-gray-400"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-600 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Remember your password?{' '}
                <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold">
                  Log In
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
