import React from 'react';
import { AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

export default function MessageList({ messages, user, isTyping, handleCopyText, copiedId, messagesEndRef }) {
  return (
    <div className="flex flex-col pb-4">
      <AnimatePresence initial={false}>
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const timeStr = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <MessageBubble
              key={msg._id || index}
              msg={msg}
              index={index}
              user={user}
              isUser={isUser}
              timeStr={timeStr}
              copiedId={copiedId}
              handleCopyText={handleCopyText}
            />
          );
        })}
      </AnimatePresence>

      {/* Typing / Loading state indicator inside message container */}
      {isTyping && <TypingIndicator />}

      {/* Ref to anchor end scroll */}
      <div ref={messagesEndRef} />
    </div>
  );
}
