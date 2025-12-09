export default function ChatbotFAQ() {
  const faqs = [
    { q: 'How to start investing?', a: 'Create an account, add money to wallet (simulate), and buy assets.' },
    { q: 'Is my data safe?', a: 'We use Supabase with RLS. Never expose secrets in frontend.' },
  ];

  return (
    <section className="faq max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-xl font-semibold mb-3">FAQ</h2>
      <div className="grid gap-3">
        {faqs.map((f, i) => (
          <details
            key={i}
            className="rounded-lg bg-sky-600 text-white shadow-sm hover:shadow-md transition focus:outline-none"
          >
            <summary className="cursor-pointer font-medium flex justify-between items-center px-4 py-3 focus:outline-none focus:ring-0">
              <span className="text-white">{f.q}</span>
              <span className="ml-2 text-white/80 group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-white/90 px-4 pb-4 -mt-1">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}