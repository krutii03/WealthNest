import type { Asset } from '../types';
import { formatCurrency } from '../utils/currency';

export default function AssetRow({ asset, onBuy }: { asset: Asset; onBuy: (a: Asset) => void }) {
  return (
    <div className="table-row" role="row">
      <div role="cell">{asset.symbol}</div>
      <div role="cell">{asset.name}</div>
      <div role="cell">{asset.asset_type}</div>
      <div role="cell">{formatCurrency(asset.current_price)}</div>
      <div role="cell"><button className="btn btn-blue" onClick={() => onBuy(asset)}>Buy</button></div>
    </div>
  );
}
