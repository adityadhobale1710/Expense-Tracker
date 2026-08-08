import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import ChartCard from './ChartCard';

const METHOD_META = {
  upi: { name: 'UPI', color: '#3b82f6', icon: '📱' },
  cash: { name: 'Cash', color: '#10b981', icon: '💵' },
  card: { name: 'Card', color: '#f59e0b', icon: '💳' },
  bank: { name: 'Net Banking', color: '#06b6d4', icon: '🏦' },
  other: { name: 'Other', color: '#64748b', icon: '📁' },
};

const ChannelTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div
      style={{
        background: 'var(--chart-tooltip-bg)',
        border: '1px solid var(--chart-tooltip-border)',
        borderRadius: '12px',
        color: 'var(--chart-tooltip-text)',
        fontSize: '11px',
        fontWeight: 'bold',
        padding: '10px 12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color }} />
        <span>{item.name}</span>
      </div>
      <div className="font-black mt-1">₹{item.total.toLocaleString('en-IN')}</div>
      <div className="font-semibold opacity-80 mt-0.5">
        {item.percentage.toFixed(1)}% · {item.count} transaction{item.count === 1 ? '' : 's'}
      </div>
    </div>
  );
};

export default function TransactionChannelSplitsChart({ rawIncomes = [], currencySymbol = '₹' }) {
  const { list, hasReal } = useMemo(() => {
    if (!rawIncomes || rawIncomes.length === 0) {
      return {
        list: [],
        hasReal: false,
      };
    }

    const map = {};
    let hasRealChannel = false;

    rawIncomes.forEach((inc) => {
      const raw = (inc.paymentMethod || '').trim().toLowerCase();
      const method = METHOD_META[raw] ? raw : 'other';

      if (raw && METHOD_META[raw]) {
        hasRealChannel = true;
      }

      if (!map[method]) map[method] = { ...METHOD_META[method], total: 0, count: 0 };
      map[method].total += Number(inc.amount) || 0;
      map[method].count += 1;
    });

    const entries = Object.values(map).filter((item) => item.total > 0);
    const totalIncome = entries.reduce((sum, item) => sum + item.total, 0);

    const list = entries
      .map((item) => ({
        ...item,
        percentage: totalIncome > 0 ? (item.total / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      list,
      hasReal: hasRealChannel,
    };
  }, [rawIncomes]);

  if (!list.length || !hasReal) {
    return (
      <ChartCard title="Transaction Channel Splits" subtitle="Income distribution by transaction channel">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          No transaction channel data available
        </div>
      </ChartCard>
    );
  }

  // rename grouping property for chart rendering
  const chartData = list;

  return (
    <ChartCard
      title="Transaction Channel Splits"
      subtitle="Income distribution by transaction channel"
      infoText="Groups earnings by payment channel (UPI, Cash, Card, Net Banking, Other) to show which channels bring in the most money."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center h-full">
        {/* Pie */}
        <div className="h-56 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={68}
                dataKey="total"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="hover:opacity-85 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip content={<ChannelTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute text-center flex flex-col items-center justify-center">
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Top Channel</span>
            <span className="text-xs font-black text-slate-200">{chartData[0]?.name}</span>
          </div>
        </div>

        {/* Legend + total */}
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {chartData.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center text-xs font-semibold py-1.5 px-2 rounded-xl border border-transparent text-slate-300 hover:bg-slate-800/40 hover:text-slate-100 transition-all"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-lg inline-block flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span>{item.icon}</span>
                <span className="truncate">{item.name}</span>
                <span className="text-slate-500 font-normal">{item.count}×</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-right flex-shrink-0">
                <span className="font-bold text-slate-200">{currencySymbol}{Math.round(item.total).toLocaleString('en-IN')}</span>
                <span className="text-[9px] text-slate-500 font-bold">({item.percentage.toFixed(1)}%)</span>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center text-xs font-bold pt-2 mt-2 border-t border-slate-700/50 text-slate-200">
            <span>Total</span>
            <span className="font-mono">{currencySymbol}{chartData.reduce((sum, i) => sum + i.total, 0).toLocaleString('en-IN')} · 100%</span>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}