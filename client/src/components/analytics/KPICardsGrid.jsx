import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, PiggyBank, Scale, Calendar, ChevronDown, ChevronUp,
  CreditCard, Landmark, Coins, Flame, DollarSign, Award, Percent, ListCollapse,
  Activity, ArrowUpRight, ArrowDownRight, Sparkles, HelpCircle, ShieldAlert
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

// Dependency-free lightweight CountUp component for premium visual polish
function CountUp({ value, formatter }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseFloat(value);
    if (isNaN(end)) {
      setDisplayValue(value);
      return;
    }
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    const duration = 600; // ms
    const stepTime = 20; // 50 fps
    const steps = duration / stepTime;
    const increment = (end - start) / steps;
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount++;
      start += increment;
      if (stepCount >= steps) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <>{formatter ? formatter(displayValue) : Math.round(displayValue)}</>;
}

export default function KPICardsGrid({
  summary = {},
  budgets = [],
  loans = [],
  investments = [],
  goals = [],
  wallets = [],
  rawExpenses = [],
  rawIncomes = [],
  currencySymbol = '₹'
}) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  const {
    totalIncome = 0,
    totalExpense = 0,
    savings = 0,
    balance = 0,
    avgDailyExpense = 0,
    highestExpenseDay = null,
    totalTransactions = 0,
    trends = {},
    sparkline = []
  } = summary;

  // Formatter function
  const formatCurrency = (val) => {
    return `${currencySymbol}${Math.round(val).toLocaleString('en-IN')}`;
  };

  const formatPercentage = (val) => {
    return `${val.toFixed(1)}%`;
  };

  // Calculations for Advanced Fintech metrics
  const walletBalanceSum = wallets.length > 0 ? wallets.reduce((sum, w) => sum + w.balance, 0) : balance;
  
  // Total Budgets
  const monthlyBudgetsSum = budgets.length > 0
    ? budgets.filter(b => b.period === 'monthly').reduce((sum, b) => sum + b.limit, 0)
    : 0;
  
  const budgetsSpentSum = budgets.length > 0
    ? budgets.filter(b => b.period === 'monthly').reduce((sum, b) => sum + b.spent, 0)
    : 0;

  const budgetUsedPct = monthlyBudgetsSum > 0 ? (budgetsSpentSum / monthlyBudgetsSum) * 100 : 0;

  // Savings rate
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  // Investments
  const investmentsValue = investments.length > 0 ? investments.reduce((sum, i) => sum + i.currentValue, 0) : 0;

  // Loans / Debt
  const loanOutstanding = loans.length > 0 ? loans.reduce((sum, l) => sum + l.remainingBalance, 0) : 0;

  // Net Worth = Current Balances + Investment Value - Loan Outstanding
  const netWorth = walletBalanceSum + investmentsValue - loanOutstanding;

  // Emergency Fund (Goals labeled emergency)
  const emergencyFund = goals.length > 0
    ? goals
        .filter(g => g.name.toLowerCase().includes('emergency') || g.category.toLowerCase().includes('emergency'))
        .reduce((sum, g) => sum + g.currentSaved, 0)
    : 0;

  // Burn Rate: average monthly expenses (30 days)
  const burnRate = avgDailyExpense * 30;

  // Cash Flow (Net monthly velocity)
  const cashFlowValue = totalIncome - totalExpense;

  // Largest Income
  const largestIncome = rawIncomes.length > 0
    ? Math.max(...rawIncomes.map(i => i.amount))
    : 0;

  // Largest Expense
  const largestExpense = rawExpenses.length > 0
    ? Math.max(...rawExpenses.map(e => e.amount))
    : 0;

  // Average Transaction
  const allTxnsCount = rawExpenses.length + rawIncomes.length;
  const avgTransactionVal = allTxnsCount > 0
    ? (rawExpenses.reduce((sum, e) => sum + e.amount, 0) + rawIncomes.reduce((sum, i) => sum + i.amount, 0)) / allTxnsCount
    : 0;

  // Sparkline data
  const defaultSparkline = [20, 35, 10, 45, 30, 25, 55, 40, 60, 50];
  const processSparkline = (data = []) => {
    const list = data.length > 0 ? data : defaultSparkline;
    return list.map((val, idx) => ({ idx, val }));
  };

  // Card Definition Database
  const coreCards = [
    {
      id: 'net_worth',
      title: 'Estimated Net Worth',
      value: netWorth,
      formatter: formatCurrency,
      icon: <Landmark className="text-sky-400" size={18} />,
      bgColor: 'from-sky-500/10 to-indigo-500/10 border-sky-500/20',
      sparkColor: '#0ea5e9',
      trend: trends.balanceTrend || 0,
      sparkData: processSparkline(sparkline)
    },
    {
      id: 'current_balance',
      title: 'Current Liquid Balance',
      value: walletBalanceSum,
      formatter: formatCurrency,
      icon: <Scale className="text-primary-400" size={18} />,
      bgColor: 'from-primary-500/10 to-indigo-500/10 border-primary-500/20',
      sparkColor: '#6366f1',
      trend: trends.balanceTrend || 0,
      sparkData: processSparkline(sparkline)
    },
    {
      id: 'total_income',
      title: 'Total Income Inflow',
      value: totalIncome,
      formatter: formatCurrency,
      icon: <TrendingUp className="text-emerald-400" size={18} />,
      bgColor: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
      sparkColor: '#10b981',
      trend: trends.incomeTrend || 0,
      sparkData: processSparkline(sparkline.map(v => v * 1.2))
    },
    {
      id: 'total_expense',
      title: 'Total Expense Outflow',
      value: totalExpense,
      formatter: formatCurrency,
      icon: <TrendingDown className="text-rose-400" size={18} />,
      bgColor: 'from-rose-500/10 to-pink-500/10 border-rose-500/20',
      sparkColor: '#ef4444',
      trend: trends.expenseTrend || 0,
      sparkData: processSparkline(sparkline)
    },
    {
      id: 'net_savings',
      title: 'Net Savings Accumulated',
      value: savings,
      formatter: formatCurrency,
      icon: <PiggyBank className="text-blue-400" size={18} />,
      bgColor: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
      sparkColor: '#3b82f6',
      trend: trends.savingsTrend || 0,
      sparkData: processSparkline(sparkline.map(v => Math.max(0, v * 0.4)))
    },
    {
      id: 'investments_value',
      title: 'Total Assets Valuation',
      value: investmentsValue,
      formatter: formatCurrency,
      icon: <Coins className="text-purple-400" size={18} />,
      bgColor: 'from-purple-500/10 to-fuchsia-500/10 border-purple-500/20',
      sparkColor: '#a855f7',
      trend: 0,
      sparkData: processSparkline([10, 15, 12, 18, 22, 28, 26, 32, 40, 45])
    }
  ];

  const advancedCards = [
    {
      id: 'monthly_budget',
      title: 'Allocated Monthly Budget',
      value: monthlyBudgetsSum,
      formatter: formatCurrency,
      icon: <CreditCard className="text-amber-400" size={18} />,
      bgColor: 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
      sparkColor: '#f59e0b',
      sparkData: processSparkline([monthlyBudgetsSum, monthlyBudgetsSum, monthlyBudgetsSum])
    },
    {
      id: 'budget_used',
      title: 'Monthly Budget Exhausted',
      value: budgetUsedPct,
      formatter: formatPercentage,
      icon: <Percent className="text-orange-400" size={18} />,
      bgColor: 'from-orange-500/10 to-rose-500/10 border-orange-500/20',
      sparkColor: '#f97316',
      sparkData: processSparkline([10, 25, 45, 55, 70, 80])
    },
    {
      id: 'savings_rate',
      title: 'Overall Savings Rate',
      value: savingsRate,
      formatter: formatPercentage,
      icon: <Percent className="text-teal-400" size={18} />,
      bgColor: 'from-teal-500/10 to-emerald-500/10 border-teal-500/20',
      sparkColor: '#14b8a6',
      sparkData: processSparkline([20, 22, 28, 25, 30, 32])
    },
    {
      id: 'loan_outstanding',
      title: 'Loan Debt Outstanding',
      value: loanOutstanding,
      formatter: formatCurrency,
      icon: <Landmark className="text-red-400" size={18} />,
      bgColor: 'from-red-500/10 to-pink-500/10 border-red-500/20',
      sparkColor: '#ef4444',
      sparkData: processSparkline([100, 95, 90, 85, 80, 75])
    },
    {
      id: 'emergency_fund',
      title: 'Secured Emergency Fund',
      value: emergencyFund,
      formatter: formatCurrency,
      icon: <Coins className="text-indigo-400" size={18} />,
      bgColor: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/20',
      sparkColor: '#6366f1',
      sparkData: processSparkline([20, 25, 30, 35, 45, 50])
    },
    {
      id: 'burn_rate',
      title: 'Current Monthly Burn Rate',
      value: burnRate,
      formatter: formatCurrency,
      icon: <Flame className="text-orange-500" size={18} />,
      bgColor: 'from-orange-600/10 to-red-500/10 border-orange-550/20',
      sparkColor: '#f97316',
      sparkData: processSparkline(sparkline)
    },
    {
      id: 'cash_flow',
      title: 'Monthly Inflow Velocity',
      value: cashFlowValue,
      formatter: formatCurrency,
      icon: <Activity className="text-green-400" size={18} />,
      bgColor: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
      sparkColor: '#22c55e',
      sparkData: processSparkline(sparkline.map(v => v * 0.3))
    },
    {
      id: 'avg_daily',
      title: 'Average Daily Outflows',
      value: avgDailyExpense,
      formatter: formatCurrency,
      icon: <Calendar className="text-pink-400" size={18} />,
      bgColor: 'from-pink-500/10 to-rose-500/10 border-pink-500/20',
      sparkColor: '#ec4899',
      sparkData: processSparkline(sparkline.map(v => v / 10))
    },
    {
      id: 'tx_count',
      title: 'Transaction Ingress Count',
      value: totalTransactions,
      formatter: (v) => `${v} Txns`,
      icon: <Activity className="text-cyan-400" size={18} />,
      bgColor: 'from-cyan-500/10 to-sky-500/10 border-cyan-500/20',
      sparkColor: '#06b6d4',
      sparkData: processSparkline([2, 5, 8, 12, 18, 20, 25])
    },
    {
      id: 'largest_income',
      title: 'Peak Income Entry',
      value: largestIncome,
      formatter: formatCurrency,
      icon: <TrendingUp className="text-emerald-400" size={18} />,
      bgColor: 'from-emerald-500/10 to-green-500/10 border-emerald-500/20',
      sparkColor: '#10b981',
      sparkData: processSparkline([largestIncome, largestIncome])
    },
    {
      id: 'largest_expense',
      title: 'Peak Expense Entry',
      value: largestExpense,
      formatter: formatCurrency,
      icon: <TrendingDown className="text-rose-400" size={18} />,
      bgColor: 'from-rose-500/10 to-red-500/10 border-rose-500/20',
      sparkColor: '#ef4444',
      sparkData: processSparkline([largestExpense, largestExpense])
    },
    {
      id: 'avg_transaction',
      title: 'Average Invoice Value',
      value: avgTransactionVal,
      formatter: formatCurrency,
      icon: <Percent className="text-violet-400" size={18} />,
      bgColor: 'from-violet-500/10 to-purple-500/10 border-violet-500/20',
      sparkColor: '#8b5cf6',
      sparkData: processSparkline([avgTransactionVal, avgTransactionVal])
    }
  ];

  const renderCard = (card, idx) => {
    const isHovered = hoveredCard === card.id;
    return (
      <motion.div
        key={card.id}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: (idx % 6) * 0.05 }}
        onMouseEnter={() => setHoveredCard(card.id)}
        onMouseLeave={() => setHoveredCard(null)}
        className="relative group flex flex-col justify-between p-5 bg-gradient-to-br bg-dark-800/80 border border-slate-700/50 rounded-3xl backdrop-blur-md transition-all shadow-lg hover:shadow-xl hover:border-slate-655"
        style={{
          boxShadow: isHovered ? '0 12px 30px -10px rgba(99, 102, 241, 0.15)' : 'none'
        }}
      >
        {/* Glow glow light effect inside the card */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 to-primary-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Card Header Row */}
        <div className="flex justify-between items-start z-10">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.title}</span>
          <div className="p-2 rounded-xl bg-dark-900 border border-slate-800 flex items-center justify-center">
            {card.icon}
          </div>
        </div>

        {/* Card Value Row */}
        <div className="mt-4 flex flex-col z-10">
          <span className="text-2xl font-black text-slate-100 tracking-tight">
            <CountUp value={card.value} formatter={card.formatter} />
          </span>
        </div>

        {/* Card Footer: Trend + Micro Sparkline */}
        <div className="flex items-center justify-between mt-5 gap-3 z-10">
          
          {/* Trend Indicator */}
          {card.trend !== undefined ? (
            <div className="flex items-center">
              {card.trend >= 0 ? (
                <div className="flex items-center text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-lg">
                  <ArrowUpRight size={12} className="mr-0.5" />
                  <span>+{card.trend.toFixed(1)}%</span>
                </div>
              ) : (
                <div className="flex items-center text-[10px] font-extrabold text-rose-450 bg-rose-500/10 border border-rose-500/15 px-2 py-0.5 rounded-lg">
                  <ArrowDownRight size={12} className="mr-0.5" />
                  <span>{card.trend.toFixed(1)}%</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-[9px] font-bold text-slate-500">Stability Check</span>
          )}

          {/* Micro Sparkline Recharts */}
          <div className="w-20 h-7 overflow-hidden rounded-md opacity-80 group-hover:opacity-100 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={card.sparkData}>
                <Line
                  type="monotone"
                  dataKey="val"
                  stroke={card.sparkColor}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>

      </motion.div>
    );
  };

  return (
    <div className="space-y-5">
      
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        {coreCards.map((card, idx) => renderCard(card, idx))}
      </div>

      {/* Expand/Collapse Button */}
      <div className="flex justify-center">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 px-4 py-2 bg-dark-850 hover:bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-bold rounded-2xl cursor-pointer transition-all shadow-md"
        >
          <span>{expanded ? 'Collapse Summary Metrics' : 'Expand Advanced Metrics (12+)'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Advanced KPI Grid Expandable Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-1">
              {advancedCards.map((card, idx) => renderCard(card, idx + 6))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
