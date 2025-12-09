import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Transaction } from '../types';
import CsvExport from '../components/CsvExport';

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [type, setType] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from('Transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      setTxns((data as any) || []);
    };
    load();
  }, []);

  const filtered = useMemo(() => (type === 'all' ? txns : txns.filter(t => t.transaction_type === type)), [txns, type]);

  return (
    <div className="card">
      <h2>Transactions</h2>
      <div className="grid">
        <label>Type
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="all">All</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
            <option value="deposit">Deposit</option>
            <option value="withdraw">Withdraw</option>
          </select>
        </label>
      </div>
      <div className="table" role="table">
        <div className="table-header" role="row">
          <div role="columnheader">Type</div>
          <div role="columnheader">Amount</div>
          <div role="columnheader">Qty</div>
          <div role="columnheader">Status</div>
          <div role="columnheader">Date</div>
        </div>
        {filtered.map(t => (
          <div className="table-row" role="row" key={t.transaction_id}>
            <div role="cell">{t.transaction_type}</div>
            <div role="cell">{t.amount}</div>
            <div role="cell">{t.quantity ?? '-'}</div>
            <div role="cell">{t.status}</div>
            <div role="cell">{t.created_at}</div>
          </div>
        ))}
      </div>
      <CsvExport filename="transactions.csv" rows={filtered as any} />
    </div>
  );
}
