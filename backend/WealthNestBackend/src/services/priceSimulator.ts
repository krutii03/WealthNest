import { supabaseAdmin, supabase } from '../config/supabase';

/**
 * Simulates realistic price changes for stocks and mutual funds
 * Prices change by -5% to +5% with slight bias toward current price
 */
function calculateNewPrice(currentPrice: number, assetType: 'stock' | 'mutual_fund'): number {
  // Stocks are more volatile (up to 5% change)
  // Mutual funds are less volatile (up to 2% change)
  const maxChange = assetType === 'stock' ? 0.05 : 0.02;
  
  // Random change between -maxChange and +maxChange
  // Slight bias to stay near current price (normal distribution)
  const randomChange = (Math.random() - 0.5) * 2 * maxChange;
  
  // Apply small momentum (tendency to continue in same direction)
  // But not too strong - let randomness dominate
  const newPrice = currentPrice * (1 + randomChange);
  
  // Ensure price doesn't go negative or too low
  return Math.max(0.01, newPrice);
}

/**
 * Updates prices for all assets in the database
 * Intelligently sets prices for assets with holdings to ensure a good mix of profit/loss
 */
export async function updateAssetPrices(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  try {
    // Use admin client to bypass RLS (required for updates)
    if (!supabaseAdmin) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not set - price updates will fail due to RLS');
      errors.push('SUPABASE_SERVICE_ROLE_KEY not configured. Price updates require admin access.');
      return { updated: 0, errors };
    }

    const client = supabaseAdmin;

    // Fetch all assets
    const { data: assets, error: fetchError } = await client
      .from('assets')
      .select('asset_id, symbol, name, current_price, asset_type');

    if (fetchError) {
      console.error('Error fetching assets:', fetchError);
      errors.push(`Failed to fetch assets: ${fetchError.message}`);
      return { updated: 0, errors };
    }

    if (!assets || assets.length === 0) {
      console.log('No assets found to update');
      return { updated: 0, errors: [] };
    }

    // Fetch all holdings to get average prices
    const { data: holdings, error: holdingsError } = await client
      .from('portfolio_holdings')
      .select('asset_id, average_price')
      .gt('average_price', 0);

    // Group holdings by asset_id to get average prices
    const assetAvgPrices = new Map<string, number>();
    if (holdings && !holdingsError) {
      holdings.forEach((holding: any) => {
        const assetId = holding.asset_id;
        if (!assetAvgPrices.has(assetId)) {
          assetAvgPrices.set(assetId, holding.average_price);
        }
      });
    }

    // Determine which assets with holdings should be in profit/loss
    // Goal: ~2/3 in profit, ~1/3 in loss (so if 6 holdings: 4 profit, 2 loss)
    const assetsWithHoldings = assets.filter(a => assetAvgPrices.has(a.asset_id));
    const profitLossAssignment: Map<string, 'profit' | 'loss'> = new Map();
    
    if (assetsWithHoldings.length > 0) {
      // Shuffle assets with holdings and assign profit/loss
      const shuffled = [...assetsWithHoldings].sort(() => Math.random() - 0.5);
      const numLoss = Math.max(1, Math.floor(assetsWithHoldings.length * 0.33)); // ~1/3 in loss, at least 1
      const numProfit = assetsWithHoldings.length - numLoss;
      
      shuffled.slice(0, numLoss).forEach(asset => {
        profitLossAssignment.set(asset.asset_id, 'loss');
      });
      shuffled.slice(numLoss).forEach(asset => {
        profitLossAssignment.set(asset.asset_id, 'profit');
      });
    }

    // Update each asset's price
    const updates = assets.map(async (asset) => {
      try {
        const currentPrice = asset.current_price || 0;
        
        if (currentPrice <= 0) {
          console.warn(`Skipping asset ${asset.symbol} - invalid price: ${currentPrice}`);
          return;
        }

        const assetType = (asset.asset_type as 'stock' | 'mutual_fund') || 'stock';
        let newPrice: number;

        // If asset has holdings, set price intelligently for profit/loss
        if (assetAvgPrices.has(asset.asset_id)) {
          const avgPrice = assetAvgPrices.get(asset.asset_id)!;
          const targetDirection = profitLossAssignment.get(asset.asset_id);
          
          if (targetDirection === 'profit') {
            // Set price 5-20% above average for profit
            const profitPercent = 0.05 + (Math.random() * 0.15); // 5% to 20%
            newPrice = avgPrice * (1 + profitPercent);
          } else {
            // Set price 1-5% below average for loss (smaller losses)
            const lossPercent = 0.01 + (Math.random() * 0.04); // 1% to 5%
            newPrice = avgPrice * (1 - lossPercent);
          }
        } else {
          // For assets without holdings, use random price change
          newPrice = calculateNewPrice(currentPrice, assetType);
        }

        // Ensure price doesn't go negative or too low
        newPrice = Math.max(0.01, newPrice);
        const changePercent = ((newPrice - currentPrice) / currentPrice) * 100;

        // Update asset price (only update change_percent if column exists)
        const updateData: any = {
          current_price: parseFloat(newPrice.toFixed(2)),
          updated_at: new Date().toISOString()
        };
        
        // Try to include change_percent, but don't fail if column doesn't exist
        // We'll calculate it on-the-fly in the API if needed
        try {
          // Attempt to update with change_percent - if column doesn't exist, it will be ignored
          updateData.change_percent = parseFloat(changePercent.toFixed(2));
        } catch (e) {
          // Column doesn't exist, skip it
        }

        const { error: updateError } = await client
          .from('assets')
          .update(updateData)
          .eq('asset_id', asset.asset_id);

        if (updateError) {
          // If error is about change_percent column, try without it
          if (updateError.message?.includes('change_percent')) {
            console.warn(`change_percent column doesn't exist for ${asset.symbol}, updating without it`);
            const { error: retryError } = await client
              .from('assets')
              .update({
                current_price: parseFloat(newPrice.toFixed(2)),
                updated_at: new Date().toISOString()
              })
              .eq('asset_id', asset.asset_id);
            
            if (retryError) {
              console.error(`Error updating ${asset.symbol}:`, retryError);
              errors.push(`${asset.symbol}: ${retryError.message}`);
            } else {
              updated++;
            }
          } else {
            console.error(`Error updating ${asset.symbol}:`, updateError);
            errors.push(`${asset.symbol}: ${updateError.message}`);
          }
        } else {
          updated++;
        }
      } catch (err: any) {
        console.error(`Error processing asset ${asset.symbol}:`, err);
        errors.push(`${asset.symbol}: ${err.message}`);
      }
    });

    await Promise.all(updates);

    return { updated, errors };
  } catch (error: any) {
    console.error('Fatal error in updateAssetPrices:', error);
    errors.push(`Fatal error: ${error.message}`);
    return { updated, errors };
  }
}

/**
 * Starts the price update scheduler (runs every 2 hours)
 * Set UPDATE_INTERVAL_HOURS environment variable to change interval (default: 2)
 */
export function startPriceScheduler(): void {
  const hours = parseInt(process.env.UPDATE_INTERVAL_HOURS || '2', 10);
  const intervalMs = hours * 60 * 60 * 1000;
  
  // Run immediately on startup (with a small delay to let server start)
  setTimeout(() => {
    updateAssetPrices()
      .then(result => {
        if (result.errors.length > 0) {
          console.warn(`⚠ Price update had errors:`, result.errors);
        }
      })
      .catch(err => {
        console.error('✗ Error in initial price update:', err);
      });
  }, 5000); // Wait 5 seconds after server starts

  // Then run every N hours
  setInterval(() => {
    updateAssetPrices()
      .then(result => {
        if (result.errors.length > 0) {
          console.warn(`⚠ Price update had errors:`, result.errors);
        }
      })
      .catch(err => {
        console.error('✗ Error in scheduled price update:', err);
      });
  }, intervalMs);
}

