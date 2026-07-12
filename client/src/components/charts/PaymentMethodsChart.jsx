import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import ChartCard from './ChartCard';

export default function PaymentMethodsChart({ rawExpenses = [], currencySymbol = '₹' }) {
  
  const paymentData = useMemo(() => {
    if (!rawExpenses || rawExpenses.length === 0) return [];

    const methodMap = {
      upi: { name: 'UPI', total: 0, count: 0, color: '#3b82f6', icon: '📱' },
      cash: { name: 'Cash', total: 0, count: 0, color: '#10b981', icon: '💵' },
      card: { name: 'Card', total: 0, count: 0, color: '#f59e0b', icon: '💳' },
      wallet: { name: 'Wallet', total: 0, count: 0, color: '#a855f7', icon: '👛' },
      bank: { name: 'Net Banking', total: 0, count: 0, color: '#06b6d4', icon: '🏦' }
    };

    let otherTotal = 0;
    let otherCount = 0;

    rawExpenses.forEach((exp) => {
      const method = (exp.paymentMethod || 'other').toLowerCase();
      if (methodMap[method]) {
        methodMap[method].total += exp.amount;
        methodMap[method].count += 1;
      } else {
        otherTotal += exp.amount;
        otherCount += 1;
      }
    });

    const list = Object.values(methodMap).filter(item => item.total > 0);
    
    if (otherTotal > 0) {
      list.push({
        name: 'Other',
        total: otherTotal,
        count: otherCount,
        color: '#64748b',
        icon: '📁'
      });
    }

    const totalSpent = list.reduce((sum, i) => sum + i.total, 0);
    return list.map(item => ({
      ...item,
      percentage: totalSpent > 0 ? (item.total / totalSpent) * 100 : 0
    })).sort((a, b) => b.total - a.total);

  }, [rawExpenses]);

  if (paymentData.length === 0) {
    return (
      <ChartCard title="Payment Method Splits" subtitle="Outflow channels comparison">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          Record transaction payment methods to view this split.
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Transaction Channel splits"
      subtitle="Outflow volumes grouped by payment methods (UPI, Cash, Card, Wallet, Net Banking)"
      infoText="Tracks settlement velocity. Grouping expenses by payment instrument helps isolate which channels (e.g. UPI vs Credit Cards) generate the highest spending velocity."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center h-full">
        
        {/* Pie */}
        <div className="h-56 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={68}
                dataKey="total"
                stroke="none"
              >
                {paymentData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="hover:opacity-85 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--chart-tooltip-bg)',
                  border: '1px solid var(--chart-tooltip-border)',
                  borderRadius: '10px',
                  color: 'var(--chart-tooltip-text)',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
                formatter={(value) => `${currencySymbol}${value.toLocaleString()}`}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute text-center flex flex-col items-center justify-center">
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Top Channel</span>
            <span className="text-xs font-black text-slate-200">
              {paymentData[0]?.name}
            </span>
          </div>
        </div>

        {/* Legend list */}
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {paymentData.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs font-semibold py-1.5 px-2 rounded-xl border border-transparent text-slate-350 hover:bg-slate-800/40 hover:text-white transition-all">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-lg inline-block flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span>{item.icon}</span>
                <span className="truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-right flex-shrink-0">
                <span className="font-bold text-slate-200">{currencySymbol}{Math.round(item.total).toLocaleString()}</span>
                <span className="text-[9px] text-slate-500 font-bold">({item.percentage.toFixed(0)}%)</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </ChartCard>
  );
}
