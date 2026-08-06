import React, { useEffect, useRef } from 'react';
import { Send, Paperclip, Mic, Image as ImageIcon } from 'lucide-react';

export default function ChatInput({ input, setInput, handleSend, handleKeyDown, loading, textareaRef }) {
  const localRef = useRef(null);
  
  // Use the passed ref if it exists, otherwise fallback to localRef
  const activeRef = textareaRef || localRef;

  useEffect(() => {
    // Auto-grow textarea functionality
    const textarea = activeRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      // Set a max height in pixels (roughly 7-8 lines)
      const maxHeight = 160;
      if (textarea.scrollHeight <= maxHeight) {
        textarea.style.height = `${textarea.scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
      } else {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
      }
    }
  }, [input, activeRef]);

  const onInputChange = (e) => {
    setInput(e.target.value);
  };

  return (
    <div className="flex-shrink-0 w-full bg-transparent px-4 pb-4 sm:px-6 md:px-8">
      <div className="max-w-[900px] mx-auto w-full flex flex-col gap-2">
        
        {/* Main Composer Container */}
        <div className="relative flex flex-col ai-surface-composer focus-within:ring-2 focus-within:ring-ai-primary/20 focus-within:border-ai-primary transition-all duration-200">
          
          {/* Textarea */}
          <textarea
            ref={activeRef}
            id="chat-input"
            value={input}
            onChange={onInputChange}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={loading ? 'Please wait...' : 'Ask anything about your finances...'}
            className="w-full bg-transparent border-0 outline-none text-[#111827] font-medium text-[16px] placeholder:text-[#64748B] placeholder:font-normal dark:text-[#F8FAFC] dark:placeholder:text-[#94A3B8] resize-none focus:ring-0 leading-relaxed py-4 px-4 min-h-[56px] max-h-[160px]"
            aria-label="Ask anything about your finances"
            rows={1}
          />
          
          {/* Bottom Toolbar & Send Button */}
          <div className="flex items-center justify-between px-3 pb-3">
            
            {/* Future Toolbar Options */}
            <div className="flex items-center gap-1">
              <button 
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-not-allowed focus:outline-none"
                aria-label="Attach File (placeholder)"
                title="Attach File"
                disabled
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button 
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-not-allowed focus:outline-none"
                aria-label="Voice Input (placeholder)"
                title="Voice Input"
                disabled
              >
                <Mic className="w-5 h-5" />
              </button>
              <button 
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-not-allowed focus:outline-none"
                aria-label="Upload Image (placeholder)"
                title="Upload Image"
                disabled
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="w-9 h-9 ai-btn-primary !rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-ai-primary/50 focus:ring-offset-1"
              aria-label="Send message"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center px-4">
          <p className="text-[11.5px] text-slate-400 dark:text-slate-500 font-medium">
            AI responses may contain mistakes. Verify important financial decisions.
          </p>
        </div>

      </div>
    </div>
  );
}
