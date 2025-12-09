/**
 * Financial Terms Database
 * Used for Word of the Day feature - rotates daily
 */

export interface FinancialTerm {
  term: string;
  definition: string;
  description?: string;
  example?: string;
  category: string;
}

export const financialTerms: FinancialTerm[] = [
  { "term": "Equity", "definition": "Ownership interest in a company.", "description": "Represents shareholder ownership in the form of stock, giving voting rights and profit claims.", "category": "Stocks" },
  { "term": "Asset", "definition": "Resource with economic value.", "description": "Anything owned that provides present or future monetary benefit, such as stocks, property, or cash.", "category": "General Finance" },
  { "term": "Liability", "definition": "Financial obligation or debt.", "description": "Amounts a company or individual owes—like loans, bills, or mortgages.", "category": "General Finance" },
  { "term": "Liquidity", "definition": "Ease of converting assets to cash.", "description": "Highly liquid assets like cash or stocks can be sold quickly without losing value.", "category": "Markets" },
  { "term": "Market Capitalization", "definition": "Total value of a company.", "description": "Calculated as stock price × total outstanding shares; used to categorize companies by size.", "category": "Stocks" },
  { "term": "Bull Market", "definition": "Period of rising prices.", "description": "Characterized by investor confidence and sustained upward movement in asset prices.", "category": "Markets" },
  { "term": "Bear Market", "definition": "Period of falling prices.", "description": "A decline of 20% or more in market indexes signals a bear market, often driven by pessimism.", "category": "Markets" },
  { "term": "Volatility", "definition": "Rate of price fluctuation.", "description": "High volatility means large price swings; often seen in crypto and tech stocks.", "category": "Markets" },
  { "term": "Bond", "definition": "Debt investment.", "description": "Investors lend money to issuers (government or corporate) in return for fixed interest payments.", "category": "Bonds" },
  { "term": "Yield", "definition": "Return on investment.", "description": "Expressed as a percentage, showing earnings generated on bonds, stocks, or savings.", "category": "General Finance" },
  { "term": "Dividend", "definition": "Share of profits paid to shareholders.", "description": "Companies distribute earnings periodically as dividends to reward investors.", "category": "Stocks" },
  { "term": "Index Fund", "definition": "Fund that tracks a market index.", "description": "Passive investment fund following benchmarks like NIFTY 50 or S&P 500.", "category": "Mutual Funds" },
  { "term": "ETF", "definition": "Exchange-traded fund.", "description": "A basket of securities traded on stock exchanges like individual stocks.", "category": "Funds" },
  { "term": "Inflation", "definition": "Increase in prices over time.", "description": "Reduces purchasing power as goods/services become more expensive.", "category": "Economics" },
  { "term": "Deflation", "definition": "Decrease in prices.", "description": "Opposite of inflation; often linked to recessions or reduced demand.", "category": "Economics" },
  { "term": "Recession", "definition": "Economic slowdown.", "description": "Typically defined as two consecutive quarters of negative GDP growth.", "category": "Economics" },
  { "term": "GDP", "definition": "Gross Domestic Product.", "description": "Measures total value of goods and services produced within a country.", "category": "Economics" },
  { "term": "Risk Appetite", "definition": "Level of risk an investor is willing to take.", "description": "Higher risk appetite leads to aggressive investments like stocks or crypto.", "category": "Investing" },
  { "term": "Hedge", "definition": "Risk-reduction strategy.", "description": "Investors use derivatives or assets like gold to offset potential losses.", "category": "Investing" },
  { "term": "Diversification", "definition": "Spreading investments to reduce risk.", "description": "Avoids concentrating funds into a single asset, improving stability.", "category": "Investing" },
  { "term": "Blue-Chip Stock", "definition": "Large, stable, high-quality company stock.", "description": "Companies with consistent earnings and strong reputations, such as Apple or Reliance.", "category": "Stocks" },
  { "term": "P/E Ratio", "definition": "Price-to-Earnings ratio.", "description": "Shows how much investors pay per dollar of earnings; high P/E indicates growth expectations.", "category": "Stocks" },
  { "term": "Short Selling", "definition": "Betting on price decline.", "description": "Traders sell borrowed shares hoping to repurchase them at a lower price.", "category": "Trading" },
  { "term": "Leverage", "definition": "Borrowing to invest.", "description": "Increases potential gains and losses, commonly used in trading and real estate.", "category": "Investing" },
  { "term": "Capital Gain", "definition": "Profit from selling an asset.", "description": "Realized when selling price exceeds purchase price.", "category": "Taxation" },
  { "term": "NAV", "definition": "Net Asset Value.", "description": "Price per unit of a mutual fund; calculated daily.", "category": "Mutual Funds" },
  { "term": "Expense Ratio", "definition": "Fund management fee.", "description": "Percentage charged by fund managers; lower is better for long-term investors.", "category": "Mutual Funds" },
  { "term": "Alpha", "definition": "Excess return over benchmark.", "description": "Positive alpha indicates superior fund manager performance.", "category": "Investing" },
  { "term": "Beta", "definition": "Market risk measure.", "description": "Beta of 1 = moves with market; >1 more volatile; <1 less volatile.", "category": "Investing" },
  { "term": "Sharpe Ratio", "definition": "Risk-adjusted return.", "description": "Higher Sharpe ratio indicates better return per risk taken.", "category": "Investing" },
  { "term": "Asset Allocation", "definition": "Distribution of investment mix.", "description": "Divide funds among stocks, bonds, gold, or cash for optimal risk/return.", "category": "Investing" },
  { "term": "Robo-Advisor", "definition": "Automated investment tool.", "description": "Uses algorithms to manage portfolios without human involvement.", "category": "Technology" },
  { "term": "FinTech", "definition": "Financial technology industry.", "description": "Digital solutions for banking, investing, lending, and payments.", "category": "Technology" },
  { "term": "Blockchain", "definition": "Decentralized digital ledger.", "description": "Used for cryptocurrencies and secure transaction recording.", "category": "Crypto" },
  { "term": "Cryptocurrency", "definition": "Digital currency.", "description": "Uses blockchain for peer-to-peer transactions without intermediaries.", "category": "Crypto" },
  { "term": "Token", "definition": "Digital asset on blockchain.", "description": "Represents real-world or digital items, rights, or utility.", "category": "Crypto" },
  { "term": "Market Order", "definition": "Buy/sell order executed immediately.", "description": "Guaranteed execution but not guaranteed price.", "category": "Trading" },
  { "term": "Limit Order", "definition": "Order executed at specific price.", "description": "Helps control the price at which you buy or sell.", "category": "Trading" },
  { "term": "Stop Loss", "definition": "Auto-sell order to prevent losses.", "description": "Triggered when asset falls to a set price.", "category": "Trading" },
  { "term": "Volume", "definition": "Number of shares traded.", "description": "Indicates liquidity and interest in a stock.", "category": "Markets" },
  { "term": "Float", "definition": "Shares available for trading.", "description": "Excludes insider-held shares; low float stocks are more volatile.", "category": "Stocks" },
  { "term": "Debt", "definition": "Borrowed money owed.", "description": "Includes personal loans, business loans, and government bonds.", "category": "General Finance" },
  { "term": "Credit Score", "definition": "Measure of creditworthiness.", "description": "Higher score = better loan eligibility and rates.", "category": "Personal Finance" },
  { "term": "Compound Interest", "definition": "Interest earned on interest.", "description": "Money grows exponentially over time; powerful for long-term investing.", "category": "Personal Finance" },
  { "term": "Simple Interest", "definition": "Interest on initial amount only.", "description": "Used in short-term loans or fixed deposits.", "category": "Personal Finance" },
  { "term": "ROE", "definition": "Return on Equity.", "description": "Shows how effectively a company generates profit using shareholder equity.", "category": "Stocks" },
  { "term": "ROI", "definition": "Return on Investment.", "description": "Measures profitability relative to investment cost.", "category": "General Finance" },
  { "term": "Cash Flow", "definition": "Money flowing in and out.", "description": "Positive cash flow means more inflow than outflow.", "category": "General Finance" },
  { "term": "Book Value", "definition": "Value of company assets minus liabilities.", "description": "Compared with market value to assess undervaluation.", "category": "Stocks" },
  { "term": "Market Sentiment", "definition": "Overall investor attitude.", "description": "Markets move based on optimism (bullish) or fear (bearish).", "category": "Markets" },
  { "term": "HODL", "definition": "Hold for long term.", "description": "Crypto slang encouraging investors to hold despite volatility.", "category": "Crypto" },
  { "term": "FOMO", "definition": "Fear of Missing Out.", "description": "Driving emotion behind impulsive or risky investing.", "category": "Behavioral Finance" },
  { "term": "FOLO", "definition": "Fear of Losing Out.", "description": "Opposite of FOMO; leads to excessive caution in investing.", "category": "Behavioral Finance" },
  { "term": "Arbitrage", "definition": "Risk-free profit opportunity.", "description": "Buying and selling the same asset simultaneously across markets.", "category": "Trading" },
  { "term": "Derivatives", "definition": "Contracts based on underlying assets.", "description": "Includes futures, options, and swaps.", "category": "Trading" },
  { "term": "Options", "definition": "Right to buy or sell at a price.", "description": "Call and put options allow speculation or hedging.", "category": "Trading" },
  { "term": "Unrealized Gain", "definition": "Profit on unsold assets.", "description": "Also called paper gains; only realized when sold.", "category": "Taxation" },
  { "term": "Unrealized Loss", "definition": "Loss on unsold assets.", "description": "Does not affect tax until realized through sale.", "category": "Taxation" },
  { "term": "Principal", "definition": "Original amount invested or borrowed.", "description": "Interest is calculated based on this amount.", "category": "Personal Finance" },
  { "term": "Budget", "definition": "Spending plan.", "description": "Helps manage income, expenses, and savings effectively.", "category": "Personal Finance" },
  { "term": "Emergency Fund", "definition": "Savings for unexpected expenses.", "description": "Typically 3–6 months of living costs to reduce financial stress.", "category": "Personal Finance" },
  { "term": "Mutual Fund", "definition": "Pooled investment managed by professionals.", "description": "Invests in stocks, bonds, or other assets; suitable for beginners.", "category": "Funds" },
  { "term": "Hedge Fund", "definition": "High-risk, high-return private fund.", "description": "Uses aggressive strategies like derivatives and leverage.", "category": "Funds" },
  { "term": "SIP", "definition": "Systematic Investment Plan.", "description": "Allows investing a fixed amount regularly in mutual funds.", "category": "Mutual Funds" },
  { "term": "Treasury Bill", "definition": "Short-term government security.", "description": "Low-risk investment issued by the central government.", "category": "Bonds" },
  { "term": "Sovereign Bond", "definition": "Government-issued debt.", "description": "Considered low-risk; interest paid regularly.", "category": "Bonds" },
  { "term": "Overvaluation", "definition": "Asset priced above actual worth.", "description": "Often driven by hype or speculation.", "category": "Investing" },
  { "term": "Undervaluation", "definition": "Asset priced below actual worth.", "description": "Attractive to value investors looking for deals.", "category": "Investing" },
  { "term": "Correlation", "definition": "Relationship between two assets.", "description": "Used in portfolio diversification to reduce risk.", "category": "Investing" },
  { "term": "Debt-to-Equity Ratio", "definition": "Financial leverage measure.", "description": "Shows how much debt is used to finance business operations.", "category": "Stocks" },
  { "term": "Fiscal Policy", "definition": "Government spending & tax policy.", "description": "Used to regulate economic growth.", "category": "Economics" },
  { "term": "Monetary Policy", "definition": "Central bank's control of money supply.", "description": "Impacts interest rates and inflation.", "category": "Economics" },
  { "term": "Repo Rate", "definition": "Rate at which banks borrow from RBI.", "description": "Higher repo increases borrowing costs, reducing liquidity.", "category": "Economics" },
  { "term": "Cash Reserve Ratio", "definition": "Banks' required cash reserves.", "description": "Higher CRR means less money available for lending.", "category": "Banking" },
  { "term": "NPA", "definition": "Non-performing asset.", "description": "Loans where borrowers stopped paying interest/principal.", "category": "Banking" },
  { "term": "Underwriting", "definition": "Guaranteeing sale of securities.", "description": "Investment banks underwrite IPOs to ensure capital raising.", "category": "Markets" },
  { "term": "Margin Trading", "definition": "Trading using borrowed money.", "description": "Amplifies both gains and losses; requires caution.", "category": "Trading" },
  { "term": "Speculation", "definition": "High-risk trading for quick profit.", "description": "Traders bet on short-term market movements.", "category": "Trading" },
  { "term": "Time Horizon", "definition": "Duration of investment.", "description": "Short-term = trading; long-term = wealth building.", "category": "Investing" },
  { "term": "Stop-Limit Order", "definition": "Order triggers only at specific price.", "description": "Prevents execution outside desired price range.", "category": "Trading" }
];

/**
 * Get a financial term based on the day of the year
 * This ensures the same term is shown throughout each day
 */
export function getWordOfTheDay(): FinancialTerm {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const index = (dayOfYear - 1) % financialTerms.length;
  return financialTerms[index];
}
