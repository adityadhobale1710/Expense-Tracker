import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

/**
 * Priorities list recommendation cards containing estimated savings and links
 */
export default function RecommendationCard({ recommendations = [] }) {
  const getPriorityStyle = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return 'text-rose-450 bg-rose-500/10 border-rose-500/25';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
    }
  };

  const getLinkPath = (action) => {
    const act = String(action || '').toLowerCase();
    if (act.includes('goal')) return '/goals';
    if (act.includes('budget')) return '/budget';
    if (act.includes('subscription')) return '/subscriptions';
    if (act.includes('outlay') || act.includes('categorize') || act.includes('expense')) return '/expenses';
    if (act.includes('loan') || act.includes('emi')) return '/loans';
    return '/dashboard';
  };

  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <Sparkles size={14} className="text-primary-400" /> Actionable Recommendations
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec, idx) => (
          <div 
            key={idx} 
            className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:scale-[1.01] transition-all duration-300"
          >
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border ${getPriorityStyle(rec.priority)}`}>
                  {rec.priority} Priority
                </span>
                
                {rec.estimatedSavings > 0 && (
                  <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Est. Savings: ₹{rec.estimatedSavings.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              
              <h4 className="text-xs font-black uppercase tracking-wide text-slate-100 leading-tight">
                {rec.title}
              </h4>
              <p className="text-[11px] font-semibold text-slate-400 leading-relaxed mt-1.5">
                {rec.description}
              </p>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-700/20 flex justify-end">
              <Link
                to={getLinkPath(rec.action)}
                className="flex items-center gap-1 text-[10px] font-black uppercase text-primary-400 hover:text-primary-300 transition-colors"
              >
                <span>{rec.action || 'Get Started'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
