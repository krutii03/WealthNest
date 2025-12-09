import { Outlet } from 'react-router-dom';
import Header from '../Header';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
