import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { Bot, User, Send, Copy, Check, AlertCircle } from 'lucide-react';

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Suggested Prompts list
  const suggestedPrompts = [
    { text: 'Analyze my budget', label: '📊 Analyze my budget' },
    { text: 'Summarize my monthly spending', label: '💰 Summarize monthly spending' },
    { text: 'Where am I overspending?', label: '⚠️ Where am I overspending?' },
    { text: 'Compare this month with last month', label: '📈 Compare with last month' },
    { text: 'How can I save more money?', label: '💡 How to save more' },
    { text: 'Show my financial health', label: '✨ Show financial health' },
  ];

  // Fetch history on load
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setFetchLoading(true);
        const res = await api.get('/ai/history');
        if (res.data && res.data.data) {
          setMessages(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch chat history:', err);
        setError('Could not load chat history. Please refresh.');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Handle scroll to bottom when messages or loading state changes
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, autoScroll]);

  // Monitor user scrolling to toggle autoScroll state
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    
    // If the user has scrolled up more than 100px from the bottom, disable auto-scroll
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    } else if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
  };

  const handleSend = async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || loading) return;

    setError(null);
    setLoading(true);
    setIsTyping(true);
    setInput('');
    setAutoScroll(true); // Re-enable autoscroll when user sends a new message

    // Create optimistic user message
    const tempUserMsg = {
      _id: `temp-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.post('/ai/chat', { message: text }, { timeout: 45000 });
      const { userMessage, aiMessage } = res.data.data;

      setMessages((prev) => {
        // Find our optimistic message and replace it, then append the reply
        const newMsgs = [...prev];
        const index = newMsgs.findIndex((m) => m._id === tempUserMsg._id);
        if (index !== -1) {
          newMsgs[index] = userMessage;
        } else {
          newMsgs.push(userMessage);
        }
        return [...newMsgs, aiMessage];
      });
    } catch (err) {
      console.error('AI chat error:', err);
      // Retrieve friendly message from backend or use local standard fallback
      const friendlyErr = err.response?.data?.message || err.message || 'Unable to connect to the Gemini service. Please check your internet connection.';
      setError(friendlyErr);
      // Restore failed text to input
      setInput(text);
      // Filter out our optimistic message to keep UI correct
      setMessages((prev) => prev.filter((m) => m._id !== tempUserMsg._id));
      toast.error('Failed to send message.');
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyText = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      toast.error('Failed to copy response.');
    }
  };

  // Safe markdown component styling overrides
  const mdComponents = {
    h1: ({ children }) => <h1 className="text-base font-bold text-slate-100 mt-3 mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-sm font-bold text-slate-100 mt-2 mb-1.5">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xs font-bold text-slate-200 mt-2 mb-1">{children}</h3>,
    p: ({ children }) => <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2 text-slate-300 text-xs sm:text-sm">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2 text-slate-300 text-xs sm:text-sm">{children}</ol>,
    li: ({ children }) => <li className="text-slate-300 text-xs sm:text-sm">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary-500 bg-slate-800/40 pl-4 py-2 my-2 rounded-r-lg italic text-slate-400">
        {children}
      </blockquote>
    ),
    code({ className, children, ...props }) {
      const content = String(children).replace(/\n$/, '');
      const isInline = !className && !content.includes('\n');
      return isInline ? (
        <code className="bg-slate-950/60 border border-slate-800/80 rounded px-1.5 py-0.5 text-[11px] text-indigo-400 font-mono" {...props}>
          {content}
        </code>
      ) : (
        <div className="my-2.5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 max-w-full">
          <code className={`block text-xs text-indigo-300 font-mono leading-relaxed whitespace-pre ${className || ''}`} {...props}>
            {content}
          </code>
        </div>
      );
    },
    table: ({ children }) => (
      <div className="overflow-x-auto my-3 border border-slate-700/50 rounded-xl">
        <table className="w-full text-left border-collapse text-xs text-slate-300">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-800/70 border-b border-slate-700/60 text-slate-200 font-bold uppercase">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-slate-800/60">{children}</tbody>,
    tr: ({ children }) => <tr className="hover:bg-slate-800/30 transition-colors">{children}</tr>,
    th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2">{children}</td>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 underline font-medium transition-colors">
        {children}
      </a>
    ),
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">🤖 AI Assistant</h1>
            <span className="px-2.5 py-1 text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>
          <p className="page-subtitle">Conversational AI copilot for instant expense queries and insights</p>
        </div>
      </div>

      {/* Main Chat Area Card */}
      <div className="card flex-1 flex flex-col p-0 overflow-hidden border border-slate-800/80 bg-dark-800/40 relative shadow-2xl rounded-2xl">
        {/* Background ambient blurs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Loading History Skeleton */}
        {fetchLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Bot className="w-12 h-12 text-slate-500 animate-pulse" />
            <div className="space-y-2 w-1/3">
              <div className="h-4 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 bg-slate-800 rounded animate-pulse w-5/6 mx-auto" />
            </div>
          </div>
        ) : (
          <>
            {/* Message Box */}
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-[250px]"
            >
              {messages.length === 0 ? (
                // Welcome Screen with Suggested Prompts
                <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-4 py-8">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-700/40 flex items-center justify-center text-3xl shadow-xl mb-5 flex-shrink-0 animate-bounce">
                    🤖
                    <span className="absolute -top-1 -right-1 text-xs">✨</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-100 mb-2">
                    Meet FinMate AI Copilot
                  </h3>
                  
                  <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                    I can query your budgets, transactions, savings, and wallets to give context-aware financial advice. Ask me anything or select a quick starter below:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {suggestedPrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handleSend(prompt.text)}
                        className="bg-slate-900/50 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-left text-xs font-semibold text-slate-300 p-3 rounded-xl transition-all duration-200 cursor-pointer hover:scale-[1.01] hover:shadow-lg active:scale-95 flex items-center justify-between"
                      >
                        <span>{prompt.label}</span>
                        <span className="text-slate-600 group-hover:text-slate-400 text-sm">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // Chat List
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === 'user';
                    const timeStr = msg.timestamp
                      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={msg._id || index}
                        className={`flex gap-3 max-w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* Bot icon avatar */}
                        {!isUser && (
                          <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/20 flex items-center justify-center text-sm shadow-md flex-shrink-0">
                            🤖
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-4 py-3 shadow-md border ${
                            isUser
                              ? 'bg-primary-600 border-primary-500/20 text-white rounded-tr-none max-w-[85%] sm:max-w-[70%]'
                              : 'bg-slate-850/90 border-slate-800 text-slate-100 rounded-tl-none max-w-[85%] sm:max-w-[75%] relative group flex flex-col'
                          }`}
                        >
                          <div className="text-xs sm:text-sm select-text whitespace-pre-wrap break-words">
                            {isUser ? (
                              msg.content
                            ) : (
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                                {msg.content}
                              </ReactMarkdown>
                            )}
                          </div>

                          {/* Footer with timestamp and copy button */}
                          <div className={`flex items-center justify-between gap-4 mt-2 pt-1 border-t border-slate-700/20 text-[10px] ${
                            isUser ? 'text-primary-200' : 'text-slate-500'
                          }`}>
                            <span>{timeStr}</span>
                            {!isUser && (
                              <button
                                onClick={() => handleCopyText(msg._id || index, msg.content)}
                                className="hover:text-slate-300 transition-colors p-0.5 rounded cursor-pointer hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-700"
                                aria-label="Copy AI response"
                                title="Copy Response"
                              >
                                {copiedId === (msg._id || index) ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* User icon avatar */}
                        {isUser && (
                          <div className="w-8 h-8 rounded-lg bg-primary-950 border border-primary-500/20 flex items-center justify-center text-sm shadow-md flex-shrink-0">
                            👤
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Typing / Loading state indicator inside message container */}
                  {isTyping && (
                    <div className="flex gap-3 justify-start" role="status" aria-live="polite">
                      <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/20 flex items-center justify-center text-sm shadow-md flex-shrink-0 animate-pulse">
                        🤖
                      </div>
                      <div className="bg-slate-850/90 border border-slate-800 text-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-md max-w-[85%] sm:max-w-[70%] flex flex-col">
                        <span className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                          FinMate AI is thinking...
                          <span className="flex gap-0.5 items-center">
                            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Ref to anchor end scroll */}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mx-4 sm:mx-6 mb-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => handleSend(input)}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-3 py-1 rounded-lg cursor-pointer transition-colors flex-shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Message Input Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900/30 flex-shrink-0">
              <div className="relative flex items-end gap-2 bg-slate-900 border border-slate-800 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 rounded-xl p-2 transition-all">
                <textarea
                  id="chat-input"
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  placeholder={loading ? 'Please wait...' : 'Ask FinMate anything about your finances...'}
                  className="flex-1 bg-transparent border-0 outline-none text-slate-100 placeholder-slate-500 text-sm py-1.5 px-2 resize-none max-h-[120px] focus:ring-0 focus:outline-none min-h-[38px] leading-relaxed"
                  aria-label="Ask FinMate anything about your finances"
                />
                
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg shadow transition-all duration-200 active:scale-95 flex items-center justify-center flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-800"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-center mt-2 px-1 text-[10px] text-slate-500">
                <span>Enter to send, Shift + Enter for new line.</span>
                <span>Powered by Gemini 2.5 Flash</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
