import { Outlet } from 'react-router-dom';
import AuthedNavBar from '../AuthedNavBar';

export default function ProtectedLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AuthedNavBar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
