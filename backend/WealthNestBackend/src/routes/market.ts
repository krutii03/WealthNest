import { Router } from 'express';
import { getWordOfTheDay, financialTerms } from '../data/financialTerms';

const router = Router();

/**
 * GET /api/market/word-of-the-day
 * Returns a financial term from local database that rotates daily
 */
router.get('/word-of-the-day', async (req, res) => {
  try {
    // Get word of the day from local database (rotates daily based on day of year)
    const wordOfTheDay = getWordOfTheDay();
    
    // Transform to include description
    const response = {
      term: wordOfTheDay.term,
      definition: wordOfTheDay.definition,
      description: wordOfTheDay.description || wordOfTheDay.example,
      category: wordOfTheDay.category
    };
    
    res.json(response);
  } catch (error: any) {
    console.error('Error getting word of the day:', error);
    // Fallback to first term
    res.json({
      term: 'Equity',
      definition: 'Ownership interest in a company.',
      category: 'Stocks'
    });
  }
});

/**
 * GET /api/market/buzz
 * Fetches market news from Finnhub API
 */
router.get('/buzz', async (req, res) => {
  try {
    const apiKey = process.env.FINNHUB_API_KEY;
    
    // If no API key, return static fallback data
    if (!apiKey) {
      console.warn('FINNHUB_API_KEY not configured, using static data');
      return res.json({ 
        items: [
          {
            title: 'Tech stocks rally on AI optimism',
            source: 'Market Watch',
            sentiment: 'Positive',
            time: new Date().toISOString(),
            url: '#'
          },
          {
            title: 'Federal Reserve maintains interest rates',
            source: 'Economic Times',
            sentiment: 'Neutral',
            time: new Date(Date.now() - 3600000).toISOString(),
            url: '#'
          },
          {
            title: 'Emerging markets show strong growth potential',
            source: 'Bloomberg',
            sentiment: 'Positive',
            time: new Date(Date.now() - 7200000).toISOString(),
            url: '#'
          }
        ]
      });
    }

    // Fetch general market news from Finnhub
    const category = (req.query.category as string) || 'general';
    const finnhubUrl = `https://finnhub.io/api/v1/news?category=${category}&token=${apiKey}`;
    
    const response = await fetch(finnhubUrl);
    
    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status} ${response.statusText}`);
      // Return fallback data instead of error
      return res.json({ 
        items: [
          {
            title: 'Market update: Stay informed with latest trends',
            source: 'WealthNest',
            sentiment: 'General',
            time: new Date().toISOString(),
            url: '#'
          }
        ]
      });
    }

    const data = await response.json();
    
    // Transform Finnhub news format to our MarketBuzzItem format
    const items = (data || []).slice(0, 10).map((item: any) => ({
      title: item.headline || item.summary || 'No title',
      source: item.source || 'Unknown',
      sentiment: item.category || 'General',
      time: new Date(item.datetime * 1000).toISOString(), // Finnhub uses Unix timestamp
      url: item.url || '#'
    }));

    res.json({ items });
  } catch (error: any) {
    console.error('Error fetching market buzz:', error);
    // Return fallback data instead of error
    res.json({ 
      items: [
        {
          title: 'Market News - Check back later for updates',
          source: 'WealthNest',
          sentiment: 'General',
          time: new Date().toISOString(),
          url: '#'
        }
      ]
    });
  }
});

export default router;

