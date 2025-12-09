import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { ensurePublicUserExists } from '../utils/ensureUser';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // First, sign in with Supabase
      const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (supabaseError) {
        setError(supabaseError.message);
        setLoading(false);
        return;
      }

      if (!supabaseData?.session) {
        setError('Failed to create session');
        setLoading(false);
        return;
      }

      // Then call Express /api/auth/login to check admin status
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseData.session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed');
    setLoading(false);
        return;
      }

      const loginData = await response.json();

      // Ensure user profile exists after successful login
      if (!loginData.isAdmin) {
      setTimeout(async () => {
        await ensurePublicUserExists();
      }, 100);
      }

      // Route based on admin status
      if (loginData.isAdmin) {
        navigate('/admin');
      } else {
      navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 flex items-center justify-center px-4 overflow-hidden relative">
      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors z-10">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="text-sm font-medium">Back to Home</span>
      </Link>
      
      <div className="w-full max-w-md">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-200/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6 hover:shadow-2xl transition-shadow">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-sky-100 to-emerald-100 mb-3">
              <span className="text-2xl">🔐</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
              Welcome Back!
            </h1>
            <p className="text-sm text-slate-600">
              Sign in to continue your investment journey 📈
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <span>📧</span>
                  <span>Email</span>
                </span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all hover:border-sky-400"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <span>🔑</span>
                  <span>Password</span>
                </span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all hover:border-sky-400"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full group inline-flex items-center justify-center rounded-lg border border-transparent bg-sky-600 text-white px-6 py-3 font-medium hover:bg-sky-700 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-slate-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-sky-600 hover:text-sky-700 hover:underline">
                Sign up here
              </Link>
            </p>
          </div>

          {/* Fun footer hint */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-center text-slate-500">
              💡 Tip: Keep your credentials secure for safe investing!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
