import React from 'react';
import { Target, AlertCircle } from 'lucide-react';

/**
 * GoalInsights to display active goals milestone statuses and acceleration requirements
 */
export default function GoalInsights({ goals = {} }) {
  const fmt = (v) => (v ?? 0).toLocaleString('en-IN');
  const list = goals.goalsList || [];

  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg space-y-4">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pointer-events-none">
        <Target size={14} className="text-primary-400" /> Goal Intelligence
      </h4>
      
      <div className="grid grid-cols-2 gap-4 border-b border-slate-700/30 pb-4">
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Total Goals</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">{goals.totalGoals || 0}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Completed Goals</span>
          <span className="text-sm font-bold text-emerald-400 block mt-1">{goals.completedGoals || 0}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Active Goals</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">{goals.activeGoals || 0}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Goal Completion %</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">{goals.goalCompletionPct || 0}%</span>
        </div>
      </div>

      {/* Active goals milestones progress */}
      <div className="space-y-3">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
          Target Progress Breakdown
        </span>
        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
          {list.map((g, idx) => (
            <div 
              key={idx} 
              className="bg-slate-900/30 border border-slate-800 p-3 rounded-xl text-xs font-semibold text-slate-350 space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200 truncate max-w-[120px]">{g.title}</span>
                <span className="text-[8px] font-black uppercase text-primary-400 border border-primary-500/20 px-1.5 py-0.5 rounded bg-primary-500/5">
                  {g.priority}
                </span>
              </div>
              
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${g.progress}%` }} />
              </div>
              
              <div className="flex justify-between items-center text-[9px] text-slate-400">
                <span>Progress: {g.progress}%</span>
                <span>Target Date: {g.projectedCompletion}</span>
              </div>
              
              {g.isBehind && (
                <div className="text-[9px] text-amber-400 font-bold flex items-center gap-1 bg-amber-500/5 border border-amber-500/10 p-1.5 rounded-lg">
                  <AlertCircle size={10} className="flex-shrink-0" />
                  <span>Behind Schedule: Need ₹{fmt(g.neededPerMonth)}/month</span>
                </div>
              )}
            </div>
          ))}
          
          {list.length === 0 && (
            <span className="text-[10px] text-slate-500 italic block py-2 text-center">
              No active saving goals to display.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
