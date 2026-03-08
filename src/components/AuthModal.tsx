/**
 * AuthModal Component
 * Modal for login, signup, and password reset functionality
 */

import { useState, FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'signup' | 'reset';

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setError(null);
    setSuccessMessage(null);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === 'signup' && password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError.message || 'Failed to sign in');
        } else {
          onClose();
        }
      } else if (mode === 'signup') {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) {
          setError(signUpError.message || 'Failed to create account');
        } else {
          onClose();
        }
      } else if (mode === 'reset') {
        const { error: resetError } = await resetPassword(email);
        if (resetError) {
          setError(resetError.message || 'Failed to send reset email');
        } else {
          setSuccessMessage('Password reset email sent! Check your inbox.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-0">
          <h2 className="text-xl font-medium text-neutral-900">
            {mode === 'login' && 'Log in'}
            {mode === 'signup' && 'Sign up'}
            {mode === 'reset' && 'Reset password'}
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            {mode === 'login' && 'Welcome back to Dictate'}
            {mode === 'signup' && 'Create your account to get started'}
            {mode === 'reset' && 'Enter your email to receive a reset link'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          {/* Password field (not shown in reset mode) */}
          {mode !== 'reset' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>
          )}

          {/* Confirm password field (only in signup mode) */}
          {mode === 'signup' && (
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-neutral-700 mb-1">
                Confirm password
              </label>
              <input
                type="password"
                id="passwordConfirm"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                placeholder="Confirm your password"
                disabled={loading}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div className="text-emerald-600 text-sm bg-emerald-50 px-4 py-2 rounded-lg">
              {successMessage}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neutral-900 text-white rounded-lg py-3 font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' && 'Log in'}
            {mode === 'signup' && 'Create account'}
            {mode === 'reset' && 'Send reset link'}
          </button>

          {/* Forgot password link (only in login mode) */}
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => switchMode('reset')}
              className="w-full text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              disabled={loading}
            >
              Forgot password?
            </button>
          )}
        </form>

        {/* Toggle between login/signup */}
        {mode !== 'reset' && (
          <div className="px-6 pb-6 text-center">
            <p className="text-sm text-neutral-500">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="text-neutral-900 font-medium hover:underline"
                disabled={loading}
              >
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        )}

        {/* Back to login from reset */}
        {mode === 'reset' && (
          <div className="px-6 pb-6 text-center">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              disabled={loading}
            >
              Back to log in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
