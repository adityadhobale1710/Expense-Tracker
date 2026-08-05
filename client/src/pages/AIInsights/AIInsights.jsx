import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { RefreshCw, FileText, Calendar, Sparkles } from 'lucide-react';

// Import sub-components
import AISummaryCard from './components/Header/AISummaryCard';
import FinancialHealthScore from './components/Header/FinancialHealthScore';
import AlertCard from './components/Recommendations/AlertCard';
import RecommendationCard from './components/Recommendations/RecommendationCard';
import SpendingInsights from './components/Insights/SpendingInsights';
import BudgetInsights from './components/Insights/BudgetInsights';
import GoalInsights from './components/Insights/GoalInsights';
import SavingsInsights from './components/Insights/SavingsInsights';
import LoanInsights from './components/Insights/LoanInsights';
import SubscriptionInsights from './components/Insights/SubscriptionInsights';
import PredictionCard from './components/Insights/PredictionCard';
import CashFlowChart from './components/Charts/CashFlowChart';
import SpendingChart from './components/Charts/SpendingChart';
import GoalProgressChart from './components/Charts/GoalProgressChart';
import BudgetTrendChart from './components/Charts/BudgetTrendChart';
import ExecutiveReport from './components/Reports/ExecutiveReport';
import LoadingSkeleton from './components/Common/LoadingSkeleton';
import ErrorState from './components/Common/ErrorState';

/**
 * Main AIInsights Page Orchestrator
 */
export default function AIInsights() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
      toast.loading('Regenerating your financial health index...', { id: 'refresh' });
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await api.get(`/ai/insights?refresh=${forceRefresh}`);
      if (res.data && res.data.success) {
        setData(res.data.data);
        if (forceRefresh) {
          toast.success('AI Insights updated successfully!', { id: 'refresh' });
        }
      } else {
        throw new Error(res.data?.message || 'Data retrieval returned unsuccessful.');
      }
    } catch (err) {
      console.error('Failed to retrieve AI insights:', err);
      const msg = err.response?.data?.message || err.message || 'Pipeline connection failed.';
      setError(msg);
      if (forceRefresh) {
        toast.error('Failed to update insights.', { id: 'refresh' });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleScrollToReport = () => {
    const element = document.getElementById('executive-report-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => fetchInsights(false)} />;
  }

  // Format Recharts data mappings
  const budgetsList = data.budget?.totalBudgets > 0 ? (data.budget.worstPerformingBudget !== 'None' ? [
    { category: 'Worst Performing', limit: data.budget.projectedOverspend || 15000, spent: (data.budget.projectedOverspend * 1.3) || 19500 },
    { category: 'Best Performing', limit: data.budget.remainingBudget || 10000, spent: (data.budget.remainingBudget * 0.4) || 4000 }
  ] : []) : [];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/30 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            💡 AI Insights
          </h1>
          <p className="text-xs text-slate-400 mt-1 leading-none font-semibold">
            AI-powered analysis of your financial health
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleScrollToReport}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700/50 shadow active:scale-95 transition-all cursor-pointer"
          >
            <FileText size={14} />
            Generate AI Report
          </button>
          
          <button
            onClick={() => fetchInsights(true)}
            disabled={refreshing}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl border border-primary-500/20 shadow active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh Insights
          </button>
        </div>
      </div>

      {/* Generation Meta Timestamps */}
      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold bg-slate-900/30 p-2 border border-slate-800/80 rounded-xl w-fit">
        <Calendar size={12} />
        <span>Last Analyzed: {new Date(data.lastGenerated).toLocaleTimeString()}</span>
        <span className="text-slate-600">•</span>
        <span>Run Time: {data.generatedIn}</span>
      </div>

      {/* Row 1: Executive Briefing & Health Dial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AISummaryCard 
            userName={user?.name} 
            score={data.financialHealth?.score} 
            summary={data.summary} 
          />
        </div>
        <div>
          <FinancialHealthScore health={data.financialHealth} />
        </div>
      </div>

      {/* Row 2: Severity warnings & Priorities sorted actions */}
      <div className="grid grid-cols-1 gap-6">
        <AlertCard alerts={data.alerts} />
        <RecommendationCard recommendations={data.recommendations} />
      </div>

      {/* Row 3: Insights grids */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Financial Module Insights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <SpendingInsights spending={data.spending} />
          <BudgetInsights budget={data.budget} />
          <GoalInsights goals={data.goals} />
          <SavingsInsights savings={data.savings} />
          <LoanInsights loans={data.loans} />
          <SubscriptionInsights subscriptions={data.subscriptions} />
        </div>
      </div>

      {/* Row 4: Multi-Horizons Predictions & Recharts Plots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <PredictionCard predictions={data.predictions} />
        </div>
        <div className="lg:col-span-2">
          <CashFlowChart forecast={data.predictions?.cashFlowForecast} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingChart 
          categoryBreakdown={data.spending?.categoryBreakdown || []} 
          anomalies={data.spending?.anomalies || []} 
        />
        <GoalProgressChart goals={data.goals?.goalsList || []} />
      </div>

      {/* Row 5: Detailed Executive Report */}
      <div id="executive-report-section">
        <ExecutiveReport data={data} summary={data.summary} />
      </div>
    </div>
  );
}
