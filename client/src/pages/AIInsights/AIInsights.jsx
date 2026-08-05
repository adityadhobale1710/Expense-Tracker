import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
  Clock,
  ShieldCheck,
  Sparkles,
  HeartPulse,
  Activity,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Target,
  CreditCard,
  DollarSign
} from 'lucide-react';

export default function AIInsights() {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'alerts' | 'wealth' | 'report'
  const [insights, setInsights] = useState(null);
  const [report, setReport] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await api.get('/ai/insights');
      if (res.data && res.data.success) {
        setInsights(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load financial insights');
    } finally {
      setLoadingInsights(false);
    }
  };

  const generateReport = async () => {
    setLoadingReport(true);
    try {
      const res = await api.get('/ai/report');
      if (res.data && res.data.success) {
        setReport(res.data.data);
        toast.success('AI Monthly Report generated successfully!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate monthly report');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleCopyReport = () => {
    if (!report?.executiveSummary) return;
    navigator.clipboard.writeText(report.executiveSummary);
    setCopiedReport(true);
    toast.success('Executive summary copied to clipboard!');
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Helper to format currency in Indian style
  const fmt = (n) => (n ?? 0).toLocaleString('en-IN');

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-450 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 75) return 'text-primary-400 border-primary-500/20 bg-primary-500/5';
    if (score >= 60) return 'text-amber-450 border-amber-500/20 bg-amber-500/5';
    if (score >= 40) return 'text-orange-450 border-orange-500/20 bg-orange-500/5';
    return 'text-red-450 border-red-500/20 bg-red-500/5';
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'High':
        return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      case 'Medium':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      default:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    }
  };

  if (loadingInsights) {
    return (
      <div className="space-y-6 animate-fade-in p-6">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-96 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 h-80 bg-slate-800 rounded-3xl animate-pulse" />
          <div className="md:col-span-2 h-80 bg-slate-800 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  const health = insights?.financialHealth || { score: 82, grade: 'Good', strengths: [], weaknesses: [], improvementAreas: [] };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">💡 AI Financial Advisor</h1>
            <span className="px-2.5 py-1 text-xs font-black bg-primary-500/15 border border-primary-500/30 text-primary-400 rounded-full flex items-center gap-1.5 animate-pulse">
              Active Analysis
            </span>
          </div>
          <p className="page-subtitle">Proactive balance scans, smart risk classification, MoM trend runs, and AI wealth advice</p>
        </div>
        <button
          onClick={fetchInsights}
          className="btn-primary text-xs px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Activity size={14} /> Refresh Analysis
        </button>
      </div>

      {/* ─── Top Cards (Health Score Gauge & Strengths) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Health Circle Card */}
        <div className="card border border-slate-700/60 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-600/5 rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-1.5">
            <HeartPulse size={14} className="text-primary-400" /> Financial Health Score
          </h3>
          
          <div className="relative w-36 h-36 flex items-center justify-center mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" className="stroke-slate-800" strokeWidth="8" fill="transparent" />
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-primary-500 transition-all duration-1000 ease-out"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251"
                strokeDashoffset={251 - (251 * health.score) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-slate-100">{health.score}</span>
              <span className="text-[10px] text-primary-400 font-extrabold uppercase tracking-widest mt-0.5">
                {health.grade}
              </span>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${getScoreColor(health.score)}`}>
            Financial Grade: {health.grade}
          </span>
        </div>

        {/* Strengths & Focus Areas */}
        <div className="lg:col-span-2 card border border-slate-700/60 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
              <Award size={14} className="text-emerald-450" /> Score Breakdown & Highlights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  🟢 Strengths
                </span>
                <ul className="space-y-2 text-xs font-semibold text-slate-300">
                  {health.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-emerald-500/5 p-2 border border-emerald-500/10 rounded-xl">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                  🔴 Areas for Attention
                </span>
                <ul className="space-y-2 text-xs font-semibold text-slate-300">
                  {health.weaknesses.map((weak, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-rose-500/5 p-2 border border-rose-500/10 rounded-xl">
                      <span className="text-rose-400 mt-0.5">!</span>
                      <span>{weak}</span>
                    </li>
                  ))}
                  {health.weaknesses.length === 0 && (
                    <li className="text-slate-500 text-xs italic">No vulnerabilities identified in this period.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-4 mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] text-slate-500 font-bold">
            <span>Primary Focus: {health.improvementAreas[0] || 'Maintain balanced savings.'}</span>
            <span>Analyzed at {new Date(insights?.generatedAt || Date.now()).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* ─── Main Body with Tabs Picker ─── */}
      <div className="card border border-slate-700/60 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary-500" size={18} />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Advisor Intelligence Portal</h2>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-dark-900/60 p-1 rounded-xl border border-slate-800">
            {['summary', 'alerts', 'wealth', 'report'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
                  activeTab === tab
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'wealth' ? 'Wealth Advice' : tab === 'alerts' ? 'Active Risks' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Tab Content Views ─── */}
        <AnimatePresence mode="wait">
          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Executive Summary Narrative */}
              <div className="bg-primary-600/5 border border-primary-500/10 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-4 right-4 text-xs font-black text-primary-400/30 uppercase tracking-widest">
                  Advisor Narrative
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-primary-400 mb-2">
                  Personal Executive Briefing
                </h3>
                <p className="text-xs font-semibold leading-relaxed text-slate-200 whitespace-pre-line">
                  {insights?.aiExplanation}
                </p>
              </div>

              {/* MoM Trend Summaries */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Month-over-Month Velocity checks
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights?.trendSummary.map((trend, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-slate-900/30 border border-slate-800 rounded-xl">
                      <div className="p-1.5 bg-dark-900 border border-slate-800 rounded-lg text-primary-400 mt-0.5">
                        <TrendingUp size={12} />
                      </div>
                      <span className="text-xs font-semibold text-slate-300 leading-normal">
                        {trend}
                      </span>
                    </div>
                  ))}
                  {insights?.trendSummary.length === 0 && (
                    <div className="text-xs text-slate-500 italic">No significant MoM changes detected.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'alerts' && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {insights?.activeRisks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-2xl text-xl mb-3">
                    ✓
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">No active risks detected</h4>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs">
                    Your financial ratios, budget caps, and emergency buffer levels are currently fully optimized.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights?.activeRisks.map((risk, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-900/30 border border-slate-855 rounded-2xl flex flex-col justify-between hover:border-slate-700/50 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase border ${getSeverityStyle(risk.severity)}`}>
                            {risk.severity} Severity
                          </span>
                          <span className="text-xs">⚠️</span>
                        </div>
                        <h4 className="text-xs font-black text-slate-200 uppercase tracking-wide leading-tight">
                          {risk.title}
                        </h4>
                        <p className="text-xs font-semibold text-slate-350 leading-relaxed">
                          {risk.description}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/80 bg-slate-950/20 p-2 rounded-xl text-[10px] font-semibold text-slate-400">
                        <span className="text-primary-400 font-extrabold uppercase block text-[8px] tracking-wider mb-1">
                          Recommended Action
                        </span>
                        {risk.recommendedAction}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'wealth' && (
            <motion.div
              key="wealth"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights?.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700/50 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-extrabold uppercase">
                          {rec.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">Impact: **{rec.impact}**</span>
                      </div>
                      <h4 className="text-xs font-black text-slate-200 uppercase tracking-wide">
                        {rec.title}
                      </h4>
                      <p className="text-xs font-semibold text-slate-400 leading-relaxed">
                        {rec.description}
                      </p>
                    </div>

                    <div className="mt-4 space-y-2">
                      <span className="text-[8px] font-extrabold uppercase tracking-wider text-purple-400 block">
                        Action Steps
                      </span>
                      <ul className="space-y-1.5">
                        {rec.actionableSteps.map((step, sIdx) => (
                          <li key={sIdx} className="text-[10px] font-semibold text-slate-300 flex items-start gap-1.5 leading-relaxed">
                            <span className="text-purple-400 flex-shrink-0">•</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Dynamic report trigger */}
              {!report ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-750 rounded-3xl">
                  <div className="w-14 h-14 bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center rounded-2xl text-2xl mb-4">
                    📊
                  </div>
                  <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider">Generate Dynamic Monthly Report</h4>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-sm leading-relaxed mb-6">
                    Runs the MonthlyReportGenerator pipeline to aggregate income/expense lists, budget compliance scores, goal margins, and liability matrices with AI analysis.
                  </p>
                  <button
                    onClick={generateReport}
                    disabled={loadingReport}
                    className="btn-primary text-xs px-6 py-3 font-bold uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {loadingReport ? 'Running Report pipeline...' : 'Generate Monthly Financial Report'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Executive summary card with download option */}
                  <div className="bg-primary-600/5 border border-primary-500/10 p-5 rounded-2xl relative">
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={handleCopyReport}
                        className="p-1.5 bg-dark-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg hover:shadow cursor-pointer transition-colors"
                        title="Copy Summary"
                      >
                        {copiedReport ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-primary-400 mb-3 flex items-center gap-1.5">
                      <FileText size={14} /> AI Executive Narrative
                    </h3>
                    <p className="text-xs font-semibold leading-relaxed text-slate-250 whitespace-pre-line">
                      {report.executiveSummary}
                    </p>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-900/30 border border-slate-800 p-3 rounded-2xl text-center">
                      <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500 block">Total Earned</span>
                      <span className="text-base font-black text-slate-100 block mt-1">₹{fmt(report.summary.totalIncome)}</span>
                    </div>
                    <div className="bg-slate-900/30 border border-slate-800 p-3 rounded-2xl text-center">
                      <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500 block">Total Spent</span>
                      <span className="text-base font-black text-slate-100 block mt-1">₹{fmt(report.summary.totalExpense)}</span>
                    </div>
                    <div className="bg-slate-900/30 border border-slate-800 p-3 rounded-2xl text-center">
                      <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500 block">Net Surplus</span>
                      <span className={`text-base font-black block mt-1 ${report.summary.savings >= 0 ? 'text-emerald-400' : 'text-red-450'}`}>
                        ₹{fmt(report.summary.savings)}
                      </span>
                    </div>
                    <div className="bg-slate-900/30 border border-slate-800 p-3 rounded-2xl text-center">
                      <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500 block">Savings Rate</span>
                      <span className="text-base font-black text-primary-400 block mt-1">{report.summary.savingsRate.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Accordions for granular lists */}
                  <div className="space-y-3">
                    {[
                      { id: 'budgets', label: 'Budget Performance Tracker', list: report.budgetPerformance, icon: <Target size={12} /> },
                      { id: 'goals', label: 'Milestone Progress Tracker', list: report.goalProgress, icon: <Award size={12} /> },
                      { id: 'loans', label: 'Liability Outstanding Summary', list: report.loanOverview, icon: <CreditCard size={12} /> },
                      { id: 'subs', label: 'Subscription Auditing Check', list: report.subscriptionReview, icon: <Clock size={12} /> },
                    ].map((sec) => {
                      const isExpanded = expandedSection === sec.id;
                      return (
                        <div key={sec.id} className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/20">
                          <button
                            onClick={() => setExpandedSection(isExpanded ? null : sec.id)}
                            className="w-full px-4 py-3.5 flex justify-between items-center hover:bg-slate-900/40 transition-colors cursor-pointer"
                          >
                            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                              {sec.icon} {sec.label} ({sec.list.length})
                            </span>
                            {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="border-t border-slate-800 overflow-hidden"
                              >
                                <div className="p-4 space-y-2">
                                  {sec.list.length === 0 ? (
                                    <p className="text-[10px] text-slate-500 italic">No records active in this module.</p>
                                  ) : (
                                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                      {sec.list.map((item, idx) => (
                                        <div key={idx} className="p-2.5 bg-slate-900/30 border border-slate-800 rounded-xl flex justify-between items-center text-[11px] font-semibold text-slate-300">
                                          <div>
                                            <p className="font-bold text-slate-200">{item.category || item.title || item.name}</p>
                                            {item.cycle && <span className="text-[8px] text-slate-500 font-extrabold uppercase">{item.cycle} cycle</span>}
                                            {item.interest && <span className="text-[8px] text-slate-500 font-extrabold uppercase">Interest: {item.interest}%</span>}
                                          </div>
                                          
                                          <div className="text-right">
                                            {item.spent !== undefined && (
                                              <p className="text-slate-200">
                                                ₹{fmt(item.spent)} / <span className="text-slate-500">₹{fmt(item.limit)} ({item.usagePct}%)</span>
                                              </p>
                                            )}
                                            {item.saved !== undefined && (
                                              <p className="text-slate-200">
                                                ₹{fmt(item.saved)} / <span className="text-slate-500">₹{fmt(item.target)} ({item.progressPct}%)</span>
                                              </p>
                                            )}
                                            {item.remaining !== undefined && (
                                              <p className="text-slate-200">
                                                Outstanding: <span className="text-rose-400 font-bold">₹{fmt(item.remaining)}</span> (EMI: ₹{fmt(item.emi)})
                                              </p>
                                            )}
                                            {item.cost !== undefined && (
                                              <p className="text-slate-200">₹{fmt(item.cost)}</p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setReport(null)}
                      className="btn-danger text-xs px-4 py-2 rounded-xl uppercase font-bold tracking-wider cursor-pointer"
                    >
                      Clear Report
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
