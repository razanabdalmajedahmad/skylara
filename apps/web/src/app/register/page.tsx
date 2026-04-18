'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Eye, EyeOff, Check, X, Loader2, ShieldCheck } from 'lucide-react';
import { validatePasswordStrength } from '@/utils/passwordValidation';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const pwValidation = useMemo(
    () => validatePasswordStrength(password, email),
    [password, email]
  );

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const strengthColor: Record<string, string> = {
    weak: 'bg-red-500',
    fair: 'bg-orange-500',
    good: 'bg-yellow-500',
    strong: 'bg-blue-500',
    excellent: 'bg-emerald-500',
  };

  const strengthTextColor: Record<string, string> = {
    weak: 'text-red-600',
    fair: 'text-orange-600',
    good: 'text-yellow-600',
    strong: 'text-blue-600',
    excellent: 'text-emerald-600',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!pwValidation.valid) {
      setError(pwValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service');
      return;
    }

    setLoading(true);
    try {
      await register({ email, password, firstName, lastName });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Join SkyLara</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Create your account to start flying</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm dark:placeholder-gray-400"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm dark:placeholder-gray-400"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm dark:placeholder-gray-400"
                placeholder="you@example.com"
              />
            </div>

            {/* Password with toggle */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm dark:placeholder-gray-400"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Strength Meter */}
              {password.length > 0 && (
                <div className="mt-2">
                  {/* Bar */}
                  <div className="flex gap-1 mb-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all ${
                          pwValidation.score >= (i + 1) * 20
                            ? strengthColor[pwValidation.strength]
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold capitalize ${strengthTextColor[pwValidation.strength]}`}>
                      {pwValidation.strength}
                    </span>
                    <span className="text-xs text-gray-400">{pwValidation.score}/100</span>
                  </div>

                  {/* Rules checklist */}
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                    {pwValidation.rules.map((rule) => (
                      <div key={rule.id} className="flex items-center gap-1.5">
                        {rule.passed ? (
                          <Check size={12} className="text-emerald-500 flex-shrink-0" />
                        ) : (
                          <X size={12} className="text-gray-300 flex-shrink-0" />
                        )}
                        <span className={`text-xs ${rule.passed ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`w-full px-3 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-slate-700 dark:text-white dark:placeholder-gray-400 ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/20'
                        : 'border-red-300 bg-red-50/30 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="Repeat your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                I agree to the{' '}
                <a href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</a>{' '}
                and{' '}
                <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !pwValidation.valid || !passwordsMatch || !agreedToTerms}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
