import React from 'react';
import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-4 justify-start max-w-full mt-6 md:mt-8"
      role="status"
      aria-live="polite"
    >
      <div className="w-8 h-8 rounded-full ai-surface-card flex items-center justify-center text-xs flex-shrink-0 mt-1">
        🤖
      </div>
      <div className="flex flex-col items-start w-full">
        <div className="flex items-center h-10 px-2">
          <div className="flex gap-1.5 items-center">
            <span className="w-2 h-2 rounded-full bg-ai-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-ai-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-ai-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
