import { Router } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { updateAssetPrices } from '../services/priceSimulator';

const router = Router();

// Seed assets endpoint (for initial setup)
router.post('/seed', async (req, res) => {
  try {
    const staticAssets = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        current_price: 175.34
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        current_price: 315.76
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        current_price: 135.45
      },
      {
        symbol: 'AMZN',
        name: 'Amazon.com, Inc.',
        current_price: 145.67
      },
      {
        symbol: 'TSLA',
        name: 'Tesla, Inc.',
        current_price: 210.45
      }
    ];

    // Use admin client if available, otherwise regular client
    const clientToUse = supabaseAdmin || supabase;
    
    // Check which assets already exist
    const { data: existingAssets } = await clientToUse
      .from('assets')
      .select('symbol');
    
    const existingSymbols = new Set((existingAssets || []).map(a => a.symbol));
    const assetsToInsert = staticAssets.filter(a => !existingSymbols.has(a.symbol));

    if (assetsToInsert.length === 0) {
      return res.json({ message: 'All assets already exist', created: 0 });
    }

    // Insert missing assets
    const { data, error } = await clientToUse
      .from('assets')
      .insert(assetsToInsert)
      .select();

    if (error) {
      console.error('Error seeding assets:', error);
      return res.status(500).json({ 
        error: `Failed to seed assets: ${error.message}. Make sure SUPABASE_SERVICE_ROLE_KEY is set if RLS is enabled.` 
      });
    }

    res.json({ 
      message: `Successfully seeded ${assetsToInsert.length} assets`,
      created: assetsToInsert.length,
      assets: data
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger price update (for testing or manual refresh)
router.post('/update-prices', async (req, res) => {
  try {
    const result = await updateAssetPrices();
    
    if (result.errors.length > 0) {
      return res.status(207).json({ // 207 Multi-Status for partial success
        message: `Price update completed with some errors`,
        updated: result.updated,
        errors: result.errors
      });
    }

    res.json({
      message: `Successfully updated ${result.updated} asset prices`,
      updated: result.updated
    });
  } catch (error: any) {
    console.error('Error triggering price update:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all assets (stocks, etc.)
router.get('/', async (req, res) => {
  try {
    // Try to fetch from database first
    const clientToUse = supabaseAdmin || supabase;
    
    if (clientToUse) {
      const { data: dbAssets, error: dbError } = await clientToUse
        .from('assets')
        .select('*')
        .order('symbol', { ascending: true });
      
      if (!dbError && dbAssets && dbAssets.length > 0) {
        // Return database assets with proper formatting
        const formattedAssets = dbAssets.map((asset: any) => {
          const currentPrice = parseFloat(asset.current_price || 0);
          
          // Calculate change_percent on-the-fly if column doesn't exist
          // For now, we'll default to 0 since we don't have historical data
          // In a real app, you'd compare with previous day's price or store change_percent
          let changePercent = 0;
          if (asset.change_percent !== null && asset.change_percent !== undefined) {
            changePercent = parseFloat(asset.change_percent) || 0;
          }
          
          return {
            asset_id: asset.asset_id,
            symbol: asset.symbol,
            name: asset.name,
            asset_type: asset.asset_type || 'stock',
            current_price: currentPrice,
            change_percent: changePercent, // Will be 0 if column doesn't exist or is null
            market_cap: asset.market_cap || 0,
            sector: asset.sector || 'Unknown'
          };
        });
        
        return res.json(formattedAssets);
      }
    }

    // Fallback to static data if database query fails or returns empty
    const staticAssets = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        asset_type: 'stock',
        current_price: 175.34,
        change_percent: 1.23,
        market_cap: 2750000000000,
        sector: 'Technology'
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        asset_type: 'stock',
        current_price: 315.76,
        change_percent: 0.87,
        market_cap: 2350000000000,
        sector: 'Technology'
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        asset_type: 'stock',
        current_price: 135.45,
        change_percent: -0.34,
        market_cap: 1750000000000,
        sector: 'Technology'
      },
      {
        symbol: 'AMZN',
        name: 'Amazon.com, Inc.',
        asset_type: 'stock',
        current_price: 145.67,
        change_percent: 2.15,
        market_cap: 1500000000000,
        sector: 'Consumer Cyclical'
      },
      {
        symbol: 'TSLA',
        name: 'Tesla, Inc.',
        asset_type: 'stock',
        current_price: 210.45,
        change_percent: -1.23,
        market_cap: 670000000000,
        sector: 'Consumer Cyclical'
      }
    ];

    res.json(staticAssets);
  } catch (error: any) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Seed assets endpoint (MUST come before /:symbol route)
router.post('/seed', async (req, res) => {
  try {
    const staticAssets = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        current_price: 175.34
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        current_price: 315.76
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        current_price: 135.45
      },
      {
        symbol: 'AMZN',
        name: 'Amazon.com, Inc.',
        current_price: 145.67
      },
      {
        symbol: 'TSLA',
        name: 'Tesla, Inc.',
        current_price: 210.45
      }
    ];

    // Use admin client if available, otherwise regular client
    const clientToUse = supabaseAdmin || supabase;
    
    // Check which assets already exist
    const { data: existingAssets } = await clientToUse
      .from('assets')
      .select('symbol');
    
    const existingSymbols = new Set((existingAssets || []).map(a => a.symbol));
    const assetsToInsert = staticAssets.filter(a => !existingSymbols.has(a.symbol));

    if (assetsToInsert.length === 0) {
      return res.json({ message: 'All assets already exist', created: 0 });
    }

    // Insert missing assets
    const { data, error } = await clientToUse
      .from('assets')
      .insert(assetsToInsert)
      .select();

    if (error) {
      console.error('Error seeding assets:', error);
      return res.status(500).json({ 
        error: `Failed to seed assets: ${error.message}. Make sure SUPABASE_SERVICE_ROLE_KEY is set if RLS is enabled.` 
      });
    }

    res.json({ 
      message: `Successfully seeded ${assetsToInsert.length} assets`,
      created: assetsToInsert.length,
      assets: data
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get asset details by symbol
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // In a real app, this would fetch from a database or API
    const assets = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        current_price: 175.34,
        change_percent: 1.23,
        high: 176.50,
        low: 173.20,
        open: 174.50,
        volume: 75000000,
        market_cap: 2750000000000,
        pe_ratio: 29.8,
        dividend_yield: 0.5,
        sector: 'Technology',
        about: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.'
      },
      // Add more static data for other symbols as needed
    ];

    const asset = assets.find(a => a.symbol === symbol.toUpperCase());
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(asset);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get historical data for an asset
router.get('/:symbol/history', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1d', range = '1mo' } = req.query;
    
    // Generate some mock historical data
    const generateMockData = () => {
      const data = [];
      let price = 170 + Math.random() * 10; // Start with a random price around 170
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Random price movement
        price = price * (1 + (Math.random() * 0.02 - 0.01));
        const open = price * (0.99 + Math.random() * 0.02);
        const high = Math.max(open, price) * (1 + Math.random() * 0.01);
        const low = Math.min(open, price) * (0.99 - Math.random() * 0.01);
        const close = price;
        
        data.push({
          date: date.toISOString().split('T')[0],
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume: Math.floor(1000000 + Math.random() * 5000000)
        });
      }
      
      return data;
    };

    res.json(generateMockData());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
