export default function NewsFeed() {
  const news = [
    { title: 'Markets open steady', src: 'Mock NewsWire' },
    { title: 'Tech stocks rally', src: 'Mock NewsWire' },
  ];
  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-xl font-semibold mb-3">Market News</h2>
      <ul className="grid md:grid-cols-2 gap-3">
        {news.map((n, i) => (
          <li key={i} className="p-4 rounded border bg-white">
            <p className="font-medium">{n.title}</p>
            <p className="text-xs text-slate-500">{n.src}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
