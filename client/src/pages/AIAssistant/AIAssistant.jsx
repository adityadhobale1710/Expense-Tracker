import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef(null);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/ai/history');
      setMessages(data.data || []);
    } catch {
      toast.error('Failed to load chat history');
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    setLoading(true);
    setInput('');

    // Append user message locally
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date() }]);

    try {
      const { data } = await api.post('/ai/chat', { message: text });
      // Append AI response
      setMessages(prev => [...prev, data.data.aiMessage]);
    } catch {
      toast.error('AI response error');
    } finally {
      setLoading(false);
    }
  };

  // Browser voice speech recognition (Web Speech API)
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return toast.error('Web Speech recognition not supported in this browser. Please use Chrome/Edge.');
    }

    const rec = new SpeechRecognition();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setListening(true);
      toast.success('Microphone activated. Talk now...');
    };

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      toast.success(`Voice Captured: "${transcript}"`);
    };

    rec.onerror = () => {
      toast.error('Speech recognition failed. Check permissions.');
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
    };

    rec.start();
  };

  const QUICK_REPLIES = [
    "Can I spend ₹5000 this month?",
    "Why are my expenses increasing?",
    "What should I save?",
    "Recommend a budget template"
  ];

  return (
    <div className="card h-[calc(100vh-140px)] flex flex-col justify-between overflow-hidden animate-fade-in">
      <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-bold text-slate-100 text-sm">AI Financial Assistant</h3>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Online • Smart Analytics Assistant</p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <span className="text-4xl">🔮</span>
            <div className="max-w-md space-y-2">
              <h4 className="text-sm font-bold text-slate-300">Start Your Financial Consultation</h4>
              <p className="text-xs text-slate-500">Ask about budget limits, expense forecasting, transaction leakage, or liquid wallet metrics.</p>
            </div>
          </div>
        )}

        {messages.map((m, index) => {
          const isUser = m.role === 'user';
          return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl rounded-2xl p-4 text-xs leading-normal shadow ${
                isUser
                  ? 'bg-primary-600 text-white rounded-tr-none'
                  : 'bg-slate-900/40 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}>
                {m.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              <span>AI is analyzing your database...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Quick Replies & Input */}
      <div className="p-4 border-t border-slate-700/50 space-y-4 bg-slate-900/10">
        {/* Quick Suggestions */}
        <div className="flex flex-wrap gap-2">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="text-[10px] px-3 py-1.5 bg-slate-800 border border-slate-700/60 rounded-full text-slate-400 hover:text-slate-100 transition-all font-semibold"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Text/Speech input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2 items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your finance query or tap the microphone..."
            className="input flex-1"
          />
          <button
            type="button"
            onClick={startSpeechRecognition}
            className={`p-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-all ${
              listening ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-slate-900'
            }`}
          >
            {listening ? '🛑' : '🎙️'}
          </button>
          <button type="submit" className="btn-primary text-xs px-6 py-2.5">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
