import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface AuditLog {
  id: string;
  type: 'audit' | 'login';
  admin_id: string | null;
  action: string;
  details: string | null;
  timestamp: string;
  email?: string;
  ip_address?: string;
  user_agent?: string;
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      const url = `/api/admin/audit-logs?${params}`;
      console.log('Fetching audit logs from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Failed to load audit logs: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Use console.warn to ensure visibility even with filters
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setLogs([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Audit Logs</h1>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="spinner" aria-label="loading" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
          <p className="text-slate-600">No audit logs found. Audit logs will appear here when admins perform actions.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {log.details ? (
                        <pre className="whitespace-pre-wrap text-xs">{log.details}</pre>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                      {log.ip_address && (
                        <div className="mt-1 text-xs text-slate-400">
                          IP: {log.ip_address}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-slate-300 disabled:opacity-50 bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500 text-white"
            >
              Previous
            </button>
            <span className="px-4 py-2 flex items-center">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-slate-300 disabled:opacity-50 bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500 text-white"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

