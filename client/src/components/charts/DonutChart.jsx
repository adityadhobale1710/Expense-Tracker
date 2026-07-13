import { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { FilterX, ArrowLeft, RefreshCcw } from 'lucide-react';
import ChartCard from './ChartCard';

export default function DonutChart({ 
  categoryData = [], 
  rawExpenses = [],
  selectedCategory, 
  onSelectCategory,
  currencySymbol = '₹'
}) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hoveredData, setHoveredData] = useState(null);
  const [drillDownCategory, setDrillDownCategory] = useState(null);

  const totalExpense = categoryData.reduce((sum, item) => sum + item.total, 0);

  // Drill down dataset computation
  const drillDownData = useMemo(() => {
    if (!drillDownCategory || rawExpenses.length === 0) return [];

    // Filter raw expenses matching the drill-down category name
    const matchingExpenses = rawExpenses.filter((exp) => {
      let cat = 'Other';
      if (exp.category) {
        cat = (typeof exp.category === 'object' && exp.category !== null) ? (exp.category.name || 'Other') : (exp.category || 'Other');
      }
      return cat.toLowerCase() === drillDownCategory.toLowerCase();
    });

    // Group by title/merchant
    const merchantMap = {};
    matchingExpenses.forEach((exp) => {
      const merchant = exp.title || 'Other Merchant';
      merchantMap[merchant] = (merchantMap[merchant] || 0) + exp.amount;
    });

    const breakdown = Object.entries(merchantMap).map(([name, total]) => ({
      name,
      total,
      color: '#6366f1' // will distribute colors procedurally
    })).sort((a, b) => b.total - a.total).slice(0, 7); // top 7 merchants

    const totalDrillSpent = breakdown.reduce((sum, item) => sum + item.total, 0);
    
    // Assign procedural color scales
    const hues = [250, 270, 290, 310, 330, 210, 190];
    return breakdown.map((item, idx) => ({
      ...item,
      percentage: totalDrillSpent > 0 ? (item.total / totalDrillSpent) * 100 : 0,
      color: `hsl(${hues[idx % hues.length]}, 70%, 55%)`,
      icon: '🏪'
    }));
  }, [drillDownCategory, rawExpenses]);

  if (!categoryData || categoryData.length === 0) {
    return (
      <ChartCard title="Category Allocation" subtitle="Expense splits">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          Record expenses to see category breakdowns.
        </div>
      </ChartCard>
    );
  }

  const onPieEnter = (data, index) => {
    setActiveIndex(index);
    setHoveredData(data);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
    setHoveredData(null);
  };

  const handleSliceClick = (data) => {
    const catName = data.name;
    if (drillDownCategory) return; // no dual layer clicks

    if (selectedCategory === catName) {
      onSelectCategory(null);
    } else {
      onSelectCategory(catName);
    }
  };

  const handleSliceDoubleClick = (data) => {
    if (drillDownCategory) return;
    setDrillDownCategory(data.name);
    onSelectCategory(data.name);
  };

  const handleExitDrillDown = () => {
    setDrillDownCategory(null);
    onSelectCategory(null);
    setActiveIndex(-1);
    setHoveredData(null);
  };

  // Custom active shape renderer for slice hover expansions
  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 8) * cos;
    const sy = cy + (outerRadius + 8) * sin;
    const mx = cx + (outerRadius + 15) * cos;
    const my = cy + (outerRadius + 15) * sin;
    const ex = sx + (cos >= 0 ? 1 : -1) * 12;
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
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 7}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
        <circle cx={ex} cy={ey} r={2.5} fill={fill} />
        <text x={ex + (cos >= 0 ? 1 : -1) * 6} y={ey - 4} textAnchor={textAnchor} fill="var(--slate-200)" className="text-[9px] font-bold">
          {payload.name.substring(0, 16)}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 6} y={ey + 8} textAnchor={textAnchor} fill={fill} className="text-[10px] font-extrabold font-mono">
          {currencySymbol}{value.toLocaleString('en-IN')}
        </text>
      </g>
    );
  };

  const activeData = drillDownCategory ? drillDownData : categoryData;
  const currentTotalSum = drillDownCategory ? drillDownData.reduce((sum, i) => sum + i.total, 0) : totalExpense;

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-5 h-full justify-between">
      
      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 truncate">
            {drillDownCategory && (
              <button
                onClick={handleExitDrillDown}
                className="p-1 hover:bg-slate-700/40 rounded-lg text-primary-400 hover:text-primary-300 transition-all cursor-pointer"
                title="Back to Categories"
              >
                <ArrowLeft size={13} />
              </button>
            )}
            <span>{drillDownCategory ? `Top: ${drillDownCategory}` : 'Category Outflow Splits'}</span>
          </h3>
          <p className="text-[9px] text-slate-500 font-semibold mt-0.5">
            {drillDownCategory ? 'Merchants list breakdown' : 'Double click category to drill down'}
          </p>
        </div>

        {/* Clear/Reset button */}
        {(selectedCategory || drillDownCategory) && (
          <button
            onClick={handleExitDrillDown}
            className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-extrabold bg-rose-500/10 border border-rose-500/20 text-rose-455 rounded-xl hover:bg-rose-500/20 transition-all cursor-pointer"
          >
            <FilterX size={10} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Donut and Legends Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        
        {/* Circle Pie Wrapper */}
        <div className="h-56 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={activeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={76}
                dataKey="total"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                onClick={handleSliceClick}
                onDoubleClick={handleSliceDoubleClick}
                stroke="none"
              >
                {activeData.map((entry, index) => {
                  const isSelected = selectedCategory === entry.name;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="cursor-pointer transition-all duration-300"
                      style={{
                        filter: selectedCategory && !isSelected && !drillDownCategory ? 'grayscale(80%) opacity(30%)' : 'none'
                      }}
                    />
                  );
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Central Summary overlay */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            {hoveredData ? (
              <>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider truncate max-w-[80px]">
                  {hoveredData.name}
                </span>
                <span className="text-sm font-black text-slate-105 font-mono">
                  {currencySymbol}{Math.round(hoveredData.total).toLocaleString()}
                </span>
                <span className="text-[9px] text-primary-400 font-bold">
                  {hoveredData.percentage.toFixed(0)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                  {drillDownCategory ? 'Subtotal' : 'Total spent'}
                </span>
                <span className="text-base font-black text-slate-150 font-mono">
                  {currencySymbol}{Math.round(currentTotalSum).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Custom Legend details */}
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {activeData.map((cat, idx) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <div
                key={idx}
                onClick={() => handleSliceClick(cat)}
                onDoubleClick={() => handleSliceDoubleClick(cat)}
                className={`flex justify-between items-center text-[10px] font-semibold py-1.5 px-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedCategory && !drillDownCategory
                    ? isSelected
                      ? 'bg-slate-800/80 border-slate-700 text-white font-bold scale-[1.01]'
                      : 'border-transparent text-slate-550 opacity-40 hover:opacity-60'
                    : 'border-transparent text-slate-350 hover:bg-slate-800/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-xs flex-shrink-0">{cat.icon}</span>
                  <span className="truncate max-w-[80px] sm:max-w-[120px]">{cat.name}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-right">
                  <span className="font-bold text-slate-205">{currencySymbol}{Math.round(cat.total).toLocaleString()}</span>
                  <span className="text-[9px] text-slate-500 font-bold">{cat.percentage.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
