import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import {
  Bot, User, Send, Copy, Check, AlertCircle, Plus, History, ArrowRight,
  Wallet, Target, FileText, BarChart2, Lightbulb, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

// ==========================================
// CONSTANTS
// ==========================================
const ACTION_CARDS = [
  {
    id: 'budget',
    title: 'Make Budget',
    description: 'Create a new budget and track your monthly spending.',
    prompt: 'Help me create a monthly budget.',
    icon: Wallet,
    color: 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/15',
  },
  {
    id: 'goal',
    title: 'Set a Goal',
    description: 'Define a savings goal and stay on track to achieve it.',
    prompt: 'Help me create a savings goal.',
    icon: Target,
    color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15',
  },
  {
    id: 'expense',
    title: 'Add Expense',
    description: 'Add a new expense and categorize your spending.',
    prompt: 'Help me categorize an expense.',
    icon: FileText,
    color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/15',
  },
  {
    id: 'spending',
    title: 'Spending Summary',
    description: 'See an overview of your spending and top categories.',
    prompt: 'Show my spending summary.',
    icon: BarChart2,
    color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/15',
  },
  {
    id: 'insights',
    title: 'Get Insights',
    description: 'Get personalized insights and smart financial tips.',
    prompt: 'Give me personalized financial insights.',
    icon: Lightbulb,
    color: 'text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-500/15',
  },
];

const SUGGESTED_CHIPS = [
  'How much did I spend this month?',
  'Where did I spend the most?',
  'Show my recent expenses',
  'Give me savings tips',
  'Is my budget on track?',
];

// ==========================================
// MODULAR SUB-COMPONENTS
// ==========================================

function QuickActionCard({ title, description, prompt, onClick, Icon, color }) {
  return (
    <button
      onClick={() => onClick(prompt)}
      className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md w-full flex flex-col items-start text-left group"
    >
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5">
        {title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal flex-1 mb-3">
        {description}
      </p>
      <div className="w-7 h-7 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:bg-primary-600 group-hover:text-white transition-colors">
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </button>
  );
}

function PromptChip({ text, onClick }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="bg-white dark:bg-dark-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 px-3.5 py-2 rounded-full transition-all duration-150 cursor-pointer shadow-sm active:scale-95 hover:border-primary-500/20"
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
      className="flex-1 flex flex-col items-center justify-center text-center max-w-5xl mx-auto px-4 py-8 overflow-y-auto w-full"
    >
      {/* Greeting */}
      <div className="mb-10">
        <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight flex items-center justify-center gap-2">
          <span className="inline-block">👋</span>
          Hello {firstName}!
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          How can I help you with your finances today?
        </p>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full mb-10">
        {ACTION_CARDS.map((card) => (
          <QuickActionCard
            key={card.id}
            title={card.title}
            description={card.description}
            prompt={card.prompt}
            Icon={card.icon}
            color={card.color}
            onClick={onPromptClick}
          />
        ))}
      </div>

      {/* Suggested Chips */}
      <div className="w-full">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
          You can also ask me anything like:
        </p>
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
        <div className="text-2xl">💬</div>
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
            className="w-full text-left text-xs bg-primary-500/10 dark:bg-primary-600/15 border-y border-r border-l-4 border-y-slate-200 border-r-slate-200 border-l-primary-600 dark:border-y-slate-700/60 dark:border-r-slate-700/60 dark:border-l-primary-500 text-primary-600 dark:text-primary-400 p-2.5 rounded-xl truncate flex flex-col gap-1 cursor-pointer font-semibold hover:bg-primary-500/15 dark:hover:bg-primary-600/20 transition-all duration-200 shadow-sm"
          >
            <span className="font-bold flex items-center gap-1.5 text-primary-600 dark:text-primary-400">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-600 dark:bg-primary-500" />
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
  const [aiModel, setAiModel] = useState('gemini-2.5-flash-lite');

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);

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
    setAutoScroll(true);

    const tempUserMsg = {
      _id: `temp-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await api.post('/ai/chat', { message: text }, { timeout: 45000, signal: controller.signal });
      const { userMessage, aiMessage, meta } = res.data.data;

      if (meta?.model) {
        setAiModel(meta.model);
      }

      setMessages((prev) => {
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
      if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error('AI chat error:', err);
      const friendlyErr = err.response?.data?.message || err.message || 'Unable to connect to the Gemini service. Please check your internet connection.';
      setError(friendlyErr);
      setInput(text);
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

  const mdComponents = {
    h1: ({ children }) => <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-4 mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-3 mb-1.5">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2 mb-1">{children}</h3>,
    p: ({ children }) => <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-7 mb-2.5 last:mb-0 whitespace-pre-wrap break-words">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 my-2 text-slate-700 dark:text-slate-300 text-[15px] leading-7">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 my-2 text-slate-700 dark:text-slate-300 text-[15px] leading-7">{children}</ol>,
    li: ({ children }) => <li className="text-slate-700 dark:text-slate-300 text-[15px] leading-7">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary-500 bg-slate-50 dark:bg-slate-800/40 pl-4 py-2 my-2 rounded-r-lg italic text-slate-500 dark:text-slate-400">
        {children}
      </blockquote>
    ),
    code({ className, children, ...props }) {
      const content = String(children).replace(/\n$/, '');
      const isInline = !className && !content.includes('\n');
      return isInline ? (
        <code className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-primary-600 dark:text-primary-400 font-mono" {...props}>
          {content}
        </code>
      ) : (
        <div className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 max-w-full">
          <code className={`block text-xs text-primary-600 dark:text-primary-400 font-mono leading-relaxed whitespace-pre ${className || ''}`} {...props}>
            {content}
          </code>
        </div>
      );
    },
    table: ({ children }) => (
      <div className="overflow-x-auto my-3 border border-slate-200 dark:border-slate-700 rounded-xl">
        <table className="w-full text-left border-collapse text-xs text-slate-600 dark:text-slate-300">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold uppercase">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">{children}</tbody>,
    tr: ({ children }) => <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">{children}</tr>,
    th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2">{children}</td>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:text-primary-500 underline font-medium transition-colors">
        {children}
      </a>
    ),
  };

  return (
    <div className="flex gap-6 animate-fade-in h-[calc(100vh-120px)] w-full overflow-hidden relative">
      {/* Backdrop overlay for mobile drawer */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-[1px] z-40"
        />
      )}

      {/* Sidebar for Recent Chats */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed md:relative inset-y-0 left-0 z-50 md:z-0 flex flex-col border-r border-slate-200 dark:border-slate-700/60 bg-white dark:bg-dark-800 p-4 shrink-0 overflow-hidden h-full gap-4 shadow-lg md:shadow-none rounded-r-2xl md:rounded-2xl"
          >
            <div className="flex items-center gap-2 w-full">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                <History className="w-4 h-4" />
              </div>
              <Button
                onClick={() => {
                  setMessages([]);
                  toast.success('Started a new conversation');
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                variant="primary"
                size="sm"
                icon={Plus}
                className="flex-1 text-xs"
              >
                New Chat
              </Button>
              {/* Close button for mobile drawer */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 flex-shrink-0"
                title="Close Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conversation list with dynamic empty states */}
            <ConversationList
              messages={messages}
              setMessages={setMessages}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full gap-4">
        {/* Header */}
        <div className="flex flex-row justify-between items-center gap-4 pb-3.5 border-b border-slate-200 dark:border-slate-700/60 flex-shrink-0 px-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
              🤖
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">AI Assistant</h1>
              <Badge variant="success" className="flex items-center gap-1 normal-case font-bold py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setSidebarOpen(prev => !prev)}
              variant="outline"
              size="sm"
              icon={History}
              title="Toggle History Sidebar"
              className="bg-white hover:bg-slate-50 border border-slate-200 dark:bg-dark-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm"
            >
              History
            </Button>

            <Button
              onClick={() => {
                setMessages([]);
                toast.success('Started a new conversation');
              }}
              variant="primary"
              size="sm"
              icon={Plus}
            >
              New Chat
            </Button>
          </div>
        </div>

        {/* Chat Area Container */}
        <div className="flex-1 flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-dark-800 relative shadow-sm rounded-2xl">
          {/* Loading History Skeleton */}
          {fetchLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <Bot className="w-12 h-12 text-slate-400 animate-pulse" />
              <div className="space-y-2 w-1/3">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-5/6 mx-auto" />
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
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs shadow-sm flex-shrink-0 text-slate-700 dark:text-slate-300">
                                🤖
                              </div>
                            )}

                            {isUser ? (
                              /* User Bubble (Right) */
                              <div className="flex flex-col items-end max-w-[90%] md:max-w-[80%]">
                                <div className="rounded-3xl px-5 py-3 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm select-text whitespace-pre-wrap break-words leading-relaxed text-[15px]">
                                  {msg.content}
                                </div>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 mr-2">{timeStr}</span>
                              </div>
                            ) : (
                              /* Assistant Bubble (Left) - ChatGPT Card Style */
                              <div className="flex flex-col items-start max-w-[95%] md:max-w-[85%] group">
                                <div className="rounded-2xl px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm relative flex flex-col w-full">
                                  <div className="text-[15px] select-text whitespace-pre-wrap break-words leading-relaxed text-slate-800 dark:text-slate-100">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                                      {msg.content}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 ml-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                  <span>{timeStr}</span>
                                  <button
                                    onClick={() => handleCopyText(msg._id || index, msg.content)}
                                    className="opacity-0 group-hover:opacity-100 transition-all duration-150 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/50 cursor-pointer focus:opacity-100 focus:outline-none"
                                    aria-label="Copy AI response"
                                    title="Copy Response"
                                  >
                                    {copiedId === (msg._id || index) ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}

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
                        className="flex gap-3 justify-start max-w-full"
                        role="status"
                        aria-live="polite"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs shadow-sm flex-shrink-0">
                          🤖
                        </div>
                        <div className="flex flex-col items-start max-w-[95%] md:max-w-[85%]">
                          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-5 py-3.5 shadow-sm flex flex-col items-center justify-center min-h-[44px]">
                            <div className="flex gap-1.5 items-center px-1">
                              <span className="w-2 h-2 rounded-full bg-primary-600 dark:bg-primary-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 rounded-full bg-primary-600 dark:bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 rounded-full bg-primary-600 dark:bg-primary-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
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
                <div className="mx-4 sm:mx-6 mb-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-500 dark:text-rose-500">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-500 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={() => handleSend(input)}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1 rounded-lg cursor-pointer transition-colors flex-shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Message Input Composer Footer */}
              <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-dark-900/20 flex-shrink-0">
                <div className="relative flex items-center bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700/80 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 rounded-3xl p-2 shadow-sm transition-all duration-150 h-[80px] max-w-4xl mx-auto w-full">
                  <textarea
                    ref={textareaRef}
                    id="chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    placeholder={loading ? 'Please wait...' : 'Ask FinMate anything about your finances...'}
                    className="w-full h-full bg-transparent border-0 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm resize-none overflow-y-auto focus:ring-0 focus:outline-none leading-relaxed py-2 px-3 flex-1"
                    aria-label="Ask FinMate anything about your finances"
                  />

                  <div className="flex-shrink-0 pr-1">
                    <button
                      onClick={() => handleSend()}
                      disabled={loading || !input.trim()}
                      className="w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95"
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