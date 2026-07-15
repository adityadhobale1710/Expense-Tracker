import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, PiggyBank, Scale, Calendar, ListCollapse, Hash } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

export default function SummaryCards({ summary }) {
  if (!summary) return null;

  const {
    totalIncome = 0,
    totalExpense = 0,
    savings = 0,
    balance = 0,
    avgDailyExpense = 0,
    highestExpenseDay = null,
    lowestExpenseDay = null,
    totalTransactions = 0,
    trends = {},
    sparkline = []
  } = summary;

  // Render a mock dataset for the sparkline if not populated yet
  const sparkData = sparkline && sparkline.length > 0
    ? sparkline.map((val, idx) => ({ id: idx, val }))
    : [2, 5, 3, 9, 6, 8, 4, 10, 5, 8].map((val, idx) => ({ id: idx, val }));

  const cardItems = [
    {
      title: 'Total Income',
      value: `₹${totalIncome.toLocaleString('en-IN')}`,
      trend: trends.incomeTrend || 0,
      icon: <TrendingUp className="text-emerald-500" size={20} />,
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      sparkColor: '#10b981'
    },
    {
      title: 'Total Expense',
      value: `₹${totalExpense.toLocaleString('en-IN')}`,
      trend: trends.expenseTrend || 0,
      icon: <TrendingDown className="text-rose-500" size={20} />,
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      sparkColor: '#ef4444'
    },
    {
      title: 'Net Savings',
      value: `₹${savings.toLocaleString('en-IN')}`,
      trend: trends.savingsTrend || 0,
      icon: <PiggyBank className="text-primary-500" size={20} />,
      bgColor: 'bg-primary-500/10 border-primary-500/20',
      sparkColor: '#6366f1'
    },
    {
      title: 'Balance',
      value: `₹${balance.toLocaleString('en-IN')}`,
      trend: trends.balanceTrend || 0,
      icon: <Scale className="text-sky-500" size={20} />,
      bgColor: 'bg-sky-500/10 border-sky-500/20',
      sparkColor: '#0ea5e9'
    },
    {
      title: 'Average Daily Spend',
      value: `₹${avgDailyExpense.toLocaleString('en-IN', { maximumFractionDigits: 1 })}`,
      icon: <Clock className="text-amber-500" size={20} />,
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      sparkColor: '#f59e0b',
      isMeta: true
    },
    {
      title: 'Peak Expense Day',
      value: highestExpenseDay ? `₹${highestExpenseDay.amount.toLocaleString('en-IN')}` : '₹0',
      subText: highestExpenseDay ? new Date(highestExpenseDay.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No data',
      icon: <Calendar className="text-purple-500" size={20} />,
      bgColor: 'bg-purple-500/10 border-purple-500/20',
      sparkColor: '#a855f7',
      isMeta: true
    },
    {
      title: 'Lowest Expense Day',
      value: lowestExpenseDay ? `₹${lowestExpenseDay.amount.toLocaleString('en-IN')}` : '₹0',
      subText: lowestExpenseDay ? new Date(lowestExpenseDay.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No data',
      icon: <Calendar className="text-indigo-500" size={20} />,
      bgColor: 'bg-indigo-500/10 border-indigo-500/20',
      sparkColor: '#6366f1',
      isMeta: true
    },
    {
      title: 'Transaction Volume',
      value: `${totalTransactions} Txns`,
      icon: <Hash className="text-teal-500" size={20} />,
      bgColor: 'bg-teal-500/10 border-teal-500/20',
      sparkColor: '#14b8a6',
      isMeta: true
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cardItems.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          whileHover={{ scale: 1.02, y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
          className={`flex flex-col justify-between p-5 bg-dark-800/80 border border-slate-700/60 rounded-2xl transition-shadow relative overflow-hidden backdrop-blur-sm`}
        >
          {/* Top Header Row */}
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.title}</span>
            <div className={`p-2 rounded-xl border ${card.bgColor} flex items-center justify-center`}>
              {card.icon}
            </div>
          </div>

          {/* Amount Display */}
          <div className="mt-3 flex flex-col">
            <span className="text-2xl font-black text-slate-100 tracking-tight">{card.value}</span>
            {card.subText && <span className="text-[10px] text-slate-500 font-semibold mt-0.5">{card.subText}</span>}
          </div>

          {/* Trend & Sparkline bottom footer */}
          <div className="flex items-center justify-between mt-5 gap-4">
            {!card.isMeta ? (
              <div className="flex items-center gap-1.5">
                {card.trend >= 0 ? (
                  <div className="flex items-center text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <ArrowUpRight size={14} className="mr-0.5" />
                    <span>{card.trend.toFixed(1)}%</span>
                  </div>
                ) : (
                  <div className="flex items-center text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg">
                    <ArrowDownRight size={14} className="mr-0.5" />
                    <span>{Math.abs(card.trend).toFixed(1)}%</span>
                  </div>
                )}
                <span className="text-[10px] text-slate-500 font-bold">vs last period</span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-500 font-bold">Performance check</span>
            )}

            {/* Sparkline mini-graph */}
            <div className="w-20 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
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
      ))}
    </div>
  );
}

// Simple fallback clock component
function Clock({ className, size }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
