import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Calendar as CalendarIcon, Clock, TrendingUp, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';

export default function BillCalendar() {
  const { expenses, incomes, fetchExpenses, fetchIncomes } = useExpense();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Start at July 2026 to match mock range
  const [subscriptions, setSubscriptions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        api.get('/subscriptions').then(res => setSubscriptions(res.data.data || [])),
        api.get('/loans').then(res => setLoans(res.data.data || [])),
        fetchExpenses(),
        fetchIncomes()
      ]);
    } catch {
      toast.error('Failed to load calendar data');
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

    // Add Subscriptions
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

    // Add Loans
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

    // Add Daily Expenses
    expenses.forEach(exp => {
      const expDate = new Date(exp.date);
      if (expDate.getDate() === i && expDate.getMonth() === month && expDate.getFullYear() === year) {
        dayBills.push({
          id: exp._id,
          name: exp.title,
          amount: exp.amount,
          type: 'Expense',
          icon: exp.category?.icon || '💸',
          date: exp.date
        });
      }
    });

    // Add Daily Incomes
    incomes.forEach(inc => {
      const incDate = new Date(inc.date);
      if (incDate.getDate() === i && incDate.getMonth() === month && incDate.getFullYear() === year) {
        dayBills.push({
          id: inc._id,
          name: inc.title,
          amount: inc.amount,
          type: 'Income',
          icon: '💰',
          date: inc.date
        });
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
      color: 'subscription-card border-red-500/20 bg-red-500/5 text-slate-100'
    })),
    ...loans.map(l => ({
      id: l._id,
      name: `${l.name} EMI`,
      amount: l.emiAmount,
      date: l.nextEmiDate ? new Date(l.nextEmiDate).toLocaleDateString('en-IN') : 'N/A',
      type: 'Loan',
      icon: '🏛️',
      color: 'loan-card border-blue-500/20 bg-blue-500/5 text-slate-100'
    }))
  ];

  const today = new Date();
  const isToday = (dayNum, isCurrentMonth) => {
    if (!isCurrentMonth) return false;
    return (
      today.getDate() === dayNum &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const getChipClass = (type) => {
    if (type === 'Subscription') return 'bill-chip-subscription bg-red-550/15 text-red-400 border border-red-500/20 hover:bg-red-555/25';
    if (type === 'Loan') return 'bill-chip-loan bg-blue-550/15 text-blue-450 border border-blue-500/20 hover:bg-blue-555/25';
    if (type === 'Expense') return 'bill-chip-expense bg-amber-550/15 text-amber-450 border border-amber-550/20 hover:bg-amber-555/25';
    if (type === 'Income') return 'bill-chip-income bg-emerald-555/15 text-emerald-450 border border-emerald-500/20 hover:bg-emerald-555/25';
    return 'bg-primary-600/20 text-primary-400 border border-primary-500/20 hover:bg-primary-600/35';
  };

  return (
    <div className="space-y-6 animate-fade-in calendar-page">
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
            <div className="card flex items-center justify-between border-l-4 border-blue-500/70 hover:border-l-8 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <CalendarIcon size={22} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Monthly Commitments</p>
                  <p className="text-2xl font-extrabold text-slate-100 mt-0.5">₹{totalMonthlyCommitments.toLocaleString('en-IN')}</p>
                  <span className="inline-block text-[9px] font-bold text-slate-500 uppercase mt-1">Subscriptions + Loans</span>
                </div>
              </div>
            </div>
            <div className="card flex items-center justify-between border-l-4 border-red-500/70 hover:border-l-8 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <Clock size={22} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Upcoming Auto-Debits</p>
                  <p className="text-2xl font-extrabold text-red-455 mt-0.5">₹{upcomingDebits7Days.toLocaleString('en-IN')}</p>
                  <span className="inline-block text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md mt-1">Due in 7 Days</span>
                </div>
              </div>
            </div>
            <div className="card flex items-center justify-between border-l-4 border-emerald-500/70 hover:border-l-8 transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Savings Contribution Target</p>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-0.5">₹500.00</p>
                  <span className="inline-block text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md mt-1">Target Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Calendar Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Side: Calendar Grid */}
            <div className="xl:col-span-2 card">
              <div className="flex justify-between items-center mb-6 bg-slate-900/20 dark:bg-slate-800/20 p-2 rounded-xl border border-slate-700/30">
                <button 
                  onClick={() => handleMonthChange('prev')} 
                  className="btn-icon p-2 rounded-xl text-slate-400 hover:text-slate-150 hover:bg-slate-700/30 transition-all cursor-pointer"
                >
                  <ChevronLeft size={18} />
                </button>
                <h3 className="text-sm md:text-base font-bold text-slate-100 uppercase tracking-wider">{currentMonthDisplay}</h3>
                <button 
                  onClick={() => handleMonthChange('next')} 
                  className="btn-icon p-2 rounded-xl text-slate-400 hover:text-slate-150 hover:bg-slate-700/30 transition-all cursor-pointer"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-bold text-slate-450 mb-3 tracking-wider">
                <div>SUN</div>
                <div>MON</div>
                <div>TUE</div>
                <div>WED</div>
                <div>THU</div>
                <div>FRI</div>
                <div>SAT</div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarDays.map((item, index) => {
                  const isWeekend = index % 7 === 0 || index % 7 === 6;
                  const maxVisibleBills = 2;
                  const visibleBills = item.bills.slice(0, maxVisibleBills);
                  const extraBillsCount = item.bills.length - maxVisibleBills;

                  return (
                    <div
                      key={index}
                      className={`min-h-[44px] sm:min-h-[85px] p-1.5 sm:p-2 border rounded-lg sm:rounded-xl flex flex-col justify-between text-left transition-all duration-200 ${
                        item.isCurrentMonth
                          ? `${
                              isToday(item.day, true)
                                ? 'bg-primary-500/10 border-primary-500/60 ring-2 ring-primary-500/20'
                                : isWeekend
                                ? 'bg-slate-500/5 dark:bg-slate-900/40 border-slate-750/30 hover:bg-slate-500/10 hover:border-slate-700/50 cursor-pointer'
                                : 'bg-dark-900/40 border-slate-750/30 hover:bg-slate-800/40 hover:border-slate-700/50 cursor-pointer'
                            }`
                          : 'bg-dark-900/10 opacity-20 cursor-not-allowed border-slate-800/30'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        {isToday(item.day, true) ? (
                          <span className="text-xs font-black text-primary-500 bg-primary-500/15 w-5 h-5 rounded-full flex items-center justify-center">
                            {item.day}
                          </span>
                        ) : (
                          <span className={`text-xs font-bold ${item.isCurrentMonth ? 'text-slate-300' : 'text-slate-500'}`}>
                            {item.day}
                          </span>
                        )}
                        {isToday(item.day, true) && (
                          <span className="text-[8px] font-bold text-primary-500 uppercase tracking-wide hidden sm:inline-block">Today</span>
                        )}
                      </div>
                      <div className="space-y-1 mt-1 sm:mt-2">
                        {visibleBills.map((bill) => (
                          <div
                            key={bill.id}
                            title={`${bill.name}: ₹${bill.amount}`}
                            className={`${getChipClass(bill.type)} text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate max-w-full cursor-pointer transition-all hover:scale-[1.02]`}
                            onClick={() => toast.success(`${bill.type} details: ${bill.name} (₹${bill.amount}) on ${new Date(bill.date).toLocaleDateString('en-IN')}`)}
                          >
                            {bill.icon} {bill.name.split(' ')[0]} (₹{bill.amount})
                          </div>
                        ))}
                        {extraBillsCount > 0 && (
                          <div 
                            className="text-[8px] font-black text-center py-0.5 rounded-md bg-slate-700/30 text-slate-300 border border-slate-700/50 cursor-pointer hover:bg-slate-700/50"
                            onClick={() => {
                              const detailsList = item.bills.map(b => `${b.type}: ${b.name} (₹${b.amount})`).join(', ');
                              toast.info(`Items on this day: ${detailsList}`);
                            }}
                          >
                            +{extraBillsCount} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Bills Checklist */}
            <div className="card flex flex-col justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-100 mb-4 border-b border-slate-700/30 pb-2">Recurring Obligations</h3>
                {activeObligations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-slate-700/50 rounded-2xl bg-slate-900/5">
                    <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400 mb-3">
                      <AlertCircle size={24} />
                    </div>
                    <p className="text-xs font-semibold text-slate-350">No recurring obligations logged yet.</p>
                    <p className="text-[10px] text-slate-550 mt-1 max-w-[200px]">Add your active loans or subscriptions to track auto-debits automatically.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeObligations.map((bill) => (
                      <div
                        key={bill.id}
                        className={`p-3 border rounded-xl flex items-center justify-between transition-all duration-200 hover:scale-[1.01] ${bill.color}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800/40 flex items-center justify-center text-lg border border-slate-700/50">
                            {bill.icon}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-150">{bill.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${bill.type === 'Subscription' ? 'bg-red-555/15 text-red-400 badge-red-light-override' : 'bg-blue-555/15 text-blue-400 badge-blue-light-override'}`}>
                                {bill.type}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">Due: {bill.date}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <p className="text-sm font-black text-slate-100">₹{bill.amount.toLocaleString('en-IN')}</p>
                          <button
                            onClick={() => toast.success(`Simulating payment for ${bill.name}`)}
                            className="text-[10px] font-bold text-white bg-primary-600 hover:bg-primary-500 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
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
                  className="text-xs font-medium text-primary-450 hover:text-primary-355 hover:underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
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
