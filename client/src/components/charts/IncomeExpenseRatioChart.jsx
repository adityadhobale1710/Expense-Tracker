import React, { useEffect, useState } from 'react';
import ChartCard from './ChartCard';
import { formatCurrency, CHART_COLORS } from '../../utils/chartTheme';
import AnalyticsEmptyState from './AnalyticsEmptyState';
import { Scale } from 'lucide-react';

export default function IncomeExpenseRatioChart({ summary = {} }) {
  const totalIncome = summary.totalIncome || 0;
  const totalExpense = summary.totalExpense || 0;
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;
  const expenseRate = totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : 0;

  // Animation state
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Trigger animation shortly after mount
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (totalIncome === 0 && totalExpense === 0) {
    return (
      <ChartCard title="Financial Comparison" subtitle="Income vs Expense">
        <AnalyticsEmptyState 
          icon={Scale} 
          title="No Data to Compare" 
          message="Log income and expenses to view your financial ratio." 
        />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Financial Comparison"
      subtitle="Income vs Expense Breakdown"
      infoText="A direct comparison of total cash income versus expenses, highlighting your overall savings rate."
    >
      <div className="flex flex-col h-full justify-center px-2 py-4 space-y-8">
        
        {/* Income Bar */}
        <div className="space-y-3 group">
          <div className="flex justify-between items-end">
            <span className="text-sm font-bold text-slate-300 group-hover:text-slate-100 transition-colors">Total Income</span>
            <span className="text-xl font-mono font-black" style={{ color: CHART_COLORS.income }}>
              {formatCurrency(totalIncome)}
            </span>
          </div>
          <div className="h-4 w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out relative"
              style={{ 
                width: isLoaded ? '100%' : '0%', 
                backgroundColor: CHART_COLORS.income,
                boxShadow: `0 0 10px ${CHART_COLORS.income}40`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
            </div>
          </div>
        </div>

        {/* Expense Bar */}
        <div className="space-y-3 group">
          <div className="flex justify-between items-end">
            <span className="text-sm font-bold text-slate-300 group-hover:text-slate-100 transition-colors">Total Expense</span>
            <span className="text-xl font-mono font-black" style={{ color: CHART_COLORS.expense }}>
              {formatCurrency(totalExpense)}
            </span>
          </div>
          <div className="h-4 w-full bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out delay-150 relative"
              style={{ 
                width: isLoaded ? `${Math.min(expenseRate, 100)}%` : '0%', 
                backgroundColor: CHART_COLORS.expense,
                boxShadow: `0 0 10px ${CHART_COLORS.expense}40`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
            </div>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-700/60">
          <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/40 hover:bg-slate-800/60 transition-colors">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Net Savings</p>
            <p className="text-xl font-mono font-black" style={{ color: netSavings >= 0 ? CHART_COLORS.savings : CHART_COLORS.expense }}>
              {netSavings >= 0 ? '+' : ''}{formatCurrency(netSavings)}
            </p>
          </div>
          <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/40 hover:bg-slate-800/60 transition-colors">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Savings Rate</p>
            <p className="text-xl font-mono font-black" style={{ color: Number(savingsRate) > 0 ? CHART_COLORS.savings : CHART_COLORS.warning }}>
              {savingsRate}%
            </p>
          </div>
        </div>

      </div>
    </ChartCard>
  );
}
