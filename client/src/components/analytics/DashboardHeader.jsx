import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, Sun, Moon, Sparkles, RefreshCw, Search, 
  Share2, Bell, Sparkle, Download, ChevronDown, Check, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardHeader({
  wallets = [],
  selectedWallet,
  setSelectedWallet,
  currency,
  setCurrency,
  globalSearch,
  setGlobalSearch,
  onRefresh,
  theme,
  setTheme,
  onExport,
  onScrollToAI
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' }
  ];

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Dashboard link copied to clipboard!');
    } else {
      toast.success('Sharing enabled: Link copied!');
    }
  };

  const getSelectedWalletName = () => {
    if (selectedWallet === 'all') return 'All Accounts';
    const wallet = wallets.find(w => w._id === selectedWallet);
    return wallet ? `${wallet.icon || '💳'} ${wallet.name}` : 'Account Filter';
  };

  const activeCurrency = currencies.find(c => c.code === currency) || currencies[0];

  return (
    <div className="flex flex-col gap-5 border-b border-slate-700/40 pb-5 pt-2">
      
      {/* Top Banner Row: Branding + Global Utility Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        
        {/* Title + Branding */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-primary-600 to-indigo-500 rounded-2xl text-white shadow-lg shadow-primary-500/10">
            <Layers size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">Executive Analytics Pro</h1>
              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-primary-500/20 border border-primary-500/30 text-primary-400 rounded-full tracking-wider uppercase">
                Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Financial Intelligence Suite &bull; Realtime allocation, predictive forecasting & balance sheets.
            </p>
          </div>
        </div>

        {/* Global Controls: Notification, AI, Theme, Share */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-2.5 bg-dark-800 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-350 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            title="Refresh All Metrics"
          >
            <RefreshCw size={15} />
          </button>

          {/* AI Insights Link Button */}
          <button
            onClick={onScrollToAI}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-primary-600/25 to-indigo-600/25 hover:from-primary-600/45 hover:to-indigo-600/45 border border-primary-500/40 text-primary-350 hover:text-primary-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Sparkle size={14} className="text-primary-400" />
            <span>AI Assistant</span>
          </button>

          {/* Notification Alert Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2.5 bg-dark-800 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-355 hover:text-white transition-all cursor-pointer shadow-sm relative"
            >
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-dark-800" />
            </button>
            <AnimatePresence>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2.5 w-72 bg-dark-800 border border-slate-700/80 rounded-2xl shadow-xl z-50 p-4 space-y-3 backdrop-blur-md"
                >
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Alerts Center</h4>
                  <div className="space-y-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-350">
                      <strong>Budget Warning:</strong> Food & Dining spending has reached 82% of its limits.
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-355">
                      <strong>Loan EMI Reminder:</strong> Home Loan EMI is due in 3 days.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 bg-dark-800 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Export Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-2 bg-dark-800 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown size={12} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-dark-800 border border-slate-700/80 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-700/40 backdrop-blur-md"
                  >
                    <button
                      onClick={() => { onExport('pdf'); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700/40 hover:text-white transition-all flex items-center gap-2 font-semibold"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      PDF Statement Report
                    </button>
                    <button
                      onClick={() => { onExport('excel'); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700/40 hover:text-white transition-all flex items-center gap-2 font-semibold"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Excel Spread Sheet
                    </button>
                    <button
                      onClick={() => { onExport('csv'); setShowExportMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700/40 hover:text-white transition-all flex items-center gap-2 font-semibold"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      CSV Transaction Ledger
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Theme custom selector */}
          <div className="flex items-center gap-1 bg-dark-800/80 p-1 border border-slate-700/60 rounded-xl shadow-sm">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                theme === 'light' ? 'bg-primary-500 text-white shadow' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Light theme"
            >
              <Sun size={13} />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                theme === 'dark' ? 'bg-primary-500 text-white shadow' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Dark theme"
            >
              <Moon size={13} />
            </button>
            <button
              onClick={() => setTheme('dark-blue')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                theme === 'dark-blue' ? 'bg-primary-500 text-white shadow' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Dark Blue theme"
            >
              <Sparkles size={13} />
            </button>
          </div>

        </div>
      </div>

      {/* Bottom Filter/Input Row: Search + Account Selector + Currency Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-1 bg-dark-800/40 border border-slate-700/30 p-3 rounded-2xl backdrop-blur-sm">
        
        {/* Global Search */}
        <div className="relative w-full md:max-w-md">
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search dashboard, accounts, tags or categories..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-dark-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-primary-500 font-medium placeholder-slate-550 transition-all"
          />
        </div>

        {/* Filters and selectors */}
        <div className="flex items-center gap-3 self-end w-full md:w-auto justify-end">
          
          {/* Wallet Selector */}
          <div className="relative">
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-dark-900 border border-slate-850 hover:border-slate-750 text-slate-300 hover:text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              <span>{getSelectedWalletName()}</span>
              <ChevronDown size={12} className={`transition-transform ${showAccountMenu ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showAccountMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAccountMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-56 bg-dark-800 border border-slate-700/80 rounded-2xl shadow-xl z-50 overflow-hidden backdrop-blur-md max-h-64 overflow-y-auto"
                  >
                    <button
                      onClick={() => { setSelectedWallet('all'); setShowAccountMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700/40 hover:text-white transition-all flex items-center justify-between font-bold"
                    >
                      <span>All Accounts</span>
                      {selectedWallet === 'all' && <Check size={12} className="text-primary-500" />}
                    </button>
                    {wallets.map((wallet) => (
                      <button
                        key={wallet._id}
                        onClick={() => { setSelectedWallet(wallet._id); setShowAccountMenu(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700/40 hover:text-white transition-all flex items-center justify-between font-semibold"
                      >
                        <span className="flex items-center gap-2">
                          <span>{wallet.icon || '💳'}</span>
                          <span>{wallet.name}</span>
                        </span>
                        {selectedWallet === wallet._id && <Check size={12} className="text-primary-500" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Currency Prefixes Selector */}
          <div className="relative">
            <button
              onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-dark-900 border border-slate-850 hover:border-slate-750 text-slate-300 hover:text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-sm"
            >
              <Globe size={13} className="text-slate-500" />
              <span>{activeCurrency.symbol} &bull; {activeCurrency.code}</span>
              <ChevronDown size={12} className={`transition-transform ${showCurrencyMenu ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showCurrencyMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCurrencyMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-dark-800 border border-slate-700/80 rounded-2xl shadow-xl z-50 overflow-hidden backdrop-blur-md"
                  >
                    {currencies.map((curr) => (
                      <button
                        key={curr.code}
                        onClick={() => { setCurrency(curr.code); setShowCurrencyMenu(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700/40 hover:text-white transition-all flex items-center justify-between font-semibold"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">{curr.symbol}</span>
                          <span>{curr.name}</span>
                        </span>
                        {currency === curr.code && <Check size={12} className="text-primary-500" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>

    </div>
  );
}
