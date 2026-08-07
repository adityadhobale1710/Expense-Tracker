import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Maximize2 } from 'lucide-react';

function CodeBlock({ className, children, ...props }) {
  const [copied, setCopied] = useState(false);
  const content = String(children).replace(/\n$/, '');
  
  // Extract language from className (e.g., "language-javascript")
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="my-6 rounded-xl border border-ai-border ai-surface-main shadow-ai-soft max-w-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 ai-surface-card border-b border-ai-border !rounded-b-none !shadow-none">
        <span className="text-[11px] font-bold text-ai-text-muted uppercase tracking-wider">
          {language || 'text'}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled
            className="flex items-center justify-center p-1.5 rounded-md text-slate-400 cursor-not-allowed"
            title="Expand (Placeholder)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-ai-text-muted hover:text-ai-text-primary hover:bg-ai-surface transition-colors focus:outline-none focus:ring-2 focus:ring-ai-primary/50"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-450">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      {/* Content */}
      <div className="overflow-x-auto p-4 md:p-5">
        <code className={`block text-[13.5px] text-ai-text-secondary font-mono leading-relaxed whitespace-pre ${className || ''}`} {...props}>
          {content}
        </code>
      </div>
    </div>
  );
}

const mdComponents = {
  h1: ({ children }) => <h1 className="text-[28px] font-bold text-ai-text-primary mt-8 mb-4 tracking-tight leading-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="text-[20px] font-semibold text-ai-text-primary mt-7 mb-3 tracking-tight leading-snug">{children}</h2>,
  h3: ({ children }) => <h3 className="text-[16px] font-semibold text-ai-text-primary mt-6 mb-3">{children}</h3>,
  h4: ({ children }) => <h4 className="text-[14px] font-medium text-ai-text-primary mt-5 mb-2">{children}</h4>,
  p: ({ children }) => <p className="text-[16px] font-medium text-ai-text-secondary leading-[1.7] mb-4 last:mb-0 whitespace-pre-wrap break-words tracking-wide">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 space-y-2 mb-4 text-ai-text-secondary font-medium text-[16px] leading-[1.7] marker:text-ai-placeholder">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 space-y-2 mb-4 text-ai-text-secondary font-medium text-[16px] leading-[1.7] marker:text-ai-placeholder">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ai-text-primary">{children}</strong>,
  em: ({ children }) => <em className="italic text-ai-text-muted">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-ai-primary bg-ai-light/30 pl-5 py-3 pr-4 my-6 rounded-r-xl italic text-ai-text-muted font-medium text-[16px] leading-relaxed">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-ai-border" />,
  code({ className, children, ...props }) {
    const content = String(children).replace(/\n$/, '');
    const isInline = !className && !content.includes('\n');
    return isInline ? (
      <code className="bg-ai-light text-ai-primary rounded-md px-1.5 py-0.5 text-[14px] font-mono mx-0.5" {...props}>
        {content}
      </code>
    ) : (
      <CodeBlock className={className} {...props}>
        {children}
      </CodeBlock>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-6 border border-ai-border rounded-xl shadow-ai-soft">
      <table className="w-full text-left border-collapse text-[14px] font-medium text-ai-text-secondary whitespace-nowrap">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-ai-surface border-b border-ai-border text-ai-text-primary font-semibold">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-ai-border">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-ai-surface/50 transition-colors">{children}</tr>,
  th: ({ children }) => <th className="px-5 py-3.5 font-semibold tracking-wide">{children}</th>,
  td: ({ children }) => <td className="px-5 py-3.5">{children}</td>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-ai-primary hover:text-ai-hover underline underline-offset-4 decoration-ai-primary/30 hover:decoration-ai-primary transition-colors font-medium">
      {children}
    </a>
  ),
};

export default function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {content}
    </ReactMarkdown>
  );
}
