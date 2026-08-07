import React from 'react';
import { SearchX } from 'lucide-react';

export default function AnalyticsEmptyState({ 
  icon: Icon = SearchX, 
  title = "No Data Available", 
  message = "Add your first transaction to unlock insights.", 
  minHeight = "min-h-[200px]" 
}) {
  return (
    <div className={`flex flex-col items-center justify-center w-full ${minHeight} text-slate-500`}>
      <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3 text-slate-400">
        <Icon size={24} />
      </div>
      <h4 className="text-sm font-semibold text-slate-300 mb-1">{title}</h4>
      <p className="text-xs text-center max-w-[250px] leading-relaxed">{message}</p>
    </div>
  );
}
