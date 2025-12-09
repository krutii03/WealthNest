export default function MutualFunds() {
  const mfs = [
    { name: 'Alpha Growth Fund', category: 'Large Cap', nav: 152.34 },
    { name: 'Balanced Opportunities', category: 'Hybrid', nav: 76.12 },
  ];
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Mutual Funds</h1>
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        {mfs.map((m, i) => (
          <div key={i} className="p-4 border rounded bg-white">
            <p className="font-medium">{m.name}</p>
            <p className="text-sm text-slate-600">{m.category}</p>
            <p className="mt-1">NAV: ₹{m.nav}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
