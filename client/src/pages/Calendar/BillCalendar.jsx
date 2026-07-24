import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function BillCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Start at July 2026 to match mock range
  const [subscriptions, setSubscriptions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subsRes, loansRes] = await Promise.all([
        api.get('/subscriptions'),
        api.get('/loans')
      ]);
      setSubscriptions(subsRes.data.data || []);
      setLoans(loansRes.data.data || []);
    } catch {
      toast.error('Failed to load recurring obligations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMonthChange = (direction) => {
    const nextDate = new Date(currentDate);
    if (direction === 'prev') {
      nextDate.setMonth(nextDate.getMonth() - 1);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    setCurrentDate(nextDate);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonthDisplay = `${monthNames[month]} ${year}`;

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // First day of current month (weekday index 0-6)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Days in previous month (to fill prefix)
  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Prefix days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      bills: []
    });
  }

  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    const dayBills = [];

    subscriptions.forEach(sub => {
      const subDate = new Date(sub.renewalDate);
      if (sub.billingCycle === 'monthly' && subDate.getDate() === i) {
        dayBills.push({
          id: sub._id,
          name: sub.name,
          amount: sub.cost,
          type: 'Subscription',
          icon: '🎬',
          date: sub.renewalDate
        });
      } else if (subDate.getDate() === i && subDate.getMonth() === month && subDate.getFullYear() === year) {
        dayBills.push({
          id: sub._id,
          name: sub.name,
          amount: sub.cost,
          type: 'Subscription',
          icon: '🎬',
          date: sub.renewalDate
        });
      }
    });

    loans.forEach(loan => {
      if (loan.nextEmiDate) {
        const loanDate = new Date(loan.nextEmiDate);
        if (loanDate.getDate() === i && loanDate.getMonth() === month && loanDate.getFullYear() === year) {
          dayBills.push({
            id: loan._id,
            name: `${loan.name} EMI`,
            amount: loan.emiAmount,
            type: 'Loan',
            icon: '🏛️',
            date: loan.nextEmiDate
          });
        }
      }
    });

    calendarDays.push({
      day: i,
      isCurrentMonth: true,
      bills: dayBills
    });
  }

  // Suffix days from next month
  const totalCells = 42; // standard 6 rows of 7 days
  const remainingCells = totalCells - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: false,
      bills: []
    });
  }

  // Calculations
  const totalMonthlyCommitments = subscriptions.reduce((sum, s) => {
    return sum + (s.billingCycle === 'monthly' ? s.cost : s.cost / 12);
  }, 0) + loans.reduce((sum, l) => sum + (l.emiAmount || 0), 0);

  const upcomingDebits7Days = (() => {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);

    const upcomingSubs = subscriptions.filter(s => {
      const d = new Date(s.renewalDate);
      return d >= today && d <= next7Days;
    }).reduce((sum, s) => sum + s.cost, 0);

    const upcomingLoans = loans.filter(l => {
      if (!l.nextEmiDate) return false;
      const d = new Date(l.nextEmiDate);
      return d >= today && d <= next7Days;
    }).reduce((sum, l) => sum + l.emiAmount, 0);

    return upcomingSubs + upcomingLoans;
  })();

  const activeObligations = [
    ...subscriptions.map(s => ({
      id: s._id,
      name: s.name,
      amount: s.cost,
      date: new Date(s.renewalDate).toLocaleDateString('en-IN'),
      type: 'Subscription',
      icon: '🎬',
      color: 'text-red-400 bg-red-500/10 border-red-500/20'
    })),
    ...loans.map(l => ({
      id: l._id,
      name: `${l.name} EMI`,
      amount: l.emiAmount,
      date: l.nextEmiDate ? new Date(l.nextEmiDate).toLocaleDateString('en-IN') : 'N/A',
      type: 'Loan',
      icon: '🏛️',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    }))
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bill Calendar</h1>
          <p className="page-subtitle">Track your upcoming bills, utilities, and auto-pay items</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Overview stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card flex items-center justify-between border-l-4 border-blue-500">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Monthly Commitments</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">₹{totalMonthlyCommitments.toLocaleString('en-IN')}</p>
              </div>
              <span className="text-2xl">📅</span>
            </div>
            <div className="card flex items-center justify-between border-l-4 border-red-500">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Upcoming Auto-Debits (7 Days)</p>
                <p className="text-2xl font-bold text-red-400 mt-1">₹{upcomingDebits7Days.toLocaleString('en-IN')}</p>
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
                <h3 className="text-base font-semibold text-slate-100">{currentMonthDisplay}</h3>
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
                          onClick={() => toast.success(`Bill details: ${bill.name} (₹${bill.amount}) due on ${new Date(bill.date).toLocaleDateString('en-IN')}`)}
                        >
                          {bill.icon} {bill.name.split(' ')[0]} (₹{bill.amount})
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
                {activeObligations.length === 0 ? (
                  <p className="text-xs text-slate-450">No recurring obligations logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {activeObligations.map((bill) => (
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
                )}
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
        </>
      )}
    </div>
  );
}
