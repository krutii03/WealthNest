import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalUsers: number;
  bannedUsers: number;
  pendingTransactions: number;
  systemFunds: number;
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminReports() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [transactionStats, setTransactionStats] = useState<any[]>([]);
  const [assetDistribution, setAssetDistribution] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Load dashboard stats
      const statsRes = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Load user growth data (last 30 days)
      const userGrowthRes = await fetch('/api/admin/users?limit=1000', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (userGrowthRes.ok) {
        const usersData = await userGrowthRes.json();
        const users = usersData.users || [];
        
        // Group by date
        const growthMap = new Map<string, number>();
        users.forEach((user: any) => {
          if (user.created_at) {
            const date = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            growthMap.set(date, (growthMap.get(date) || 0) + 1);
          }
        });
        
        let cumulative = 0;
        const growthData = Array.from(growthMap.entries())
          .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
          .map(([date, count]) => {
            cumulative += count;
            return { date, count, cumulative };
          })
          .slice(-30); // Last 30 days
        
        setUserGrowth(growthData);
      }

      // Load transaction stats
      const txRes = await fetch('/api/admin/transactions?limit=1000', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (txRes.ok) {
        const txData = await txRes.json();
        const transactions = txData.transactions || [];
        
        // Group by status
        const statusCounts = transactions.reduce((acc: any, tx: any) => {
          acc[tx.status] = (acc[tx.status] || 0) + 1;
          return acc;
        }, {});
        
        const stats = [
          { name: 'Completed', value: statusCounts.completed || 0 },
          { name: 'Pending', value: statusCounts.pending || 0 },
          { name: 'Failed', value: statusCounts.failed || 0 },
        ];
        setTransactionStats(stats);
      }

      // Load asset distribution
      const assetsRes = await fetch('/api/admin/assets', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        const assets = assetsData.assets || [];
        
        // Group by asset type
        const typeCounts = assets.reduce((acc: any, asset: any) => {
          acc[asset.asset_type] = (acc[asset.asset_type] || 0) + 1;
          return acc;
        }, {});
        
        setAssetDistribution(
          Object.entries(typeCounts).map(([name, value]) => ({ name, value }))
        );
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-1">Total Users</p>
            <p className="text-3xl font-bold text-slate-900">{stats.totalUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-1">Banned Users</p>
            <p className="text-3xl font-bold text-red-600">{stats.bannedUsers}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-1">Pending Transactions</p>
            <p className="text-3xl font-bold text-amber-600">{stats.pendingTransactions}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <p className="text-sm text-slate-600 mb-1">System Funds</p>
            <p className="text-3xl font-bold text-emerald-600">
              ₹{stats.systemFunds.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* User Growth Chart */}
        {userGrowth.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">User Growth (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cumulative" stroke="#0ea5e9" strokeWidth={2} name="Total Users" />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} name="New Users" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Transaction Status Distribution */}
        {transactionStats.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Transaction Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={transactionStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {transactionStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Asset Distribution */}
        {assetDistribution.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Asset Distribution by Type</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={assetDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Transaction Volume Over Time */}
        {transactionStats.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Transaction Volume by Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transactionStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  );
}
