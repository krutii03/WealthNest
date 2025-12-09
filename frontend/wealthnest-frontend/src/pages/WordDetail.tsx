import { useSearchParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

type WordOfTheDay = {
  word: string;
  definition: string;
  example: string;
  category?: string;
};

const financialTerms: Record<string, WordOfTheDay> = {
  'bull-market': {
    word: 'Bull Market',
    definition: 'A bull market is a market condition where prices are rising or are expected to rise. The term "bull market" is typically used to describe the stock market, but it can also be applied to anything that is traded, such as bonds, real estate, currencies, and commodities.',
    example: 'The S&P 500 has been in a bull market for the past decade, with prices consistently trending upward despite occasional pullbacks.',
    category: 'Trading'
  },
  'bear-market': {
    word: 'Bear Market',
    definition: 'A bear market is a market condition in which prices are falling, encouraging selling. A bear market is typically defined as a decline of 20% or more from recent highs. Bear markets are often accompanied by negative investor sentiment and pessimism about future market performance.',
    example: 'During the bear market of 2022, many investors shifted their portfolios towards defensive stocks and bonds.',
    category: 'Trading'
  },
  'sip': {
    word: 'SIP (Systematic Investment Plan)',
    definition: 'A Systematic Investment Plan (SIP) is an investment strategy that allows investors to invest a fixed amount in a mutual fund scheme at regular intervals (usually monthly or quarterly). SIPs help investors benefit from rupee cost averaging and the power of compounding.',
    example: 'By investing ₹5,000 every month through a SIP, Ravi was able to build a substantial corpus over 10 years despite market volatility.',
    category: 'Investment'
  },
  'mutual-fund': {
    word: 'Mutual Fund',
    definition: 'A mutual fund is a professionally managed investment fund that pools money from many investors to purchase securities such as stocks, bonds, and other assets. Mutual funds offer diversification, professional management, and accessibility to retail investors.',
    example: 'The equity mutual fund invested in a diversified portfolio of 50 stocks across various sectors.',
    category: 'Investment'
  },
  'dividend': {
    word: 'Dividend',
    definition: 'A dividend is a payment made by a corporation to its shareholders, usually in the form of cash or additional shares. Dividends are typically paid from a company\'s profits and are distributed on a regular basis (quarterly, semi-annually, or annually).',
    example: 'The company declared a dividend of ₹5 per share, which will be paid to all shareholders on record.',
    category: 'Corporate Finance'
  },
  'portfolio': {
    word: 'Portfolio',
    definition: 'A portfolio is a collection of investments held by an individual or institution. A well-diversified portfolio typically includes various asset classes such as stocks, bonds, mutual funds, and other securities to manage risk and optimize returns.',
    example: 'Her investment portfolio consisted of 60% stocks, 30% bonds, and 10% real estate investment trusts.',
    category: 'Investment'
  }
};

export default function WordDetail() {
  const [searchParams] = useSearchParams();
  const wordParam = searchParams.get('word') || 'bull-market';
  const [wordData, setWordData] = useState<WordOfTheDay | null>(null);

  useEffect(() => {
    // Try exact match first
    let data = financialTerms[wordParam];
    
    // If not found, try to find by word name (case-insensitive, handle spaces/hyphens)
    if (!data) {
      const normalizedParam = wordParam.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, '-');
      data = financialTerms[normalizedParam];
      
      // Last resort: find by word name match
      if (!data) {
        const matchingKey = Object.keys(financialTerms).find(key => {
          const termWord = financialTerms[key].word.toLowerCase().replace(/\s+/g, '-');
          return termWord === wordParam.toLowerCase() || termWord === normalizedParam;
        });
        if (matchingKey) {
          data = financialTerms[matchingKey];
        }
      }
    }
    
    // Default to bull-market if still not found
    setWordData(data || financialTerms['bull-market']);
  }, [wordParam]);

  if (!wordData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-sky-600 hover:text-sky-700 mb-6"
        >
          ← Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 lg:p-10">
          {wordData.category && (
            <span className="inline-block px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-medium mb-4">
              {wordData.category}
            </span>
          )}
          
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            {wordData.word}
          </h1>

          <div className="prose prose-slate max-w-none">
            <div className="bg-sky-50 rounded-xl p-6 mb-8 border-l-4 border-sky-500">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Definition</h2>
              <p className="text-slate-700 text-base leading-relaxed">
                {wordData.definition}
              </p>
            </div>

            {wordData.example && (
              <div className="bg-emerald-50 rounded-xl p-6 mb-8 border-l-4 border-emerald-500">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Example</h2>
                <p className="text-slate-700 text-base leading-relaxed italic">
                  "{wordData.example}"
                </p>
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Related Terms</h2>
              <div className="flex flex-wrap gap-2">
                {Object.keys(financialTerms).filter(key => key !== wordKey).slice(0, 5).map(key => (
                  <Link
                    key={key}
                    to={`/word-detail?word=${key}`}
                    className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-colors"
                  >
                    {financialTerms[key].word}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 text-white px-6 py-3 font-medium hover:bg-sky-700 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

