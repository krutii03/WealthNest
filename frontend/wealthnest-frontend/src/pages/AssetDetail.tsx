import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AssetDetail() {
  const { id } = useParams();
  const [asset, setAsset] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('assets').select('*').eq('asset_id', id).maybeSingle();
      setAsset(data || null);
    };
    load();
  }, [id]);

  if (!asset) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">{asset.name} ({asset.symbol})</h1>
      <p className="text-slate-600 mt-1">Type: {asset.type}</p>
      <p className="text-slate-800 mt-2 text-lg">Price: ₹{asset.current_price}</p>
      {/* TODO: Price chart (recharts). Generate synthetic 30-day snapshots when missing. */}
    </div>
  );
}
