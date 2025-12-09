const ALPHA_VANTAGE_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY;

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  timestamp: number;
}

export async function fetchStockData(symbol: string, name: string): Promise<{
  current: StockQuote;
  history: { date: string; price: number }[];
}> {
  try {
    // Fetch time series data (includes both current and historical data)
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}&outputsize=compact`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stock data for ${symbol}`);
    }
    
    const data = await response.json();
    
    if (data['Error Message'] || data['Note']) {
      throw new Error(data['Error Message'] || 'API rate limit exceeded');
    }
    
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) {
      throw new Error('No time series data found in response');
    }
    
    // Get the most recent trading day
    const dates = Object.keys(timeSeries).sort().reverse();
    if (dates.length === 0) {
      throw new Error('No trading data available');
    }
    
    const latestDate = dates[0];
    const previousDate = dates[1] || latestDate;
    
    const latestData = timeSeries[latestDate];
    const previousData = timeSeries[previousDate];
    
    const currentPrice = parseFloat(latestData['4. close']);
    const previousClose = parseFloat(previousData['4. close']);
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;
    const high = parseFloat(latestData['2. high']);
    const low = parseFloat(latestData['3. low']);
    
    // Prepare history data (last 30 days)
    const history = dates.slice(0, 30).map(date => ({
      date,
      price: parseFloat(timeSeries[date]['4. close'])
    }));
    
    return {
      current: {
        symbol,
        name: name || symbol,
        price: currentPrice,
        change,
        change_percent: changePercent,
        timestamp: Date.now()
      },
      history: history.reverse() // Oldest first
    };
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error);
    throw error;
  }
}

export async function fetchMutualFundData(schemeCode: string): Promise<{
  nav: number;
  date: string;
  change: number;
  changePercent: number;
  history: { date: string; nav: number }[];
}> {
  try {
    // Fetch current NAV and history
    const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch mutual fund data for scheme ${schemeCode}`);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No data available for this mutual fund');
    }
    
    // Get the latest NAV (first item in the array)
    const latest = data.data[0];
    const previous = data.data[1] || latest; // In case there's only one data point
    
    const nav = parseFloat(latest.nav);
    const previousNav = parseFloat(previous.nav);
    const change = nav - previousNav;
    const changePercent = (change / previousNav) * 100;
    
    // Get last 30 days of history
    const history = data.data
      .slice(0, 30) // Get last 30 days
      .map((item: any) => ({
        date: item.date,
        nav: parseFloat(item.nav)
      }))
      .reverse(); // Reverse to show oldest first
    
    return {
      nav,
      date: latest.date,
      change,
      changePercent,
      history
    };
  } catch (error) {
    console.error(`Error fetching mutual fund data for scheme ${schemeCode}:`, error);
    throw error;
  }
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
