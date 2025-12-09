export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-green-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900">Invest smart with WealthNest</h1>
        <p className="mt-3 text-slate-600 max-w-2xl mx-auto">Groww-like simple investing experience with a beautiful dashboard, realtime prices, calculators, and a simulated wallet.</p>
        <div className="mt-6 flex justify-center gap-3">
          <a href="/signup" className="px-4 py-2 rounded bg-blue-600 text-white">Get Started</a>
          <a href="/markets" className="px-4 py-2 rounded border border-slate-300">Explore Markets</a>
        </div>
      </div>
    </section>
  );
}
