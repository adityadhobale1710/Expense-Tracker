import React from 'react';
import { Sparkles, HeartPulse } from 'lucide-react';

/**
 * Header AI Summary Card to welcome the user and display the top narrative summary
 */
export default function AISummaryCard({ userName, score, summary }) {
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const firstName = userName ? userName.split(' ')[0] : 'Aditya';

  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-between h-full">
      <div className="absolute top-4 right-4 text-[10px] font-black text-primary-400/40 uppercase tracking-widest flex items-center gap-1 pointer-events-none">
        <Sparkles size={12} /> Advisor Summary
      </div>
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-100 mb-4 tracking-tight">
          {getGreeting()}, {firstName}!
        </h2>
        
        <div className="flex items-center gap-3 mb-4 bg-slate-900/40 border border-slate-800 p-3.5 rounded-xl w-fit">
          <HeartPulse className="text-rose-500 w-5 h-5 flex-shrink-0" />
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              Financial Health
            </span>
            <span className="text-base font-black text-slate-100 leading-none">
              {score}/100
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold whitespace-pre-line">
          {summary || 'Analyzing your financial data matrices and compiling recommendations...'}
        </p>
      </div>
    </div>
  );
}
