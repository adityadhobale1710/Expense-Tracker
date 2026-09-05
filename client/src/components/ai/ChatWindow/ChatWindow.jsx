import React from 'react';
import { Bot, AlertCircle, Plus } from 'lucide-react';

import toast from 'react-hot-toast';
import WelcomeScreen from './WelcomeScreen';
import MessageList from './MessageList';
import ChatInput from '../ChatInput/ChatInput';

export default function ChatWindow({
  messages, setMessages, loading, fetchLoading,
  user, isTyping, handleCopyText, copiedId, messagesEndRef, chatContainerRef,
  handleScroll, handleSend, input, setInput, handleKeyDown, textareaRef, error, handleNewChat
}) {
  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Chat Area Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Loading History Skeleton */}
        {fetchLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Bot className="w-12 h-12 text-slate-450 animate-pulse" />
            <div className="space-y-2 w-1/3">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-5/6 mx-auto" />
            </div>
          </div>
        ) : (
          <>
            {/* AI Header */}
            <div className="flex items-center justify-between py-4 px-6 md:px-8 border-b border-ai-border ai-surface-main z-10 shrink-0">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[20px] font-semibold text-ai-text-primary tracking-tight flex items-center gap-2">
                    🤖 AI Assistant
                  </span>
                  <span className="w-2 h-2 rounded-full bg-ai-success shadow-[0_0_6px_rgba(16,185,129,0.4)]"></span>
                </div>
                <span className="text-[12px] font-medium text-ai-text-muted mt-0.5">Your AI Finance Assistant</span>
              </div>

              {/* New Chat Button */}
              <button
                onClick={handleNewChat}
                className="ai-btn-primary h-10 px-4 md:px-5 flex items-center gap-2 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-ai-primary/50 focus:ring-offset-1"
                aria-label="New Chat"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Chat</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>

            {/* Message Box */}
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto min-h-0 w-full"
            >
              <div className="max-w-[900px] mx-auto w-full px-4 sm:px-6 md:px-8 py-6 md:py-10 h-full flex flex-col">
                {messages.length === 0 ? (
                  <WelcomeScreen 
                    userName={user?.name} 
                    onPromptClick={handleSend} 
                    loading={loading}
                  />
                ) : (
                  <MessageList 
                    messages={messages}
                    user={user}
                    isTyping={isTyping}
                    handleCopyText={handleCopyText}
                    copiedId={copiedId}
                    messagesEndRef={messagesEndRef}
                  />
                )}
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mx-4 sm:mx-6 mb-2 p-3 bg-ai-error/10 border border-ai-error/30 rounded-xl flex items-center justify-between gap-3 text-xs text-ai-error">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-ai-error flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => handleSend(input)}
                  className="bg-ai-error hover:opacity-90 text-white font-bold px-3 py-1 rounded-lg cursor-pointer transition-colors flex-shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Message Input Composer Footer */}
            <ChatInput 
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              handleKeyDown={handleKeyDown}
              loading={loading}
              textareaRef={textareaRef}
            />
          </>
        )}
      </div>
    </div>
  );
}
