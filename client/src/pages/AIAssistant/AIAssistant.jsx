export default function AIAssistant() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">🤖 AI Assistant</h1>
            <span className="px-2.5 py-1 text-xs font-bold bg-primary-500/15 border border-primary-500/30 text-primary-400 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
              Coming Soon
            </span>
          </div>
          <p className="page-subtitle">Conversational AI copilot for instant expense queries and voice commands</p>
        </div>
      </div>

      <div className="card min-h-[420px] flex flex-col items-center justify-center text-center p-8 sm:p-12 relative overflow-hidden border border-slate-800">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 rounded-3xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-4xl shadow-xl mb-6 relative">
          🤖
          <span className="absolute -top-1 -right-1 text-base">✨</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-slate-100 mb-2">
          AI Assistant Copilot — Coming Soon
        </h3>
        
        <p className="text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
          Our natural language finance agent with voice input recognition is currently in active development. Soon you'll be able to chat with your wallet data directly!
        </p>

        <div className="pt-6 border-t border-slate-800/80 w-full max-w-md">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Coming Soon in Next Platform Release
          </span>
        </div>
      </div>
    </div>
  );
}
