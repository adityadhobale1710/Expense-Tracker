import { useState } from 'react';
import { ResponsiveContainer, PieChart as ReChartsPieChart, Pie, Cell, Sector } from 'recharts';

export default function PieChart({ incomeData }) {
  const [activeIndex, setActiveIndex] = useState(-1);

  if (!incomeData || !incomeData.sources || incomeData.sources.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-dark-800/80 border border-slate-700/60 rounded-2xl p-6">
        <p className="text-sm font-semibold text-slate-500">Record income transactions to view streams</p>
      </div>
    );
  }

  // Pre-process categories to align with requested fields: Salary, Business, Freelancing, Investment, Others
  const mappedSourcesMap = {
    Salary: { name: 'Salary', color: '#10b981', icon: '💼' },
    Business: { name: 'Business', color: '#3b82f6', icon: '🏬' },
    Freelance: { name: 'Freelancing', color: '#8b5cf6', icon: '💻' },
    Freelancing: { name: 'Freelancing', color: '#8b5cf6', icon: '💻' },
    Investment: { name: 'Investment', color: '#f59e0b', icon: '📈' },
    Gift: { name: 'Others', color: '#ec4899', icon: '🎁' },
    'Other Income': { name: 'Others', color: '#6366f1', icon: '💰' },
    Other: { name: 'Others', color: '#6b7280', icon: '📁' }
  };

  const processedData = {};
  incomeData.sources.forEach((item) => {
    const key = item.source || 'Other';
    const mapping = mappedSourcesMap[key] || { name: 'Others', color: '#6366f1', icon: '💰' };
    
    if (!processedData[mapping.name]) {
      processedData[mapping.name] = {
        name: mapping.name,
        color: mapping.color,
        icon: mapping.icon,
        total: 0,
        count: 0
      };
    }
    processedData[mapping.name].total += item.amount;
    processedData[mapping.name].count += item.count;
  });

  const chartData = Object.values(processedData).sort((a, b) => b.total - a.total);
  const grandTotal = chartData.reduce((sum, item) => sum + item.total, 0);

  chartData.forEach((item) => {
    item.percentage = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
  });

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 20) * cos;
    const my = cy + (outerRadius + 20) * sin;
    const ex = sx + (cos >= 0 ? 1 : -1) * 15;
    const ey = sy;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 5}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
        <circle cx={ex} cy={ey} r={3} fill={fill} />
        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey - 4} textAnchor={textAnchor} fill="var(--slate-200)" className="text-[10px] font-bold">
          {payload.name}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey + 8} textAnchor={textAnchor} fill={fill} className="text-[11px] font-black font-mono">
          ₹{value.toLocaleString('en-IN')} ({(percent * 100).toFixed(0)}%)
        </text>
      </g>
    );
  };

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Income Streams & Sources</h3>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Allocation by stream category</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        
        {/* Pie canvas */}
        <div className="h-60 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <ReChartsPieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={80}
                dataKey="total"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </ReChartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom Legend */}
        <div className="space-y-3">
          {chartData.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center text-xs font-semibold py-2 px-3 hover:bg-slate-800/40 rounded-xl transition-all"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span
                  className="w-3 h-3 rounded-lg inline-block flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <span className="text-slate-300 font-bold truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-200 font-black">₹{item.total.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700/40">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
