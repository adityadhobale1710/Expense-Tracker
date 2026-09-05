import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import ChatWindow from '../../components/ai/ChatWindow/ChatWindow';

export default function AIAssistant() {
  const { user } = useAuth();
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
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);
  const isSendingRef = useRef(false);

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

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, autoScroll]);

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
    if (!text || loading || isSendingRef.current) return;

    isSendingRef.current = true;
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
      const { userMessage, aiMessage } = res.data.data;

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
      
      if (err.response?.status === 429) {
        const resetAt = err.response.data?.resetAt;
        let messageText = "Please wait a bit before sending more messages.";
        
        if (resetAt) {
          const resetTime = new Date(resetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          messageText = `**Notice:** Daily AI limit reached — resets at ${resetTime}.`;
        }
        
        const systemMsg = {
          _id: `system-${Date.now()}`,
          role: 'assistant',
          content: messageText,
          timestamp: new Date().toISOString(),
        };
        
        setMessages((prev) => {
          const newMsgs = prev.filter((m) => m._id !== tempUserMsg._id);
          return [...newMsgs, systemMsg];
        });
        setInput(text);
      } else {
        const friendlyErr = err.response?.data?.message || err.message || 'Unable to connect to the Gemini service. Please check your internet connection.';
        setError(friendlyErr);
        setInput(text);
        setMessages((prev) => prev.filter((m) => m._id !== tempUserMsg._id));
        toast.error('Failed to send message.');
      }
    } finally {
      isSendingRef.current = false;
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

  const handleNewChat = () => {
    setMessages([]);
    setError(null);
    setInput('');
  };

  return (
    <div className="flex w-full h-[calc(100vh-64px)] overflow-hidden relative ai-surface-main border-t border-ai-border">
      {/* Main Chat Container */}
      <ChatWindow 
        messages={messages}
        setMessages={setMessages}
        loading={loading}
        fetchLoading={fetchLoading}
        user={user}
        isTyping={isTyping}
        handleCopyText={handleCopyText}
        copiedId={copiedId}
        messagesEndRef={messagesEndRef}
        chatContainerRef={chatContainerRef}
        handleScroll={handleScroll}
        handleSend={handleSend}
        input={input}
        setInput={setInput}
        handleKeyDown={handleKeyDown}
        textareaRef={textareaRef}
        error={error}
        handleNewChat={handleNewChat}
      />
    </div>
  );
}
