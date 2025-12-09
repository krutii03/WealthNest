export default function Info() {
  return (
    <div className="wn-container py-8">
      <h1 className="text-2xl font-bold text-slate-900">About WealthNest</h1>
      <p className="text-slate-700 mt-2 max-w-3xl">
        WealthNest is a fintech investment simulation platform designed to help you learn, plan,
        and practice investing. Explore stocks and mutual funds, track a simulated portfolio,
        and build discipline with insights and tools—without risking real money.
      </p>

      <section className="mt-8 grid md:grid-cols-3 gap-6">
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <h2 className="font-semibold text-slate-900">Investments</h2>
          <p className="text-slate-700 mt-2">
            Investing is allocating capital to assets with the expectation of generating returns.
            Balance risk and reward with diversification, goal alignment, and time horizons.
          </p>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <h2 className="font-semibold text-slate-900">Stocks</h2>
          <p className="text-slate-700 mt-2">
            Stocks represent ownership in a company. Returns come from price appreciation and dividends.
            Assess fundamentals (earnings, margins) and trends; avoid overconcentration.
          </p>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <h2 className="font-semibold text-slate-900">Mutual Funds</h2>
          <p className="text-slate-700 mt-2">
            Mutual funds pool investor money into diversified portfolios managed by professionals.
            Compare expense ratios, risk profiles, and track records to find suitable options.
          </p>
        </div>
      </section>

      <section className="mt-8 p-4 rounded-lg border border-slate-200 bg-white">
        <h2 className="font-semibold text-slate-900">How it works</h2>
        <ul className="list-disc pl-5 text-slate-700 mt-2">
          <li>Create a free account and set up your simulated wallet.</li>
          <li>Browse assets and execute simulated buy/sell orders.</li>
          <li>Track P/L, allocations, and historical trends on your dashboard.</li>
        </ul>
      </section>
    </div>
  );
}
