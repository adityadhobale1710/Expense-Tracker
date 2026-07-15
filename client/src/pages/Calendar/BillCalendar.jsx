import { useState } from 'react';
import toast from 'react-hot-toast';

const RECURRING_BILLS = [
  { id: "rp-1", name: "Apartment Rent Auto-pay", amount: 1800, date: "2026-07-01", type: "Rent", icon: "🏠", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { id: "rp-2", name: "Netflix Premium", amount: 22.99, date: "2026-07-05", type: "Subscription", icon: "🎬", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  { id: "rp-3", name: "Adobe Creative Cloud", amount: 54.99, date: "2026-07-12", type: "Subscription", icon: "💻", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  { id: "rp-4", name: "Clean Energy Electric Bill", amount: 115.00, date: "2026-07-15", type: "Bill", icon: "💡", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  { id: "rp-5", name: "Gym Membership", amount: 65.00, date: "2026-07-20", type: "Subscription", icon: "🏥", color: "text-green-400 bg-green-500/10 border-green-500/20" },
  { id: "rp-6", name: "Emergency Savings Transfer", amount: 500.00, date: "2026-07-25", type: "Saving", icon: "🎯", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" }
];

export default function BillCalendar() {
  const [currentMonth, setCurrentMonth] = useState('July 2026');

  // We'll hardcode July 2026 calendar data for visual perfection
  // July 2026 starts on Wednesday, so we have 3 empty cells at start (Sun, Mon, Tue)
  const calendarDays = [
    { day: 28, isCurrentMonth: false, bills: [] },
    { day: 29, isCurrentMonth: false, bills: [] },
    { day: 30, isCurrentMonth: false, bills: [] },
    { day: 1, isCurrentMonth: true, bills: [RECURRING_BILLS[0]] },
    { day: 2, isCurrentMonth: true, bills: [] },
    { day: 3, isCurrentMonth: true, bills: [] },
    { day: 4, isCurrentMonth: true, bills: [] },
    { day: 5, isCurrentMonth: true, bills: [RECURRING_BILLS[1]] },
    { day: 6, isCurrentMonth: true, bills: [] },
    { day: 7, isCurrentMonth: true, bills: [] },
    { day: 8, isCurrentMonth: true, bills: [] },
    { day: 9, isCurrentMonth: true, bills: [] },
    { day: 10, isCurrentMonth: true, bills: [] },
    { day: 11, isCurrentMonth: true, bills: [] },
    { day: 12, isCurrentMonth: true, bills: [RECURRING_BILLS[2]] },
    { day: 13, isCurrentMonth: true, bills: [] },
    { day: 14, isCurrentMonth: true, bills: [] },
    { day: 15, isCurrentMonth: true, bills: [RECURRING_BILLS[3]] },
    { day: 16, isCurrentMonth: true, bills: [] },
    { day: 17, isCurrentMonth: true, bills: [] },
    { day: 18, isCurrentMonth: true, bills: [] },
    { day: 19, isCurrentMonth: true, bills: [] },
    { day: 20, isCurrentMonth: true, bills: [RECURRING_BILLS[4]] },
    { day: 21, isCurrentMonth: true, bills: [] },
    { day: 22, isCurrentMonth: true, bills: [] },
    { day: 23, isCurrentMonth: true, bills: [] },
    { day: 24, isCurrentMonth: true, bills: [] },
    { day: 25, isCurrentMonth: true, bills: [RECURRING_BILLS[5]] },
    { day: 26, isCurrentMonth: true, bills: [] },
    { day: 27, isCurrentMonth: true, bills: [] },
    { day: 28, isCurrentMonth: true, bills: [] },
    { day: 29, isCurrentMonth: true, bills: [] },
    { day: 30, isCurrentMonth: true, bills: [] },
    { day: 31, isCurrentMonth: true, bills: [] },
    { day: 1, isCurrentMonth: false, bills: [] }
  ];

  const handleMonthChange = (direction) => {
    toast.success(`Navigated to ${direction === 'prev' ? 'June 2026' : 'August 2026'} calendar (simulation)`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bill Calendar</h1>
          <p className="page-subtitle">Track your upcoming bills, utilities, and auto-pay items</p>
        </div>
      </div>

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card flex items-center justify-between border-l-4 border-blue-500">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Monthly Commitments</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">₹2,558.00</p>
          </div>
          <span className="text-2xl">📅</span>
        </div>
        <div className="card flex items-center justify-between border-l-4 border-red-500">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Upcoming Auto-Debits (7 Days)</p>
            <p className="text-2xl font-bold text-red-400 mt-1">₹77.98</p>
          </div>
          <span className="text-2xl">⏳</span>
        </div>
        <div className="card flex items-center justify-between border-l-4 border-green-500">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Savings Contribution Target</p>
            <p className="text-2xl font-bold text-green-400 mt-1">₹500.00</p>
          </div>
          <span className="text-2xl">🏦</span>
        </div>
      </div>

      {/* Main Calendar Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Side: Calendar Grid */}
        <div className="xl:col-span-2 card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-semibold text-slate-100">{currentMonth}</h3>
            <div className="flex gap-2">
              <button onClick={() => handleMonthChange('prev')} className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300">
                ◀
              </button>
              <button onClick={() => handleMonthChange('next')} className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300">
                ▶
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[9px] sm:text-xs font-semibold text-slate-400 mb-3">
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((item, index) => (
              <div
                key={index}
                className={`min-h-[44px] sm:min-h-[70px] p-1 sm:p-2 border border-slate-700/30 rounded-lg sm:rounded-xl flex flex-col justify-between text-left transition-all duration-200 ${
                  item.isCurrentMonth
                    ? 'bg-dark-900/40 hover:bg-slate-800/40'
                    : 'bg-dark-900/10 opacity-30 cursor-not-allowed'
                }`}
              >
                <span className="text-xs text-slate-400 font-bold">{item.day}</span>
                <div className="space-y-1">
                  {item.bills.map((bill) => (
                    <div
                      key={bill.id}
                      title={`${bill.name}: ₹${bill.amount}`}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate max-w-full cursor-pointer bg-primary-600/20 text-primary-400 border border-primary-500/20"
                      onClick={() => toast.success(`Bill details: ${bill.name} (₹${bill.amount}) due on ${bill.date}`)}
                    >
                      {bill.icon} {bill.name.split(' ')[0]}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Bills Checklist */}
        <div className="card flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-100 mb-4">Recurring Obligations</h3>
            <div className="space-y-3">
              {RECURRING_BILLS.map((bill) => (
                <div
                  key={bill.id}
                  className={`p-3 border rounded-xl flex items-center justify-between transition-all duration-200 hover:scale-[1.01] ${bill.color}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{bill.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{bill.name}</p>
                      <p className="text-[10px] text-slate-400">Due: {bill.date} • {bill.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-100">₹{bill.amount.toLocaleString('en-IN')}</p>
                    <button
                      onClick={() => toast.success(`Simulating payment for ${bill.name}`)}
                      className="text-[10px] text-primary-400 font-semibold hover:underline"
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700/50 text-center">
            <button
              onClick={() => toast.success('Configure recurring payments modal opened')}
              className="text-xs font-medium text-primary-400 hover:text-primary-300 hover:underline"
            >
              ⚙️ Manage Automatic Subscriptions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
