import { useMemo } from 'react';
import { Calendar, CreditCard, Landmark, Bell, AlertCircle, Clock } from 'lucide-react';

export default function UpcomingPayments({
  subscriptions = [],
  loans = [],
  currencySymbol = '₹'
}) {
  
  // Combine loans and subscriptions into a chronological timeline
  const timelineItems = useMemo(() => {
    const list = [];
    const now = new Date();

    // 1. Add Subscriptions
    subscriptions.forEach((sub) => {
      const renewalDate = new Date(sub.renewalDate);
      // If date is in the past, roll it over for display convenience
      if (renewalDate < now) {
        if (sub.billingCycle === 'monthly') {
          renewalDate.setMonth(now.getMonth());
          if (renewalDate < now) renewalDate.setMonth(now.getMonth() + 1);
        } else {
          renewalDate.setFullYear(now.getFullYear());
          if (renewalDate < now) renewalDate.setFullYear(now.getFullYear() + 1);
        }
      }

      list.push({
        id: `sub_${sub._id}`,
        name: sub.name,
        amount: sub.cost,
        date: renewalDate,
        type: 'subscription',
        icon: <CreditCard className="text-teal-400" size={14} />,
        color: 'border-teal-500/25 bg-teal-500/10 text-teal-400'
      });
    });

    // 2. Add Loans EMIs
    loans.forEach((loan) => {
      const emiDate = new Date(loan.nextEmiDate);
      if (emiDate < now) {
        emiDate.setMonth(now.getMonth());
        if (emiDate < now) emiDate.setMonth(now.getMonth() + 1);
      }

      list.push({
        id: `loan_${loan._id}`,
        name: `${loan.name} EMI`,
        amount: loan.emiAmount,
        date: emiDate,
        type: 'emi',
        icon: <Landmark className="text-orange-400" size={14} />,
        color: 'border-orange-500/25 bg-orange-500/10 text-orange-400'
      });
    });

    // Sort chronologically
    list.sort((a, b) => a.date - b.date);

    return list.slice(0, 5); // display top 5 upcoming
  }, [subscriptions, loans]);

  const getDaysRemainingLabel = (targetDate) => {
    const diff = targetDate - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-5 flex-1 justify-between">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Upcoming Ledger Reminders</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Chronological timeline of upcoming subscriptions & EMIs</p>
        </div>
        <div className="p-2 rounded-xl bg-dark-900 border border-slate-800">
          <Clock size={16} className="text-primary-400" />
        </div>
      </div>

      {/* Timeline List */}
      <div className="relative pl-4 space-y-5 py-2 flex-grow">
        {/* Vertical Center Axis Line */}
        <div className="absolute top-0 bottom-0 left-[23px] w-0.5 bg-slate-800" />

        {timelineItems.length > 0 ? (
          timelineItems.map((item) => (
            <div key={item.id} className="relative flex items-start gap-4 text-xs">
              
              {/* Timeline Bullet Anchor */}
              <div className={`z-10 p-2 rounded-xl border flex items-center justify-center bg-dark-900 shadow-md ${item.color}`}>
                {item.icon}
              </div>

              {/* Contents box */}
              <div className="flex-1 min-w-0 bg-dark-900/50 border border-slate-850 p-3 rounded-2xl flex justify-between items-center hover:border-slate-800 transition-colors">
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-200 truncate">{item.name}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    {item.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                
                <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="font-black text-slate-100 font-mono">
                    {currencySymbol}{item.amount.toLocaleString('en-IN')}
                  </span>
                  <span className="px-2 py-0.5 text-[8px] font-extrabold uppercase bg-dark-900 border border-slate-800 text-primary-450 rounded-lg">
                    {getDaysRemainingLabel(item.date)}
                  </span>
                </div>
              </div>

            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-dark-900/40 border border-slate-850 rounded-3xl text-center space-y-2 mt-4">
            <Bell size={24} className="text-slate-655" />
            <p className="text-[11px] font-bold text-slate-450">No Impending Expenses</p>
            <p className="text-[9px] text-slate-550">Active subscriptions and loans will populate reminder intervals automatically.</p>
          </div>
        )}
      </div>

    </div>
  );
}
