import { Sparkles, HelpCircle, CheckCircle2, Lightbulb, AlertTriangle, XOctagon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GoalInsights({ insights = [], isLoading = false }) {
  const getLevelStyle = (level) => {
    switch (level) {
      case 'Positive':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/25',
          text: 'text-emerald-400',
          icon: <CheckCircle2 size={16} className="text-emerald-400" />
        };
      case 'Suggestion':
        return {
          bg: 'bg-amber-500/10 border-amber-500/25',
          text: 'text-amber-400',
          icon: <Lightbulb size={16} className="text-amber-400" />
        };
      case 'Warning':
        return {
          bg: 'bg-orange-500/10 border-orange-500/25',
          text: 'text-orange-400',
          icon: <AlertTriangle size={16} className="text-orange-400" />
        };
      case 'Critical':
        return {
          bg: 'bg-rose-500/10 border-rose-500/25',
          text: 'text-rose-400',
          icon: <XOctagon size={16} className="text-rose-400" />
        };
      default:
        return {
          bg: 'bg-slate-800/40 border-slate-700/30',
          text: 'text-slate-400',
          icon: <HelpCircle size={16} className="text-slate-400" />
        };
    }
  };

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">AI Insights & Audit</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Gemini cognitive audits detailing paces, spending leaks and adjustments</p>
        </div>
        <div className="p-2 rounded-xl bg-dark-900 border border-slate-800">
          <Sparkles size={16} className="text-primary-400" />
        </div>
      </div>

      {/* Body List */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-16 bg-dark-900 border border-slate-750 rounded-2xl animate-pulse" />
          <div className="h-16 bg-dark-900 border border-slate-750 rounded-2xl animate-pulse" />
        </div>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <p className="text-xs font-semibold text-slate-500">No cognitive insights compiled yet. Add contributions to map audits.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((item, index) => {
            const styles = getLevelStyle(item.level);
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`flex gap-3.5 p-4 border rounded-2xl backdrop-blur-sm ${styles.bg}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {styles.icon}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                    <span className={styles.text}>{item.level}</span>
                    {item.confidence && (
                      <span className="text-slate-500">{item.confidence}% Confidence</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    {item.message}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
