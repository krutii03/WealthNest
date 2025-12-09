import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="wn-header" role="banner">
      <div className="wn-container flex items-center justify-between py-3">
        {/* Brand */}
        <Link to="/" aria-label="WealthNest home" className="flex items-center gap-1">
          <img
            src="/logo.png"
            alt="WealthNest logo icon"
            className="h-8 w-auto"
            loading="eager"
          />
          <img
            src="/WealthNest%20png.png"
            alt="WealthNest wordmark"
            className="h-6 w-auto"
            loading="eager"
          />
        </Link>

        {/* Center Nav removed as requested */}

        {/* Right: Auth only (minimal header) - Hide if authenticated */}
        {!isAuthenticated && (
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Login</Link>
            <Link to="/signup" className="inline-flex items-center justify-center rounded-md bg-emerald-500 hover:bg-emerald-600 text-white hover:text-white px-3 py-1.5 text-sm">Sign Up</Link>
          </div>
        )}
        {isAuthenticated && (
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="hidden sm:inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">Dashboard</Link>
          </div>
        )}
      </div>
      {/* Mega panels removed */}
    </header>
  );
}

