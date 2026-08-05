import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';

/**
 * Smart alert card deck matching standard severities (Critical, Warning, Information)
 */
export default function AlertCard({ alerts = [] }) {
  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'Critical':
        return {
          bg: 'bg-red-500/10 border-red-500/20 text-red-400',
          border: 'border-red-500/30',
          icon: <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        };
      case 'Warning':
        return {
          bg: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
          border: 'border-orange-500/30',
          icon: <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
        };
      default:
        return {
          bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          border: 'border-blue-500/30',
          icon: <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
        };
    }
  };

  const getLinkPath = (moduleName) => {
    switch (moduleName) {
      case 'Wallets': return '/wallets';
      case 'Budget': return '/budget';
      case 'Expenses': return '/expenses';
      case 'Goals': return '/goals';
      case 'Loans': return '/loans';
      case 'Subscriptions': return '/subscriptions';
      default: return '/dashboard';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="p-5 text-center border border-slate-800 rounded-2xl bg-dark-800/10">
        <span className="text-xl">🛡️</span>
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mt-2">All Safe</h4>
        <p className="text-[10px] text-slate-500 mt-1">No alerts or anomalies detected for this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
        Smart Financial Alerts
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert, idx) => {
          const styles = getSeverityStyle(alert.severity);
          return (
            <div 
              key={idx} 
              className={`p-4 rounded-2xl border flex flex-col justify-between transition-all hover:scale-[1.01] ${styles.bg} ${styles.border}`}
            >
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[8px] font-black uppercase tracking-wider">
                    {alert.severity} Severity
                  </span>
                  {styles.icon}
                </div>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-100 leading-tight">
                  {alert.title}
                </h4>
                <p className="text-[11px] font-semibold mt-1.5 text-slate-300 leading-relaxed">
                  {alert.description}
                </p>
              </div>
              
              {alert.action && (
                <div className="mt-4 pt-2.5 border-t border-slate-700/10 flex justify-end">
                  <Link
                    to={getLinkPath(alert.module)}
                    className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-200 hover:text-white transition-colors"
                  >
                    <span>{alert.action}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
