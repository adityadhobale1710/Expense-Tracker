import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Common ErrorState component to display friendly errors and a retry action
 */
export default function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border border-rose-500/25 bg-rose-500/5 rounded-2xl space-y-4">
      <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-450 flex items-center justify-center">
        <AlertCircle size={20} />
      </div>
      <h3 className="text-sm font-bold text-rose-450 uppercase tracking-wider">
        Insight Execution Error
      </h3>
      <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
        {error || 'Unable to complete financial calculations. Please verify your internet connection.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-rose-550 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer active:scale-95 shadow border border-rose-500/30"
        >
          Retry Pipeline
        </button>
      )}
    </div>
  );
}
