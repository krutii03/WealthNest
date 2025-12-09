export default function MutualFunds() {
  const mfs = [
    { name: 'Alpha Growth Fund', category: 'Large Cap', nav: 152.34 },
    { name: 'Balanced Opportunities', category: 'Hybrid', nav: 76.12 },
  ];
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Mutual Funds</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {mfs.map((m, i) => (
          <div key={i} className="p-4 sm:p-5 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
            <p className="font-semibold text-base sm:text-lg text-slate-900 mb-1">{m.name}</p>
            <p className="text-xs sm:text-sm text-slate-600 mb-2">{m.category}</p>
            <p className="text-base sm:text-lg font-bold text-slate-900">NAV: ₹{m.nav.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
