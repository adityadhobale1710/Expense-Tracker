import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Sparkles, AlertCircle, CheckCircle, Flame } from 'lucide-react';

export default function BudgetProgress({
  budgets = [],
  rawExpenses = [],
  summary = {},
  currencySymbol = '₹'
}) {
  const { totalIncome = 0, totalExpense = 0, savings = 0 } = summary;

  // Grouping categorizations for budget/expense classification
  const groupings = {
    needs: ['Food & Dining', 'Groceries', 'Utilities', 'Bills & Utilities', 'Rent', 'Housing', 'Transport', 'Insurance', 'Medical', 'Education'],
    wants: ['Shopping', 'Entertainment', 'Dine Out', 'Travel', 'Leisure', 'Lifestyle', 'Gifts', 'Personal Care'],
    investments: ['Investments', 'Mutual Funds', 'Stocks', 'Crypto', 'SIP'],
    debt: ['Loans', 'EMI', 'Interest', 'Credit Card Payment', 'Debt']
  };

  // Classify active spending in the current period
  let spentNeeds = 0;
  let spentWants = 0;
  let spentInvestments = 0;
  let spentDebt = 0;

  rawExpenses.forEach((exp) => {
    let cat = 'Other';
    if (exp.category) {
      cat = (typeof exp.category === 'object' && exp.category !== null) ? (exp.category.name || 'Other') : (exp.category || 'Other');
    }
    const catName = cat.toLowerCase();

    if (groupings.needs.some(item => item.toLowerCase().includes(catName) || catName.includes(item.toLowerCase()))) {
      spentNeeds += exp.amount;
    } else if (groupings.wants.some(item => item.toLowerCase().includes(catName) || catName.includes(item.toLowerCase()))) {
      spentWants += exp.amount;
    } else if (groupings.investments.some(item => item.toLowerCase().includes(catName) || catName.includes(item.toLowerCase()))) {
      spentInvestments += exp.amount;
    } else if (groupings.debt.some(item => item.toLowerCase().includes(catName) || catName.includes(item.toLowerCase()))) {
      spentDebt += exp.amount;
    } else {
      // Default fallback splits (Needs 60%, Wants 40%)
      spentWants += exp.amount * 0.4;
      spentNeeds += exp.amount * 0.6;
    }
  });

  // Savings stack is the net savings from summary
  const spentSavings = savings;

  const totalSegments = spentNeeds + spentWants + spentSavings + spentInvestments + spentDebt;

  // Convert to percentages (or absolute amounts for bar chart)
  const allocationData = [
    {
      name: 'Budget Allocation',
      Needs: totalSegments > 0 ? parseFloat(((spentNeeds / totalSegments) * 100).toFixed(1)) : 35,
      Wants: totalSegments > 0 ? parseFloat(((spentWants / totalSegments) * 100).toFixed(1)) : 25,
      Savings: totalSegments > 0 ? parseFloat(((spentSavings / totalSegments) * 100).toFixed(1)) : 15,
      Investment: totalSegments > 0 ? parseFloat(((spentInvestments / totalSegments) * 100).toFixed(1)) : 15,
      Debt: totalSegments > 0 ? parseFloat(((spentDebt / totalSegments) * 100).toFixed(1)) : 10
    }
  ];

  // Budget warnings (alert limits >= 80%)
  const budgetAlerts = budgets.filter((b) => {
    const usage = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
    return usage >= (b.alertThreshold || 80);
  });

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-6 flex-1">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Allocation & Budget Boundaries</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">100% Stacked allocation (Needs, Wants, Savings, Investment, Debt)</p>
        </div>
        <div className="p-2 rounded-xl bg-dark-900 border border-slate-800">
          <Sparkles size={16} className="text-primary-400" />
        </div>
      </div>

      {/* 100% Stacked Bar Chart */}
      <div className="h-16 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={allocationData}
            layout="vertical"
            margin={{ top: 0, right: 0, left: -40, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              formatter={(value) => `${value}%`}
              contentStyle={{
                background: 'var(--chart-tooltip-bg)',
                border: '1px solid var(--chart-tooltip-border)',
                borderRadius: '10px',
                color: 'var(--chart-tooltip-text)',
                fontSize: '11px',
                fontWeight: 'bold'
              }}
            />
            <Bar dataKey="Needs" stackId="a" fill="#6366f1" radius={[8, 0, 0, 8]} /> {/* Indigo */}
            <Bar dataKey="Wants" stackId="a" fill="#ec4899" /> {/* Pink */}
            <Bar dataKey="Savings" stackId="a" fill="#10b981" /> {/* Emerald */}
            <Bar dataKey="Investment" stackId="a" fill="#a855f7" /> {/* Purple */}
            <Bar dataKey="Debt" stackId="a" fill="#f97316" radius={[0, 8, 8, 0]} /> {/* Orange */}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stack Legends */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-center">
        <div className="flex flex-col items-center">
          <div className="w-2 h-2 rounded-full bg-[#6366f1] mb-1" />
          <span className="text-[9px] font-bold text-slate-400">Needs ({allocationData[0].Needs}%)</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-2 h-2 rounded-full bg-[#ec4899] mb-1" />
          <span className="text-[9px] font-bold text-slate-400">Wants ({allocationData[0].Wants}%)</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-2 h-2 rounded-full bg-[#10b981] mb-1" />
          <span className="text-[9px] font-bold text-slate-400">Savings ({allocationData[0].Savings}%)</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-2 h-2 rounded-full bg-[#a855f7] mb-1" />
          <span className="text-[9px] font-bold text-slate-400">Invest ({allocationData[0].Investment}%)</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-2 h-2 rounded-full bg-[#f97316] mb-1" />
          <span className="text-[9px] font-bold text-slate-400">Debt ({allocationData[0].Debt}%)</span>
        </div>
      </div>

      {/* Individual Budgets Progress Bars */}
      <div className="border-t border-slate-700/40 pt-4 space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span>Active Category Budgets</span>
          {budgetAlerts.length > 0 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-500/15 border border-rose-500/20 text-rose-450 text-[8px] font-extrabold rounded-md uppercase">
              <AlertCircle size={8} /> {budgetAlerts.length} Overlimit
            </span>
          )}
        </h4>

        {budgets.length > 0 ? (
          <div className="space-y-3.5 max-h-[160px] overflow-y-auto pr-1">
            {budgets.map((b) => {
              const spent = b.spent || 0;
              const limit = b.limit || 0;
              const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
              const isOver = spent >= limit * 0.8;

              let progressBarColor = 'bg-primary-500';
              if (pct >= 100) progressBarColor = 'bg-rose-500';
              else if (pct >= 80) progressBarColor = 'bg-amber-500';
              else progressBarColor = 'bg-emerald-500';

              const catName = b.category?.name || 'Uncategorized';

              return (
                <div key={b._id} className="space-y-1 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-slate-350">{catName}</span>
                    <span className="font-bold text-slate-450">
                      {currencySymbol}{spent.toLocaleString()} / {currencySymbol}{limit.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-dark-900 border border-slate-800/80 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${progressBarColor}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 bg-dark-900/40 border border-slate-850 rounded-2xl text-center space-y-2">
            <CheckCircle size={22} className="text-slate-500" />
            <p className="text-[11px] font-bold text-slate-450">No Active Limits Configured</p>
            <p className="text-[9px] text-slate-550">Budgets prevent impulsive outlays. Configure one to track compliance.</p>
          </div>
        )}
      </div>

    </div>
  );
}
