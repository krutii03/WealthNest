import type { Wallet } from '../types';
import { formatCurrency } from '../utils/currency';

export default function WalletCard({ wallet }: { wallet?: Wallet | null }) {
  return (
    <div className="card">
      <h3>Wallet</h3>
      {wallet ? (
        <>
          <div className="row"><span>Balance</span><strong>{formatCurrency(wallet.balance, wallet.currency)}</strong></div>
          <div className="row muted">Currency: {wallet.currency}</div>
          <div className="actions">
            <button className="btn btn-blue" aria-label="Add money">Add money (simulate)</button>
            <button className="btn" aria-label="Withdraw">Withdraw (simulate)</button>
          </div>
        </>
      ) : (
        <p className="muted">No wallet found</p>
      )}
    </div>
  );
}
