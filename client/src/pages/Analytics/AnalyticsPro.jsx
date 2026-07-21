import { Link } from 'react-router-dom';
import { Sparkles, BarChart2, ArrowLeft } from 'lucide-react';

export default function AnalyticsPro() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-purple-500/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Main glassmorphism card */}
      <div className="relative max-w-lg w-full p-8 md:p-10 rounded-3xl border border-slate-700/40 bg-slate-900/50 backdrop-blur-xl shadow-2xl text-center space-y-6 animate-fade-in">
        {/* Animated icon container */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 group">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 blur opacity-40 group-hover:opacity-75 transition-opacity duration-300" />
          <BarChart2 className="relative text-white" size={36} />
          <Sparkles className="absolute -top-1 -right-1 text-amber-300 animate-pulse" size={18} />
        </div>

        {/* Heading and details */}
        <div className="space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
            Analytics Pro
          </h2>
          <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto leading-relaxed">
            All analytical charts, tracking metrics, and data breakdowns have been removed from this page.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

        {/* Back navigation CTA */}
        <div className="pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-700/50 hover:border-slate-600 transition-all hover:scale-105 active:scale-95 shadow-md shadow-black/10"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
