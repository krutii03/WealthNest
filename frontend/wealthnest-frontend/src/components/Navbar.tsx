import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/home" className="font-semibold text-xl text-blue-600">WealthNest</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/markets" className="hover:text-blue-600">Markets</Link>
          <Link to="/mutual-funds" className="hover:text-blue-600">Mutual Funds</Link>
          <Link to="/calculators" className="hover:text-blue-600">Calculators</Link>
          <Link to="/login" className="px-3 py-1 rounded bg-blue-600 text-white">Login</Link>
        </div>
      </div>
    </nav>
  );
}
