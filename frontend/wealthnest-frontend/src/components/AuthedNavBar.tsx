import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AuthedNavBar() {
  const [fullName, setFullName] = useState<string | null>(null);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email;
      if (!email) return;
      const { data: userRow } = await supabase
        .from('users')
        .select('name')
        .eq('email', email)
        .maybeSingle();
      setFullName((userRow as any)?.name ?? null);
    };
    load();
  }, []);

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200" role="navigation" aria-label="Primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
        <div className="flex items-center gap-2">
          <Link to="/" aria-label="WealthNest home" className="flex items-center gap-2">
            <img src="/logo.png" alt="WealthNest logo" className="h-8 w-auto" />
            <span className="sr-only">WealthNest</span>
          </Link>
        </div>

        <button
          className="ml-3 inline-flex md:hidden items-center justify-center h-9 w-9 rounded-md border border-slate-300 bg-white text-slate-700 focus:ring-2 focus:ring-teal-500"
          aria-label="Open menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor"><path d="M3 6h14M3 10h14M3 14h14" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>

        <div className="ml-6 hidden md:flex items-center gap-6">
          <NavLink
            to="/dashboard"
            aria-label="Dashboard"
            className={({ isActive }) =>
              `text-slate-700 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-md px-2 py-1 border-b-2 ${
                isActive ? 'text-teal-600 border-teal-600' : 'border-transparent'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/portfolio"
            aria-label="Portfolio"
            className={({ isActive }) =>
              `text-slate-700 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-md px-2 py-1 border-b-2 ${
                isActive ? 'text-teal-600 border-teal-600' : 'border-transparent'
              }`
            }
          >
            Portfolio
          </NavLink>
          <NavLink
            to="/wallet"
            aria-label="Wallet"
            className={({ isActive }) =>
              `text-slate-700 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-md px-2 py-1 border-b-2 ${
                isActive ? 'text-teal-600 border-teal-600' : 'border-transparent'
              }`
            }
          >
            Wallet
          </NavLink>
          <NavLink
            to="/stocks"
            aria-label="Stocks"
            className={({ isActive }) =>
              `text-slate-700 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-md px-2 py-1 border-b-2 ${
                isActive ? 'text-teal-600 border-teal-600' : 'border-transparent'
              }`
            }
          >
            Stocks
          </NavLink>
          <NavLink
            to="/mutual-funds"
            aria-label="Mutual Funds"
            className={({ isActive }) =>
              `text-slate-700 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-md px-2 py-1 border-b-2 ${
                isActive ? 'text-teal-600 border-teal-600' : 'border-transparent'
              }`
            }
          >
            Mutual Funds
          </NavLink>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-1.5 pr-2 py-1 h-9 rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
            >
              <svg className="h-4 w-4 text-slate-600" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 19.5c1.8-3.2 5-4.5 7-4.5s5.2 1.3 7 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline text-slate-700 text-sm max-w-[120px] truncate">{fullName ?? 'Account'}</span>
              <svg className="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-lg p-1">
                <Link to="/profile" className="block px-3 py-2 text-sm rounded-md hover:bg-slate-50 focus:bg-slate-50" role="menuitem">Profile</Link>
                <button onClick={onLogout} className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50 focus:bg-slate-50" role="menuitem">Log Out</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-2 flex flex-col gap-1">
            <NavLink to="/dashboard" onClick={() => setMobileOpen(false)} className={({isActive}) => `block px-2 py-2 rounded-md ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-50'}`}>Dashboard</NavLink>
            <NavLink to="/portfolio" onClick={() => setMobileOpen(false)} className={({isActive}) => `block px-2 py-2 rounded-md ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-50'}`}>Portfolio</NavLink>
            <NavLink to="/wallet" onClick={() => setMobileOpen(false)} className={({isActive}) => `block px-2 py-2 rounded-md ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-50'}`}>Wallet</NavLink>
            <NavLink to="/stocks" onClick={() => setMobileOpen(false)} className={({isActive}) => `block px-2 py-2 rounded-md ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-50'}`}>Stocks</NavLink>
            <NavLink to="/mutual-funds" onClick={() => setMobileOpen(false)} className={({isActive}) => `block px-2 py-2 rounded-md ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-700 hover:bg-slate-50'}`}>Mutual Funds</NavLink>
          </div>
        </div>
      )}
    </nav>
  );
}
