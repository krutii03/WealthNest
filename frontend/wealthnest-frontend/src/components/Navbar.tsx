import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="w-full border-b bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link to="/home" className="font-semibold text-lg sm:text-xl text-blue-600">WealthNest</Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          <Link to="/markets" className="hover:text-blue-600 px-2 py-1 rounded touch-manipulation">Markets</Link>
          <Link to="/mutual-funds" className="hover:text-blue-600 px-2 py-1 rounded touch-manipulation">Mutual Funds</Link>
          <Link to="/calculators" className="hover:text-blue-600 px-2 py-1 rounded touch-manipulation">Calculators</Link>
          <Link to="/login" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 touch-manipulation">Login</Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 touch-manipulation"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="px-4 py-3 flex flex-col gap-2">
            <Link to="/markets" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 touch-manipulation">Markets</Link>
            <Link to="/mutual-funds" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 touch-manipulation">Mutual Funds</Link>
            <Link to="/calculators" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 touch-manipulation">Calculators</Link>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-center touch-manipulation">Login</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
