import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Shield, Heart } from 'lucide-react';

export default function FinancialHealthGauge({
  summary = {},
  budgets = [],
  loans = [],
  goals = [],
  wallets = []
}) {
  const {
    totalIncome = 0,
    totalExpense = 0,
    savings = 0,
    avgDailyExpense = 0
  } = summary;

  // Let's compute actual components of the financial health score:
  // 1. Savings Rate Metric (Max 25 pts)
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
  let savingsScore = 0;
  if (savingsRate >= 35) savingsScore = 25;
  else if (savingsRate > 0) savingsScore = Math.round((savingsRate / 35) * 25);

  // 2. Debt-To-Income Metric (Max 25 pts)
  const totalEmi = loans.reduce((sum, l) => sum + l.emiAmount, 0);
  const debtRatio = totalIncome > 0 ? (totalEmi / totalIncome) : 0;
  let debtScore = 0;
  if (debtRatio === 0) debtScore = 25;
  else if (debtRatio <= 0.15) debtScore = 22;
  else if (debtRatio <= 0.3) debtScore = 18;
  else if (debtRatio <= 0.5) debtScore = 10;
  else debtScore = 5;

  // 3. Budget Adherence Metric (Max 25 pts)
  const monthlyLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const monthlySpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  let budgetScore = 25;
  if (monthlyLimit > 0) {
    const usage = monthlySpent / monthlyLimit;
    if (usage <= 0.8) budgetScore = 25;
    else if (usage <= 1.0) budgetScore = 20;
    else if (usage <= 1.2) budgetScore = 12;
    else budgetScore = 5;
  }

  // 4. Emergency Cushion reserves (Max 25 pts)
  const emergencyGoals = goals
    .filter(g => g.name.toLowerCase().includes('emergency') || g.category.toLowerCase().includes('emergency'))
    .reduce((sum, g) => sum + g.currentSaved, 0);
  
  const dailySpent = avgDailyExpense || (totalExpense / 30) || 100;
  const bufferMonths = dailySpent > 0 ? (emergencyGoals / (dailySpent * 30)) : 0;
  
  let emergencyScore = 0;
  if (bufferMonths >= 6) emergencyScore = 25;
  else if (bufferMonths >= 3) emergencyScore = 20;
  else if (bufferMonths >= 1) emergencyScore = 12;
  else if (bufferMonths > 0) emergencyScore = 8;
  else emergencyScore = 0;

  // Sum scores
  const score = savingsScore + debtScore + budgetScore + emergencyScore;

  // Health assessment
  let status = 'Poor';
  let badgeColor = 'text-rose-400 bg-rose-500/10 border-rose-550/20';
  let gaugeColor = '#f43f5e'; // rose-500
  let icon = <ShieldAlert className="text-rose-400" size={18} />;

  if (score >= 85) {
    status = 'Excellent';
    badgeColor = 'text-emerald-450 bg-emerald-500/10 border-emerald-500/20';
    gaugeColor = '#10b981'; // emerald-500
    icon = <ShieldCheck className="text-emerald-400" size={18} />;
  } else if (score >= 70) {
    status = 'Good';
    badgeColor = 'text-blue-450 bg-blue-500/10 border-blue-500/20';
    gaugeColor = '#3b82f6'; // blue-500
    icon = <ShieldCheck className="text-blue-450" size={18} />;
  } else if (score >= 50) {
    status = 'Average';
    badgeColor = 'text-amber-450 bg-amber-500/10 border-amber-500/20';
    gaugeColor = '#f59e0b'; // amber-500
    icon = <Shield className="text-amber-500" size={18} />;
  }

  // Gauge calculations
  const radius = 50;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-5 flex-1 justify-between">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Financial Health Score</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Automated algorithmic analysis of solvency</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider ${badgeColor}`}>
          {icon}
          <span>{status}</span>
        </div>
      </div>

      {/* Main Gauge Visualizer */}
      <div className="flex items-center justify-center py-2">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background gauge circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="stroke-slate-800"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Foreground animated gauge progress */}
            <motion.circle
              cx="60"
              cy="60"
              r={radius}
              stroke={gaugeColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>
          {/* Central Score Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-slate-100 tracking-tight leading-none">
              {score}
            </span>
            <span className="text-[9px] font-bold text-slate-550 uppercase tracking-widest mt-1">
              Rating
            </span>
          </div>
        </div>
      </div>

      {/* Metric breakdown list */}
      <div className="space-y-2 text-xs">
        {/* Savings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-400 font-semibold">Savings Yield</span>
          </div>
          <span className="font-bold text-slate-200">{savingsScore}/25 pts</span>
        </div>
        {/* Debt */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span className="text-slate-400 font-semibold">Debt Load</span>
          </div>
          <span className="font-bold text-slate-200">{debtScore}/25 pts</span>
        </div>
        {/* Budgets */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-slate-400 font-semibold">Budget Boundaries</span>
          </div>
          <span className="font-bold text-slate-200">{budgetScore}/25 pts</span>
        </div>
        {/* Cushion */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span className="text-slate-400 font-semibold">Emergency Reserves</span>
          </div>
          <span className="font-bold text-slate-200">{emergencyScore}/25 pts</span>
        </div>
      </div>

    </div>
  );
}
