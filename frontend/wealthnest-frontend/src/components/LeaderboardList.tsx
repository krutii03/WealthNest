export default function LeaderboardList() {
  const data = [
    { name: 'Alice', points: 1200 },
    { name: 'Bob', points: 950 },
  ];
  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-xl font-semibold mb-3">Top Investors</h2>
      <ul className="grid md:grid-cols-2 gap-3">
        {data.map((d, i) => (
          <li key={i} className="p-4 rounded border bg-white flex justify-between">
            <span>{d.name}</span>
            <span className="font-semibold">{d.points}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
