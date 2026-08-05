import React from 'react';
import { Clock } from 'lucide-react';

/**
 * SubscriptionInsights to track active renewals and potential duplications
 */
export default function SubscriptionInsights({ subscriptions = {} }) {
  const fmt = (v) => (v ?? 0).toLocaleString('en-IN');
  const duplicates = subscriptions.duplicates || [];

  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-5 shadow-lg space-y-4">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pointer-events-none">
        <Clock size={14} className="text-primary-400" /> Subscription Auditor
      </h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Monthly Cost</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">₹{fmt(subscriptions.monthlySubscriptionCost)}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Yearly Cost</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">₹{fmt(subscriptions.yearlyCost)}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Unused Contracts</span>
          <span className="text-sm font-bold text-slate-200 block mt-1 text-amber-400">{subscriptions.unusedSubscriptionsCount || 0} Services</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-500 uppercase block">Upcoming Renewals</span>
          <span className="text-sm font-bold text-slate-200 block mt-1">{subscriptions.upcomingRenewalsCount || 0} Active</span>
        </div>
      </div>
      
      {duplicates.length > 0 && (
        <div className="pt-3 border-t border-slate-700/30 space-y-2">
          <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">
            Duplicate Warnings
          </span>
          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {duplicates.map((dup, idx) => (
              <div 
                key={idx} 
                className="bg-amber-500/5 border border-amber-500/15 p-2 rounded-xl text-[10px] text-amber-300 leading-normal"
              >
                <span className="font-bold text-amber-400 block">{dup.title}</span>
                <span className="text-slate-400 mt-0.5 block font-medium">{dup.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
