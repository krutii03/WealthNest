export default function Highlights() {
  const items = [
    { title: 'Zero account opening', desc: 'No hidden charges' },
    { title: 'Secure & Compliant', desc: 'RLS-friendly design' },
    { title: 'Realtime Prices', desc: 'Live updates via Supabase Realtime' },
  ];
  return (
    <section className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-4">
      {items.map((it, i) => (
        <div key={i} className="p-5 rounded-lg border bg-white">
          <h3 className="font-semibold text-slate-900">{it.title}</h3>
          <p className="text-slate-600 text-sm">{it.desc}</p>
        </div>
      ))}
    </section>
  );
}
