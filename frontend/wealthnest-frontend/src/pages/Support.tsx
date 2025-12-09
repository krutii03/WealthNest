import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface FAQ { id: number; question: string; answer: string; }

export default function SupportPage() {
  const [message, setMessage] = useState('');
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  useEffect(() => {
    const load = async () => {
      // Using Chatbot_FAQ table: columns assumed as id, question, answer
      const { data } = await supabase.from('Chatbot_FAQ').select('*').limit(20);
      setFaqs((data as any) || []);
    };
    load();
  }, []);

  const submitFeedback = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return;
    await supabase.from('Feedback').insert({ user_id: uid, message, status: 'open' });
    setMessage('');
  };

  return (
    <div className="layout">
      <main className="col-main">
        <div className="card">
          <h2>Support & Feedback</h2>
          <textarea placeholder="Share your feedback..." value={message} onChange={(e) => setMessage(e.target.value)} />
          <div className="actions"><button className="btn btn-blue" onClick={submitFeedback}>Submit</button></div>
        </div>
      </main>
      <aside className="col-side">
        <div className="card">
          <h3>FAQs</h3>
          <ul>
            {faqs.map(f => (<li key={f.id}><strong>{f.question}</strong><div className="muted">{f.answer}</div></li>))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
