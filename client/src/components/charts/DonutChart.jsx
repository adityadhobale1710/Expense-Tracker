import { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { FilterX, ArrowLeft } from 'lucide-react';
import ChartCard from './ChartCard';
import ExpandableLegend from './ExpandableLegend';
import AnalyticsEmptyState from './AnalyticsEmptyState';
import { PieChart as PieChartIcon } from 'lucide-react';

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

  const totalExpense = useMemo(() => {
    return (categoryData || []).reduce((sum, item) => sum + Number(item?.total ?? item?.value ?? 0), 0);
  }, [categoryData]);

  // Drill down dataset computation
  const drillDownData = useMemo(() => {
    if (!drillDownCategory || !rawExpenses || rawExpenses.length === 0) return [];

    // Filter raw expenses matching the drill-down category name
    const matchingExpenses = rawExpenses.filter((exp) => {
      let cat = 'Other';
      if (exp?.category) {
        cat = (typeof exp.category === 'object' && exp.category !== null) ? (exp.category.name || 'Other') : (exp.category || 'Other');
      }
      return cat.toLowerCase() === drillDownCategory.toLowerCase();
    });

    // Group by title/merchant
    const merchantMap = {};
    matchingExpenses.forEach((exp) => {
      const merchant = exp?.title || 'Other Merchant';
      merchantMap[merchant] = (merchantMap[merchant] || 0) + (exp?.amount || 0);
    });

    const breakdown = Object.entries(merchantMap).map(([name, total]) => ({
      name,
      total: Number(total || 0),
      color: '#6366f1'
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

  // Render empty state if there's no data
  if (!categoryData || categoryData.length === 0 || totalExpense === 0) {
    return (
      <ChartCard title="Category Allocation" subtitle="Expense splits">
        <AnalyticsEmptyState 
          icon={PieChartIcon} 
          title="No Category Data" 
          message="Categorize your transactions to view the breakdown." 
        />
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
    if (!onSelectCategory) return;
    const catName = data?.name;
    if (drillDownCategory) return; // no dual layer clicks

    if (selectedCategory === catName) {
      onSelectCategory(null);
    } else {
      onSelectCategory(catName);
    }
  };

  const handleSliceDoubleClick = (data) => {
    if (!onSelectCategory) return;
    if (drillDownCategory) return;
    setDrillDownCategory(data?.name);
    onSelectCategory(data?.name);
  };

  const handleExitDrillDown = () => {
    if (onSelectCategory) {
      onSelectCategory(null);
    }
    setDrillDownCategory(null);
    setActiveIndex(-1);
    setHoveredData(null);
  };

  const currentTotalSum = drillDownCategory
    ? (drillDownData || []).reduce((sum, i) => sum + (i.total || 0), 0)
    : totalExpense;

  // Compute activeData with percentages built-in
  const activeData = useMemo(() => {
    const rawData = drillDownCategory ? drillDownData : categoryData;
    const sumTotal = currentTotalSum || 1;
    return (rawData || []).map(item => {
      const itemTotal = Number(item?.total ?? item?.value ?? 0);
      return {
        ...item,
        total: itemTotal,
        percentage: (itemTotal / sumTotal) * 100
      };
    });
  }, [drillDownCategory, drillDownData, categoryData, currentTotalSum]);

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

    const displayVal = Number(value ?? 0);
    const displayPct = Number(percent ?? 0) * 100;

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
          {String(payload?.name || '').substring(0, 16)}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 6} y={ey + 8} textAnchor={textAnchor} fill={fill} className="text-[10px] font-extrabold font-mono">
          {currencySymbol}{displayVal.toLocaleString('en-IN')} ({displayPct.toFixed(0)}%)
        </text>
      </g>
    );
  };

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
            className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-extrabold bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/20 transition-all cursor-pointer"
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
                  const isSelected = selectedCategory === entry?.name;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry?.color || '#3b82f6'}
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
                  {String(hoveredData?.name || '')}
                </span>
                <span className="text-sm font-black text-slate-100 font-mono">
                  {currencySymbol}{Math.round(Number(hoveredData?.total ?? 0)).toLocaleString()}
                </span>
                <span className="text-[9px] text-primary-400 font-bold">
                  {Number(hoveredData?.percentage ?? 0).toFixed(0)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                  {drillDownCategory ? 'Subtotal' : 'Total spent'}
                </span>
                <span className="text-base font-black text-slate-200 font-mono">
                  {currencySymbol}{Math.round(Number(currentTotalSum ?? 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Custom Legend details using ExpandableLegend */}
        <ExpandableLegend
          data={activeData}
          currencySymbol={currencySymbol}
          selectedItemName={selectedCategory}
          onItemClick={handleSliceClick}
          onItemDoubleClick={handleSliceDoubleClick}
        />

      </div>
    </div>
  );
}
