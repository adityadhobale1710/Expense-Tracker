import { useMemo } from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import ChartCard from './ChartCard';

export default function TreemapChart({ rawExpenses = [], currencySymbol = '₹' }) {
  
  // Build nested category -> merchant treemap data structure
  const treemapData = useMemo(() => {
    if (!rawExpenses || rawExpenses.length === 0) return [];

    const categoryGroups = {};

    rawExpenses.forEach((exp) => {
      let cat = 'Other';
      if (exp.category) {
        cat = (typeof exp.category === 'object' && exp.category !== null) ? (exp.category.name || 'Other') : (exp.category || 'Other');
      }

      const merchant = exp.title || 'Other Merchant';
      
      if (!categoryGroups[cat]) {
        categoryGroups[cat] = {};
      }
      
      categoryGroups[cat][merchant] = (categoryGroups[cat][merchant] || 0) + exp.amount;
    });

    const hues = [250, 280, 310, 340, 200, 170, 140, 40];
    
    return Object.entries(categoryGroups).map(([catName, merchantMap], idx) => {
      const children = Object.entries(merchantMap).map(([mName, amount]) => ({
        name: mName,
        size: amount
      })).sort((a, b) => b.size - a.size).slice(0, 5); // limit top 5 merchants per category

      const categorySizeSum = children.reduce((sum, item) => sum + item.size, 0);

      return {
        name: catName,
        size: categorySizeSum,
        color: `hsl(${hues[idx % hues.length]}, 65%, 45%)`,
        children
      };
    }).sort((a, b) => b.size - a.size).slice(0, 8); // top 8 categories

  }, [rawExpenses]);

  if (treemapData.length === 0) {
    return (
      <ChartCard title="Hierarchical Spending Treemap" subtitle="Nested category volumes">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          Record transaction details to compile the nested treemap.
        </div>
      </ChartCard>
    );
  }

  // Custom Treemap Content block for glass design
  const CustomContent = ({ root, depth, x, y, width, height, index, name, value, color }) => {
    if (depth !== 1 || width < 30 || height < 20) return null;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: color,
            fillOpacity: 0.18,
            stroke: 'var(--dark-900)',
            strokeWidth: 1.5,
            rx: 6,
            ry: 6
          }}
        />
        {/* Category Label */}
        <text
          x={x + 8}
          y={y + 18}
          fill="var(--slate-100)"
          fontSize={10}
          fontWeight="bold"
        >
          {name.substring(0, 16)}
        </text>
        {/* Value Label */}
        <text
          x={x + 8}
          y={y + 32}
          fill="var(--slate-400)"
          fontSize={9}
          fontWeight="medium"
          className="font-mono"
        >
          {currencySymbol}{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-dark-950 border border-slate-700/80 p-3 rounded-xl shadow-2xl text-[11px] font-bold text-slate-200">
          <p className="uppercase text-[9px] text-slate-400 mb-1">Hierarchy Node</p>
          <p className="font-semibold text-slate-100">{item.name}</p>
          <p className="font-mono text-xs text-primary-400 mt-1">
            Total spent: {currencySymbol}{item.value.toLocaleString('en-IN')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartCard
      title="Nested Allocation Treemap"
      subtitle="Nested tree sizing expenditures by category and merchant weights"
      infoText="A modular spending layout. Grid squares correspond in area size directly to transaction weights, categorizing sub-totals by merchants and categories."
    >
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treemapData}
          dataKey="size"
          stroke="#0a0f1d"
          content={<CustomContent />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </ChartCard>
  );
}
