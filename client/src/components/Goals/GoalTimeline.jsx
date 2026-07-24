import { Check, Calendar } from 'lucide-react';
import { generateMilestonesTimeline } from '../../utils/goalCalculations';

export default function GoalTimeline({ goal = {}, contributions = [] }) {
  const timeline = generateMilestonesTimeline(goal, contributions);

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-5">
      <div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Milestones Timeline</h3>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Chronological record of goal initiation and progress thresholds crossed</p>
      </div>

      <div className="relative border-l border-slate-700/65 ml-3.5 pl-6 space-y-6">
        {timeline.map((item, index) => {
          const isReached = item.reached;
          
          return (
            <div key={index} className="relative flex flex-col space-y-1">
              {/* Dot badge */}
              <div 
                className={`absolute -left-[35px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border text-[9px] font-black transition-all ${isReached ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/5' : 'bg-dark-900 border-slate-700 text-slate-500'}`}
              >
                {isReached ? <Check size={10} strokeWidth={3} /> : index + 1}
              </div>

              {/* Title & Date */}
              <div className="flex justify-between items-start">
                <h4 className={`text-xs font-bold ${isReached ? 'text-slate-200' : 'text-slate-500'}`}>
                  {item.title}
                </h4>
                {item.date && (
                  <span className="text-[9px] font-semibold text-slate-500 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-[10px] text-slate-400 font-medium">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
