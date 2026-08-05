import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { 
  Bot, User, Send, Copy, Check, AlertCircle, Plus, History, ChevronRight, 
  Wallet, Target, PlusCircle, BarChart2, Sparkles 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// CONSTANTS
// ==========================================
const ACTION_CARDS = [
  {
    id: 'budget',
    title: 'Create Budget',
    description: 'Create and manage monthly budgets.',
    prompt: 'Help me create a monthly budget.',
    icon: Wallet,
  },
  {
    id: 'goal',
    title: 'Create Goal',
    description: 'Create savings goals and track progress.',
    prompt: 'Help me create a savings goal.',
    icon: Target,
  },
  {
    id: 'expense',
    title: 'Add Expense',
    description: 'Record and categorize expenses quickly.',
    prompt: 'Help me categorize an expense.',
    icon: PlusCircle,
  },
  {
    id: 'spending',
    title: 'Spending Summary',
    description: 'Analyze monthly spending patterns.',
    prompt: 'Show my spending summary.',
    icon: BarChart2,
  },
  {
    id: 'insights',
    title: 'Financial Insights',
    description: 'Receive personalized financial insights.',
    prompt: 'Give me personalized financial insights.',
    icon: Sparkles,
  },
];

const SUGGESTED_CHIPS = [
  'How much did I spend this month?',
  'Create a monthly budget',
  'Analyze my expenses',
  'Review my goals',
  'Give me saving tips',
  'Where did I spend most?',
];

// ==========================================
// MODULAR SUB-COMPONENTS
// ==========================================

function QuickActionCard({ title, description, prompt, onClick, Icon }) {
  return (
    <button
      onClick={() => onClick(prompt)}
      className="card flex flex-col items-start text-left p-5 hover:border-primary-500/30 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg w-full"
    >
      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
        {title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal flex-1">
        {description}
      </p>
      <div className="flex items-center gap-1 mt-3 text-[10px] font-bold text-slate-400 group-hover:text-primary-500 transition-colors">
        <span>Get started</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </button>
  );
}

function PromptChip({ text, onClick }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 px-3.5 py-2 rounded-full transition-all duration-150 cursor-pointer shadow-sm active:scale-95"
    >
      {text}
    </button>
  );
}

function WelcomeScreen({ userName, onPromptClick }) {
  const firstName = userName ? userName.split(' ')[0] : 'Aditya';
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="flex-1 flex flex-col items-center justify-center text-center max-w-5xl mx-auto px-4 py-8 overflow-y-auto"
    >
      <div className="w-14 h-14 rounded-2xl bg-primary-600 border border-primary-500/20 flex items-center justify-center text-2.5xl shadow-md mb-6 flex-shrink-0">
        🤖
      </div>
      
      <h3 className="text-2.5xl sm:text-3.5xl font-extrabold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">
        👋 Hello {firstName}!
      </h3>
      
      <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mb-8 max-w-md">
        How can I help with your finances today?
      </p>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full mb-8">
        {ACTION_CARDS.map((card) => (
          <QuickActionCard
            key={card.id}
            title={card.title}
            description={card.description}
            prompt={card.prompt}
            Icon={card.icon}
            onClick={onPromptClick}
          />
        ))}
      </div>

      {/* Suggested Chips */}
      <div className="w-full">
        <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          Suggested Prompts
        </h5>
        <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
          {SUGGESTED_CHIPS.map((chip, idx) => (
            <PromptChip key={idx} text={chip} onClick={onPromptClick} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ConversationList({ messages, setMessages }) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500 dark:text-slate-400 gap-2">
        <div className="text-3xl">💬</div>
        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">No conversations yet</h5>
        <p className="text-[10px] leading-normal max-w-[180px] text-slate-400 dark:text-slate-500">
          Start a conversation with FinMate.
        </p>
      </div>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const lastMsgText = lastMessage?.content || 'Conversation summary';

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
      <div>
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Today</h4>
        <div className="space-y-1">
          <button
            onClick={() => {
              toast.success('Viewing active chat session');
            }}
            className="w-full text-left text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 p-2.5 rounded-xl truncate flex flex-col gap-1 cursor-pointer font-medium hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-all duration-200"
          >
            <span className="font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              Active Finance Chat
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full">
              {lastMsgText}
            </span>
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Yesterday</h4>
        <div className="space-y-1 opacity-60">
          <div className="text-[10px] italic text-slate-400 px-2 py-1">No previous chats</div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function AIAssistant() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [aiModel, setAiModel] = useState('gemini-2.5-flash-lite'); // L5: updated from response

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const abortControllerRef = useRef(null); // L4: holds the active AbortController
  const textareaRef = useRef(null);

  // Auto-resize textarea height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to calculate scrollHeight correctly
    textarea.style.height = 'auto';

    // Set height based on scroll height
    const scrollHeight = textarea.scrollHeight;
    
    // Set textarea height bounded between 36px and 110px.
    // Together with padding and the send button row, the composer container height
    // will stay between 80px and 180px.
    textarea.style.height = `${Math.min(Math.max(36, scrollHeight), 110)}px`;
  }, [input]);

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

    // L4: abort any in-flight chat request when the component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
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

    // L4: create a fresh AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await api.post('/ai/chat', { message: text }, { timeout: 45000, signal: controller.signal });
      const { userMessage, aiMessage, meta } = res.data.data;

      // L5: update footer model label from the response if provided
      if (meta?.model) {
        setAiModel(meta.model);
      }

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
      // L4: silently ignore abort errors — caused by navigation/unmount, not a real error
      if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
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
    h1: ({ children }) => <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-3 mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2 mb-1.5">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2 mb-1">{children}</h3>,
    p: ({ children }) => <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">{children}</ol>,
    li: ({ children }) => <li className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary-500 bg-slate-100/50 dark:bg-slate-800/40 pl-4 py-2 my-2 rounded-r-lg italic text-slate-500">
        {children}
      </blockquote>
    ),
    code({ className, children, ...props }) {
      const content = String(children).replace(/\n$/, '');
      const isInline = !className && !content.includes('\n');
      return isInline ? (
        <code className="bg-slate-200/60 dark:bg-slate-950/60 border border-slate-300/80 dark:border-slate-800/80 rounded px-1.5 py-0.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-mono" {...props}>
          {content}
        </code>
      ) : (
        <div className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-4 max-w-full">
          <code className={`block text-xs text-indigo-600 dark:text-indigo-300 font-mono leading-relaxed whitespace-pre ${className || ''}`} {...props}>
            {content}
          </code>
        </div>
      );
    },
    table: ({ children }) => (
      <div className="overflow-x-auto my-3 border border-slate-200 dark:border-slate-700/50 rounded-xl">
        <table className="w-full text-left border-collapse text-xs text-slate-600 dark:text-slate-300">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 font-bold uppercase">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">{children}</tbody>,
    tr: ({ children }) => <tr className="hover:bg-slate-100/30 dark:hover:bg-slate-800/30 transition-colors">{children}</tr>,
    th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2">{children}</td>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:text-primary-500 underline font-medium transition-colors">
        {children}
      </a>
    ),
  };

  return (
    <div className="flex gap-6 animate-fade-in h-[calc(100vh-120px)] w-full overflow-hidden">
      {/* Sidebar for Recent Chats */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-dark-900/15 p-4 shrink-0 overflow-hidden h-full gap-4"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                <History className="w-4 h-4" />
              </div>
              <button
                onClick={() => {
                  setMessages([]);
                  toast.success('Started a new conversation');
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs rounded-xl transition-all duration-150 cursor-pointer active:scale-95 shadow border border-primary-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                New Chat
              </button>
            </div>

            {/* Conversation list with dynamic empty states */}
            <ConversationList 
              messages={messages} 
              setMessages={setMessages} 
            />

            {/* Sidebar Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-850 text-[10px] text-slate-400 flex justify-between items-center">
              <span>FinMate AI</span>
              <span>v1.2</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full gap-4">
        {/* Header */}
        <div className="flex flex-row justify-between items-center gap-4 pb-3.5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 px-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">AI Assistant</h1>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-full flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5 hidden sm:block">Conversational finance copilot</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 transition-colors cursor-pointer border border-slate-200 dark:border-slate-800"
              title="Toggle History Sidebar"
            >
              <History className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => {
                setMessages([]);
                toast.success('Started a new conversation');
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs rounded-xl shadow active:scale-95 transition-all duration-150 cursor-pointer border border-primary-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              New Chat
            </button>
          </div>
        </div>

        {/* Chat Area Container */}
        <div className="flex-1 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-dark-800/10 relative shadow-md rounded-2xl">
          {/* Loading History Skeleton */}
          {fetchLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <Bot className="w-12 h-12 text-slate-450 animate-pulse" />
              <div className="space-y-2 w-1/3">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-5/6 mx-auto" />
              </div>
            </div>
          ) : (
            <>
              {/* Message Box */}
              <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 min-h-0"
              >
                {messages.length === 0 ? (
                  <WelcomeScreen 
                    userName={user?.name} 
                    onPromptClick={handleSend} 
                  />
                ) : (
                  // Chat List
                  <div className="space-y-6">
                    <AnimatePresence initial={false}>
                      {messages.map((msg, index) => {
                        const isUser = msg.role === 'user';
                        const timeStr = msg.timestamp
                          ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                          <motion.div
                            key={msg._id || index}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            className={`flex gap-3 max-w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                          >
                            {/* Bot icon avatar */}
                            {!isUser && (
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-indigo-950 border border-slate-200 dark:border-indigo-500/20 flex items-center justify-center text-xs shadow-sm flex-shrink-0 text-slate-700 dark:text-slate-350">
                                🤖
                              </div>
                            )}

                            <div
                              className={`rounded-2xl px-4 py-3 shadow-sm border group relative flex flex-col ${
                                isUser
                                  ? 'bg-primary-600 border-0 text-white rounded-tr-none max-w-[85%] sm:max-w-[70%]'
                                  : 'bg-white dark:bg-dark-800 border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-tl-none max-w-[85%] sm:max-w-[75%]'
                              }`}
                            >
                              <div className="text-xs sm:text-sm select-text whitespace-pre-wrap break-words leading-relaxed">
                                {isUser ? (
                                  msg.content
                                ) : (
                                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                                    {msg.content}
                                  </ReactMarkdown>
                                )}
                              </div>

                              {/* Footer with timestamp and copy button */}
                              <div className={`flex items-center justify-between gap-4 mt-2.5 pt-1.5 border-t border-slate-700/10 text-[10px] ${
                                isUser ? 'text-primary-200' : 'text-slate-400 dark:text-slate-500'
                              }`}>
                                <span>{timeStr}</span>
                                {!isUser && (
                                  <button
                                    onClick={() => handleCopyText(msg._id || index, msg.content)}
                                    className="opacity-0 group-hover:opacity-100 transition-all duration-155 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-slate-700"
                                    aria-label="Copy AI response"
                                    title="Copy Response"
                                  >
                                    {copiedId === (msg._id || index) ? (
                                      <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* User icon avatar */}
                            {isUser && (
                              <div className="w-8 h-8 rounded-full bg-primary-600 border border-primary-500/20 flex items-center justify-center text-xs text-white shadow flex-shrink-0 font-semibold uppercase">
                                {user?.name ? user.name.substring(0, 2) : 'ME'}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {/* Typing / Loading state indicator inside message container */}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3 justify-start"
                        role="status"
                        aria-live="polite"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-indigo-950 border border-slate-200 dark:border-indigo-500/20 flex items-center justify-center text-xs shadow-sm flex-shrink-0">
                          🤖
                        </div>
                        <div className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm max-w-[85%] sm:max-w-[70%] flex flex-col">
                          <span className="text-xs text-slate-400 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                            FinMate AI is thinking...
                            <span className="flex gap-0.5 items-center">
                              <span className="w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                          </span>
                        </div>
                      </motion.div>
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

              {/* Message Input Composer Footer */}
              <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-900/10 flex-shrink-0">
                <div className="relative flex flex-col justify-between bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 rounded-[24px] p-2.5 shadow-md transition-all duration-150 min-h-[80px] max-h-[180px] max-w-4xl mx-auto w-full">
                  <textarea
                    ref={textareaRef}
                    id="chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    placeholder={loading ? 'Please wait...' : 'Ask FinMate anything about your finances...'}
                    className="w-full bg-transparent border-0 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-[16px] resize-none focus:ring-0 focus:outline-none overflow-y-auto leading-relaxed py-1 px-3 min-h-[36px] max-h-[110px] flex-1"
                    aria-label="Ask FinMate anything about your finances"
                  />
                  
                  <div className="flex justify-end items-center mt-1 px-2">
                    <button
                      onClick={() => handleSend()}
                      disabled={loading || !input.trim()}
                      className="w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed text-white shadow active:scale-95 flex items-center justify-center flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-150 hover:scale-102"
                      aria-label="Send message"
                    >
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
