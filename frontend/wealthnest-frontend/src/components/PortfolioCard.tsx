import type { Holding } from '../types';
import { formatCurrency } from '../utils/currency';

export default function PortfolioCard({ holdings }: { holdings: Holding[] }) {
  const totalValue = holdings.reduce((sum, h) => sum + (h.asset?.current_price ?? 0) * h.quantity, 0);
  return (
    <div className="card">
      <h3>Portfolio Snapshot</h3>
      <div className="row"><span>Total Value</span><strong>{formatCurrency(totalValue)}</strong></div>
      <p className="muted">Holdings: {holdings.length}</p>
    </div>
  );
}
