import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import App from './App';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import PublicLayout from './components/layouts/PublicLayout';
import ProtectedLayout from './components/layouts/ProtectedLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import StocksPage from './pages/Stocks';
import FundsPage from './pages/Funds';
import AssetDetail from './pages/AssetDetail';
import Contact from './pages/Contact';
import Policies from './pages/Policies';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/Profile';
import AssetsPage from './pages/Assets';
import PortfolioPage from './pages/Portfolio';
import WalletPage from './pages/Wallet';
import TransactionsPage from './pages/Transactions';
import CalculatorsPage from './pages/Calculators';
import LeaderboardPage from './pages/Leaderboard';
import SupportPage from './pages/Support';
import AdminIndex from './pages/Admin/index';
import AdminUsers from './pages/Admin/Users';
import AdminTransactions from './pages/Admin/Transactions';
import AdminAssets from './pages/Admin/Assets';
import AdminAuditLogs from './pages/Admin/AuditLogs';
import AdminReports from './pages/Admin/Reports';
import AdminAdmins from './pages/Admin/Admins';
import LearnMore from './pages/LearnMore';
import Info from './pages/Info';
import WordDetail from './pages/WordDetail';
import FAQChatbot from './pages/FAQChatbot';
import MarketNewsPage from './pages/MarketNews';

import './index.css';
import './styles/styles.css';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        {
          element: <PublicLayout />,
          children: [
            { index: true, element: <Home /> },
            { path: 'home', element: <Home /> },
            { path: 'assets', element: <AssetsPage /> },
            { path: 'markets', element: <AssetsPage /> },
            
            { path: 'asset/:id', element: <AssetDetail /> },
            { path: 'about', element: <LearnMore /> },
            { path: 'learn-more', element: <LearnMore /> },
            { path: 'info', element: <Info /> },
            { path: 'contact', element: <Contact /> },
            { path: 'policies', element: <Policies /> },
            { path: 'calculators', element: <CalculatorsPage /> },
            { path: 'word-detail', element: <WordDetail /> },
            { path: 'faq', element: <FAQChatbot /> },
            { path: 'market-news', element: <MarketNewsPage /> },
            { path: 'login', element: <Login /> },
            { path: 'signup', element: <Signup /> },
          ],
        },
        {
          element: <PrivateRoute />,
          children: [
            {
              element: <ProtectedLayout />,
              children: [
                { path: 'dashboard', element: <Dashboard /> },
                { path: 'portfolio', element: <PortfolioPage /> },
                { path: 'wallet', element: <WalletPage /> },
                { path: 'stocks', element: <StocksPage /> },
                { path: 'mutual-funds', element: <FundsPage /> },
                { path: 'transactions', element: <TransactionsPage /> },
                { path: 'leaderboard', element: <LeaderboardPage /> },
                { path: 'support', element: <SupportPage /> },
                { path: 'profile', element: <ProfilePage /> },
              ],
            },
            {
              element: <AdminRoute />,
              children: [
                {
                  element: <AdminLayout />,
                  children: [
                    { path: 'admin', element: <AdminIndex /> },
                    { path: 'admin/users', element: <AdminUsers /> },
                    { path: 'admin/transactions', element: <AdminTransactions /> },
                    { path: 'admin/assets', element: <AdminAssets /> },
                    { path: 'admin/audit-logs', element: <AdminAuditLogs /> },
                    { path: 'admin/reports', element: <AdminReports /> },
                    { path: 'admin/admins', element: <AdminAdmins /> },
                  ],
                },
              ],
            },
          ],
        },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ]
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider
      router={router}
      future={{
        v7_startTransition: true
      }}
    />
  </React.StrictMode>
);
