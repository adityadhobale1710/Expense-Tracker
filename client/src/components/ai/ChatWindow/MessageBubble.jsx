import React from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, RefreshCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

export default function MessageBubble({ msg, index, user, isUser, timeStr, copiedId, handleCopyText }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className={`flex gap-4 w-full ${isUser ? 'justify-end mt-4 md:mt-6' : 'justify-start mt-6 md:mt-8'} ${index === 0 ? '!mt-0' : ''}`}
    >
      {/* Bot icon avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs shadow-sm flex-shrink-0 text-slate-700 dark:text-slate-300 mt-1">
          🤖
        </div>
      )}

      {isUser ? (
        /* User Bubble (Right) */
        <div className="flex flex-col items-end max-w-[92%] md:max-w-[70%]">
          <div className="px-5 py-3.5 ai-msg-user select-text whitespace-pre-wrap break-words leading-relaxed text-[15.5px]">
            {msg.content}
          </div>
        </div>
      ) : (
        /* Assistant Bubble (Left) */
        <div className="flex flex-col items-start w-full max-w-[900px] group">
          <div className="relative flex flex-col w-full text-slate-800 dark:text-slate-100 pb-2">
            <div className="text-[15.5px] select-text whitespace-pre-wrap break-words ai-msg-assistant">
              <MarkdownRenderer content={msg.content} />
            </div>
          </div>
          
          {/* Action Row */}
          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => handleCopyText(msg._id || index, msg.content)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:opacity-100 focus:outline-none"
              aria-label="Copy response"
              title="Copy"
            >
              {copiedId === (msg._id || index) ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 dark:text-slate-600 cursor-not-allowed focus:outline-none"
              aria-label="Regenerate response (placeholder)"
              title="Regenerate"
              disabled
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 dark:text-slate-600 cursor-not-allowed focus:outline-none"
              aria-label="Thumbs up (placeholder)"
              title="Helpful"
              disabled
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 dark:text-slate-600 cursor-not-allowed focus:outline-none"
              aria-label="Thumbs down (placeholder)"
              title="Not helpful"
              disabled
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
