function Icon({ name }: { name: 'compass' | 'trending' | 'layers' | 'shield' }) {
  const common = 'w-6 h-6 text-teal-600';
  switch (name) {
    case 'compass':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M15.5 8.5l-2 5-5 2 2-5 5-2Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'trending':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 17l6-6 4 4 7-7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 8h7v7" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'layers':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3l8 4-8 4-8-4 8-4Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 11l8 4 8-4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 15l8 4 8-4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'shield':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
  }
}

function Card({ icon, title, bullets }: { icon: 'compass' | 'trending' | 'layers' | 'shield'; title: string; bullets: string[] }) {
  return (
    <article
      className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transform hover:-translate-y-1 transition duration-150 ease-out focus-within:ring-2 focus-within:ring-teal-300"
    >
      <header className="flex items-center gap-3 mb-3">
        <Icon name={icon} />
        <h2 className="text-lg md:text-xl font-semibold text-slate-900">{title}</h2>
      </header>
      <ul className="list-disc list-inside text-sm md:text-base text-slate-600 space-y-1">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </article>
  );
}

export default function LearnMore() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-2">Learn More</h1>
      <p className="text-base md:text-lg text-slate-600 mb-8">Quick primers on investing concepts and today’s market highlights.</p>

      <section className="grid gap-6 md:grid-cols-2">
        <Card
          icon="compass"
          title="Investing Basics"
          bullets={[
            'Define your goals & horizon',
            'Diversify across assets to manage risk',
            'Use SIPs for disciplined investing',
          ]}
        />
        <Card
          icon="trending"
          title="Stocks"
          bullets={[
            'Company ownership; gains from price & dividends',
            'Track fundamentals (earnings, margins) & technicals',
            'Avoid concentration; diversify sectors',
          ]}
        />
        <Card
          icon="layers"
          title="Mutual Funds"
          bullets={[
            'Pooled funds managed by pros',
            'Expense ratios affect long-term returns',
            'Choose funds by risk & goals',
          ]}
        />
        <Card
          icon="shield"
          title="Risk & Discipline"
          bullets={[
            'Volatility is normal — focus on risk-adjusted returns',
            'Rebalance periodically to maintain allocation',
          ]}
        />
      </section>
    </div>
  );
}
