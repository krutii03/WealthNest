import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface Message {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
  keywords?: string[];
}

// Predefined FAQs with keywords for matching
const defaultFAQs: FAQ[] = [
  {
    id: 1,
    question: 'What is a SIP?',
    answer: 'A Systematic Investment Plan (SIP) lets you invest a fixed amount at regular intervals (usually monthly or quarterly) to average costs and build wealth over time. SIPs help you benefit from rupee cost averaging and the power of compounding.',
    keywords: ['sip', 'systematic investment', 'regular investment', 'monthly investment']
  },
  {
    id: 2,
    question: 'What is a Lumpsum investment?',
    answer: 'A Lumpsum investment is a single one-time investment, which may suit investors with larger deployable capital and higher risk appetite. Unlike SIPs, you invest the entire amount at once.',
    keywords: ['lumpsum', 'one-time', 'single investment', 'bulk investment']
  },
  {
    id: 3,
    question: 'What is ASM?',
    answer: 'Additional Surveillance Measure (ASM) helps reduce volatility and protect investors by imposing trading curbs on certain securities. Stocks under ASM may have higher margin requirements or trading restrictions.',
    keywords: ['asm', 'additional surveillance', 'trading curbs', 'volatility']
  },
  {
    id: 4,
    question: 'How can I simulate trades?',
    answer: 'Use WealthNest\'s simulated trading feature to practice entries and exits without risking real capital. You can buy and sell stocks and mutual funds in a virtual environment. Leaderboards make it fun and competitive!',
    keywords: ['simulate', 'simulation', 'practice', 'virtual trading', 'demo', 'paper trading']
  },
  {
    id: 5,
    question: 'How do I add money to my wallet?',
    answer: 'You can add money to your wallet by going to the Wallet page and clicking on "Add Funds". Enter the amount you want to add and complete the transaction. For simulated trading, you start with a default balance.',
    keywords: ['wallet', 'add money', 'deposit', 'funds', 'balance', 'add funds']
  },
  {
    id: 6,
    question: 'What stocks can I trade?',
    answer: 'WealthNest offers simulated trading for various stocks including popular ones like AAPL, MSFT, GOOGL, AMZN, and TSLA. You can view all available stocks on the Stocks page.',
    keywords: ['stocks', 'trading', 'available stocks', 'which stocks', 'what can I buy']
  },
  {
    id: 7,
    question: 'How do I view my portfolio?',
    answer: 'Navigate to the Portfolio page from the main menu to see all your holdings, their current values, profit/loss, and trends. You can also view a summary on your Dashboard.',
    keywords: ['portfolio', 'holdings', 'my investments', 'view portfolio', 'my stocks']
  },
  {
    id: 8,
    question: 'What is the leaderboard?',
    answer: 'The leaderboard shows top performers based on their trading activities and portfolio performance. Climb the ranks by making smart investment decisions!',
    keywords: ['leaderboard', 'ranking', 'top performers', 'scores', 'points']
  }
];

export default function FAQChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      text: 'Hello! I\'m the WealthNest chatbot. I can help answer questions about investing, SIPs, mutual funds, and more. Type your question or select one from the suggestions below!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [faqs, setFaqs] = useState<FAQ[]>(defaultFAQs);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load FAQs from database if available
    const loadFAQs = async () => {
      try {
        const { data } = await supabase
          .from('Chatbot_FAQ')
          .select('*')
          .limit(50);
        
        if (data && data.length > 0) {
          const dbFAQs: FAQ[] = data.map((item: any) => ({
            id: item.id,
            question: item.question,
            answer: item.answer,
            keywords: item.question.toLowerCase().split(' ')
          }));
          setFaqs([...defaultFAQs, ...dbFAQs]);
        }
      } catch (error) {
        console.warn('Could not load FAQs from database, using defaults:', error);
      }
    };
    loadFAQs();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const findAnswer = (query: string): string | null => {
    const lowerQuery = query.toLowerCase().trim();
    
    // Handle greetings and simple queries
    const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    if (greetings.some(g => lowerQuery.includes(g) && lowerQuery.length < 10)) {
      return 'Hello! I\'m here to help you with questions about investing, SIPs, mutual funds, portfolio management, and more. What would you like to know?';
    }

    // Handle "what is", "tell me about", etc.
    if (lowerQuery.length < 15 && !lowerQuery.includes('what') && !lowerQuery.includes('how') && !lowerQuery.includes('tell')) {
      // For very short queries that aren't questions, just provide general help
      if (lowerQuery.length < 5) {
        return 'I can help answer questions about investing, SIPs, Lumpsum investments, mutual funds, portfolio management, and trading. Try asking me a specific question!';
      }
    }
    
    // First, try exact question match
    const exactMatch = faqs.find(faq => 
      faq.question.toLowerCase() === lowerQuery
    );
    if (exactMatch) return exactMatch.answer;

    // Then, try partial question match (question contains the query or vice versa)
    const partialMatch = faqs.find(faq => {
      const questionLower = faq.question.toLowerCase();
      return questionLower.includes(lowerQuery) || lowerQuery.includes(questionLower);
    });
    if (partialMatch) return partialMatch.answer;

    // Then, try keyword matching - but only if query has meaningful keywords
    const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 2); // Filter out very short words
    if (queryWords.length > 0) {
      const matchedFAQ = faqs.find(faq => {
        const questionLower = faq.question.toLowerCase();
        const keywords = faq.keywords || [];
        
        // Check if multiple keywords match (better match)
        const keywordMatches = queryWords.filter(word => 
          keywords.some((kw: string) => kw.includes(word) || word.includes(kw)) ||
          questionLower.includes(word)
        );
        
        // Require at least 2 keyword matches or 1 strong match for longer queries
        return keywordMatches.length >= Math.min(2, queryWords.length) || 
               (queryWords.length === 1 && keywordMatches.length === 1);
      });

      if (matchedFAQ) return matchedFAQ.answer;
    }

    // If no match found
    return null;
  };

  const handleSend = (text?: string) => {
    const query = text || input.trim();
    if (!query) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Simulate bot thinking
    setTimeout(() => {
      const answer = findAnswer(query);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: answer || 'I\'m sorry, I don\'t have an answer to that question yet. Please email us at wealthnest@gmail.com and we\'ll be happy to help you!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setLoading(false);
    }, 500);
  };

  const handleQuickQuestion = (question: string) => {
    handleSend(question);
  };

  const suggestedQuestions = faqs.slice(0, 6).map(faq => faq.question);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">FAQ Chatbot</h1>
          <p className="mt-2 text-lg text-slate-600">Ask me anything about investing, SIPs, mutual funds, and more!</p>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Messages Area */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-slate-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-sky-600 text-white'
                      : 'bg-white text-slate-900 border border-slate-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <span className={`text-xs mt-1 block ${
                    message.type === 'user' ? 'text-sky-100' : 'text-slate-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl px-4 py-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          <div className="p-4 bg-white border-t border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-3">Suggested Questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(question)}
                  className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your question here..."
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="px-6 py-2.5 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* FAQ List */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <button
                key={faq.id}
                onClick={() => handleQuickQuestion(faq.question)}
                className="w-full text-left p-4 rounded-lg bg-sky-600 hover:bg-sky-700 transition-colors"
              >
                <h3 className="font-medium text-white">{faq.question}</h3>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

