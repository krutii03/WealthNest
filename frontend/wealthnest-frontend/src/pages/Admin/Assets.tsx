import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface Asset {
  asset_id: string;
  asset_type: string;
  symbol: string;
  name: string;
  current_price: number;
}

export default function AdminAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    asset_type: '',
    symbol: '',
    name: '',
    current_price: '',
  });

  useEffect(() => {
    loadAssets();
  }, [page]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
      });

      const response = await fetch(`/api/admin/assets?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load assets');

      const data = await response.json();
      setAssets(data.assets || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/assets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          current_price: parseFloat(formData.current_price),
        }),
      });

      if (!response.ok) throw new Error('Failed to create asset');

      setShowCreateModal(false);
      setFormData({ asset_type: '', symbol: '', name: '', current_price: '' });
      setPage(1); // Reset to first page
      await loadAssets();
    } catch (error) {
      alert('Failed to create asset');
    }
  };

  const handleUpdate = async () => {
    if (!editingAsset) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/assets/${editingAsset.asset_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_price: parseFloat(formData.current_price),
        }),
      });

      if (!response.ok) throw new Error('Failed to update asset');

      setEditingAsset(null);
      setFormData({ asset_type: '', symbol: '', name: '', current_price: '' });
      await loadAssets();
    } catch (error) {
      alert('Failed to update asset');
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/assets/${assetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete asset');

      await loadAssets();
    } catch (error) {
      alert('Failed to delete asset');
    }
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Assets</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-white"
        >
          Create Asset
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="spinner" aria-label="loading" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {assets.map((asset) => (
                <tr key={asset.asset_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{asset.symbol}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{asset.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{asset.asset_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">₹{asset.current_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => {
                        setEditingAsset(asset);
                        setFormData({ ...formData, current_price: asset.current_price.toString() });
                      }}
                      className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(asset.asset_id)}
                      className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-white"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && (
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
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create Asset</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Asset Type"
                value={formData.asset_type}
                onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
              />
              <input
                type="text"
                placeholder="Symbol"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
              />
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
              />
              <input
                type="number"
                placeholder="Current Price"
                value={formData.current_price}
                onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
              />
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-white"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ asset_type: '', symbol: '', name: '', current_price: '' });
                }}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Edit Asset Price</h2>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Current Price"
                value={formData.current_price}
                onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
              />
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-white"
              >
                Update
              </button>
              <button
                onClick={() => {
                  setEditingAsset(null);
                  setFormData({ asset_type: '', symbol: '', name: '', current_price: '' });
                }}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

