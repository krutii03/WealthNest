import { Link } from 'react-router-dom';

export default function CalculatorPreview() {
  const items = [
    { name: 'SIP', to: '/calculators' },
    { name: 'Lumpsum', to: '/calculators' },
    { name: 'SIP Goal', to: '/calculators' },
    { name: 'EMI', to: '/calculators' },
  ];
  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-xl font-semibold mb-3">Calculators</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((c, i) => (
          <Link key={i} to={c.to} className="p-4 rounded border bg-white text-center hover:border-blue-400">
            {c.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
