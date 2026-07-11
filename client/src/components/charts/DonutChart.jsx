import { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { FilterX } from 'lucide-react';

export default function DonutChart({ categoryData, selectedCategory, onSelectCategory }) {
  const [activeIndex, setActiveIndex] = useState(-1);

  if (!categoryData || categoryData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-dark-800/80 border border-slate-700/60 rounded-2xl p-6">
        <p className="text-sm font-semibold text-slate-500">Record expenses to see category shares</p>
      </div>
    );
  }

  const totalExpense = categoryData.reduce((sum, item) => sum + item.total, 0);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  const handleSliceClick = (data) => {
    if (selectedCategory === data.name) {
      onSelectCategory(null); // Clear filter
    } else {
      onSelectCategory(data.name); // Filter by category
    }
  };

  // Custom active shape renderer for slice hover expansions
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
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 8}
          outerRadius={outerRadius + 12}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
        <circle cx={ex} cy={ey} r={3} fill={fill} />
        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey - 4} textAnchor={textAnchor} fill="var(--slate-200)" className="text-[10px] font-bold">
          {payload.name}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey + 8} textAnchor={textAnchor} fill={fill} className="text-[11px] font-black font-mono">
          ₹{value.toLocaleString('en-IN')}
        </text>
      </g>
    );
  };

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-4">
      
      {/* Header with clear filters */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Expense Category Splits</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Click slice to filter transaction records</p>
        </div>
        {selectedCategory && (
          <button
            onClick={() => onSelectCategory(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl hover:bg-rose-500/20 transition-all cursor-pointer"
          >
            <FilterX size={12} />
            <span>Clear Filter ({selectedCategory})</span>
          </button>
        )}
      </div>

      {/* Pie Chart and Side Legends Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        
        {/* Pie graphic */}
        <div className="h-60 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                dataKey="total"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                onClick={handleSliceClick}
                stroke="none"
              >
                {categoryData.map((entry, index) => {
                  const isSelected = selectedCategory === entry.name;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="cursor-pointer transition-all duration-300"
                      style={{
                        filter: selectedCategory && !isSelected ? 'grayscale(80%) opacity(30%)' : 'none'
                      }}
                    />
                  );
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center metric indicator */}
          {!selectedCategory && activeIndex === -1 && (
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Total spent</span>
              <span className="text-lg font-black text-slate-100 font-mono">
                ₹{totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>

        {/* Legend listing */}
        <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
          {categoryData.map((cat, idx) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <div
                key={idx}
                onClick={() => handleSliceClick(cat)}
                className={`flex justify-between items-center text-xs font-semibold py-2 px-3 rounded-xl border cursor-pointer transition-all ${
                  selectedCategory
                    ? isSelected
                      ? 'bg-slate-800/80 border-slate-600 text-white font-bold scale-[1.01]'
                      : 'border-transparent text-slate-500 opacity-40 hover:opacity-60'
                    : 'border-transparent text-slate-300 hover:bg-slate-800/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className="w-3 h-3 rounded-lg inline-block flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-base flex-shrink-0">{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[10px] text-slate-500">{cat.count} txns</span>
                  <span className="font-bold text-slate-200">₹{cat.total.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-slate-400">{cat.percentage.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
