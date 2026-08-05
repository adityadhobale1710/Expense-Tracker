import React, { useState } from 'react';
import DownloadButtons from './DownloadButtons';
import { FileText, ChevronRight, ChevronDown } from 'lucide-react';

/**
 * ExecutiveReport displays the aggregated AI statement summaries and report controls
 */
export default function ExecutiveReport({ data = {}, summary = '' }) {
  const [expandedSection, setExpandedSection] = useState('summary'); // 'summary' | 'health' | 'details' | ...

  const toggle = (sec) => {
    setExpandedSection(expandedSection === sec ? null : sec);
  };

  const fmt = (v) => (v ?? 0).toLocaleString('en-IN');

  return (
    <div className="bg-dark-800 border border-slate-700/50 rounded-2xl p-6 shadow-lg space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-700/50 pb-4">
        <FileText className="text-primary-400 w-5 h-5 flex-shrink-0" />
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
          AI Executive Report Portal
        </h3>
      </div>

      <div className="space-y-4">
        {/* Cover Page Card */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl text-center space-y-2">
          <span className="text-[9px] font-black text-primary-400 uppercase tracking-widest block">
            Financial Analysis Report
          </span>
          <h2 className="text-lg font-black text-slate-200 uppercase tracking-wide">
            FinMate Monthly Statement
          </h2>
          <p className="text-[10px] text-slate-500 font-semibold leading-normal">
            Covering Cover Page, Financial Health, Budgets, Saving Goals, Subscriptions, and Next Month Action Plan
          </p>
        </div>

        {/* Executive summary block */}
        <div className="bg-primary-600/5 border border-primary-500/10 p-5 rounded-2xl">
          <h4 className="text-[9px] font-black uppercase tracking-wider text-primary-400 mb-2">
            Executive Summary
          </h4>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-200 font-semibold whitespace-pre-line">
            {summary || 'Analyzing ledger activities to formulate executive report summaries...'}
          </p>
        </div>

        {/* Report Accordion Sections */}
        <div className="space-y-2.5">
          {[
            { 
              id: 'health', 
              label: 'Financial Health & Scoring Breakdown', 
              content: `Your financial health score is evaluated at ${data.financialHealth?.score || 0}/100, which rates your overall financial stability as "${data.financialHealth?.grade || 'Average'}". Metric highlights include: Savings Rate Score: ${data.financialHealth?.metricBreakdown?.savingsRateScore || 0} pts, Budget Compliance: ${data.financialHealth?.metricBreakdown?.budgetComplianceScore || 0} pts, Debt Ratio: ${data.financialHealth?.metricBreakdown?.debtScore || 0} pts, Liquid Cushion: ${data.financialHealth?.metricBreakdown?.emergencyFundScore || 0} pts.` 
            },
            { 
              id: 'spending', 
              label: 'Income & Expense Analysis', 
              content: `This month's spending features: Highest category: "${data.spending?.highestSpendingCategory}". Lowest Category: "${data.spending?.lowestSpendingCategory}". Average daily transaction flow: ₹${fmt(data.spending?.avgDailySpending)}. Weekend total outlay: ₹${fmt(data.spending?.weekendSpending)}. Uncategorized leak: ₹${fmt(data.spending?.uncategorizedExpenses)}.` 
            },
            { 
              id: 'budgets', 
              label: 'Budget Performance Audit', 
              content: `You utilized ${data.budget?.budgetUtilization || 0}% of category budget limit totals. Remaining margin: ₹${fmt(data.budget?.remainingBudget)}. Breached limits count: ${data.budget?.exceededBudgets || 0}. Budget Health Index: ${data.budget?.budgetHealthScore || 0}%. Projected monthly overspend margin: ₹${fmt(data.budget?.projectedOverspend)}.` 
            },
            { 
              id: 'goals', 
              label: 'Milestone Progress Tracker', 
              content: `Overall target goal completion is evaluated at ${data.goals?.goalCompletionPct || 0}%. You have ${data.goals?.activeGoals || 0} active milestones. Check predictions for projected milestone achievement dates.` 
            },
            { 
              id: 'loans', 
              label: 'Liabilities Outstanding Summary', 
              content: `Total outstanding debt liability is evaluated at ₹${fmt(data.loans?.totalDebt)}, accounting for ${data.loans?.debtToIncomeRatio || 0}% debt-to-income EMI ratio. Monthly EMI overhead: ₹${fmt(data.loans?.monthlyEMI)}.` 
            },
            { 
              id: 'subs', 
              label: 'Subscription Auditing Check', 
              content: `Recurring subscriptions cost ₹${fmt(data.subscriptions?.monthlySubscriptionCost)}/month, totaling ₹${fmt(data.subscriptions?.yearlyCost)}/year. Detected duplicate items count: ${data.subscriptions?.duplicates?.length || 0}.` 
            }
          ].map((sec) => {
            const isExpanded = expandedSection === sec.id;
            return (
              <div key={sec.id} className="border border-slate-700/30 rounded-xl overflow-hidden bg-slate-950/20">
                <button
                  onClick={() => toggle(sec.id)}
                  className="w-full px-4 py-3.5 flex justify-between items-center hover:bg-slate-900/40 transition-colors cursor-pointer text-left"
                >
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">
                    {sec.label}
                  </span>
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="p-4 border-t border-slate-700/20 text-xs text-slate-400 leading-relaxed font-semibold">
                    {sec.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Exporter triggers */}
        <div className="pt-4 border-t border-slate-700/20">
          <DownloadButtons />
        </div>
      </div>
    </div>
  );
}
