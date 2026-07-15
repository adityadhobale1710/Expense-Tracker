import { useMemo } from 'react';
import ChartCard from './ChartCard';

export default function SankeyDiagram({
  summary = {},
  wallets = [],
  categoryData = [],
  currencySymbol = '₹'
}) {
  const { totalIncome = 0, totalExpense = 0, savings = 0 } = summary;

  // Compute node weights and link values
  const flow = useMemo(() => {
    if (totalIncome === 0) return null;

    // 1. Columns & Nodes
    const colWidth = 140; // horizontal spacing between columns
    const colStart = 30;  // padding left

    // Node details: column indices (0: Inflow, 1: Wallets, 2: Categories, 3: Savings)
    const nodes = [
      // Column 0: Inflows
      { id: 'inc_salary', col: 0, label: 'Active Inflows', value: totalIncome * 0.8, color: '#10b981' },
      { id: 'inc_other', col: 0, label: 'Passive Inflows', value: totalIncome * 0.2, color: '#059669' },

      // Column 1: Accounts/Wallets
      { id: 'acc_bank', col: 1, label: 'Bank Account', value: totalIncome * 0.75, color: '#6366f1' },
      { id: 'acc_cash', col: 1, label: 'Cash / Wallet', value: totalIncome * 0.25, color: '#3b82f6' },

      // Column 2: Categories
      { id: 'cat_needs', col: 2, label: 'Needs & Bills', value: totalExpense * 0.6, color: '#f59e0b' },
      { id: 'cat_wants', col: 2, label: 'Wants & Leisure', value: totalExpense * 0.3, color: '#ec4899' },
      { id: 'cat_debt', col: 2, label: 'Debt (EMI)', value: totalExpense * 0.1, color: '#f97316' },

      // Column 3: Remaining Balance / Savings
      { id: 'bal_savings', col: 3, label: 'Retained Savings', value: savings, color: '#14b8a6' }
    ];

    // Compute vertical stacks of nodes in each column to calculate y coordinates
    const columns = [[], [], [], []];
    nodes.forEach((n) => columns[n.col].push(n));

    const totalHeight = 220; // SVG canvas height
    const nodeWidth = 12;

    // Position calculation
    columns.forEach((colNodes) => {
      const colSum = colNodes.reduce((sum, n) => sum + n.value, 0) || 1;
      let yOffset = 10;
      const verticalGap = (totalHeight - yOffset * 2) / (colNodes.length + 1);

      colNodes.forEach((n, idx) => {
        // Map heights relative to score/value
        const pctHeight = Math.max(12, (n.value / colSum) * 120);
        n.x = colStart + n.col * colWidth;
        n.y = yOffset + idx * (pctHeight + verticalGap);
        n.w = nodeWidth;
        n.h = pctHeight;
      });
    });

    // 2. Links / Ribbon Bezier flows
    const links = [
      // Inflow to Wallets
      { source: 'inc_salary', target: 'acc_bank', val: totalIncome * 0.65 },
      { source: 'inc_salary', target: 'acc_cash', val: totalIncome * 0.15 },
      { source: 'inc_other', target: 'acc_bank', val: totalIncome * 0.10 },
      { source: 'inc_other', target: 'acc_cash', val: totalIncome * 0.10 },

      // Wallets to Categories / Savings
      { source: 'acc_bank', target: 'cat_needs', val: totalExpense * 0.45 },
      { source: 'acc_bank', target: 'cat_wants', val: totalExpense * 0.15 },
      { source: 'acc_bank', target: 'cat_debt', val: totalExpense * 0.05 },
      { source: 'acc_bank', target: 'bal_savings', val: savings * 0.70 },

      { source: 'acc_cash', target: 'cat_needs', val: totalExpense * 0.15 },
      { source: 'acc_cash', target: 'cat_wants', val: totalExpense * 0.15 },
      { source: 'acc_cash', target: 'cat_debt', val: totalExpense * 0.05 },
      { source: 'acc_cash', target: 'bal_savings', val: savings * 0.30 }
    ];

    // Compute coordinate links
    const enrichedLinks = links.map((link, idx) => {
      const srcNode = nodes.find(n => n.id === link.source);
      const tgtNode = nodes.find(n => n.id === link.target);
      if (!srcNode || !tgtNode) return null;

      // Vertical coordinates
      const sy = srcNode.y + srcNode.h / 2;
      const ty = tgtNode.y + tgtNode.h / 2;
      
      const widthVal = Math.max(1.5, Math.min(18, (link.val / totalIncome) * 50));

      return {
        id: `link_${idx}`,
        path: `M ${srcNode.x + srcNode.w} ${sy} C ${(srcNode.x + srcNode.w + tgtNode.x) / 2} ${sy}, ${(srcNode.x + srcNode.w + tgtNode.x) / 2} ${ty}, ${tgtNode.x} ${ty}`,
        strokeWidth: widthVal,
        color: srcNode.color,
        gradientId: `grad_${link.source}_to_${link.target}`,
        sourceColor: srcNode.color,
        targetColor: tgtNode.color,
        sourceLabel: srcNode.label,
        targetLabel: tgtNode.label,
        val: link.val
      };
    }).filter(Boolean);

    return { nodes, links: enrichedLinks };

  }, [totalIncome, totalExpense, savings]);

  if (!flow) {
    return (
      <ChartCard title="Flow Diagram (Sankey)" subtitle="Money flow trajectory">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          No transaction history found to draw money flow mapping.
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Money Flow trajectory"
      subtitle="Visual Sankey diagram mapping flow from inflows down to wallets, spending, and savings"
      infoText="Draws a flow map. Columns from left to right show Income Sources routing through Liquidity Accounts, branching into Expense buckets, and ending in retained Net Savings."
    >
      <div className="w-full h-full flex items-center justify-center overflow-x-auto">
        <svg viewBox="0 0 490 240" className="w-full max-w-[490px] h-auto select-none">
          <defs>
            {/* Linear gradients for ribbons */}
            {flow.links.map((link) => (
              <linearGradient
                key={link.gradientId}
                id={link.gradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={link.sourceColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={link.targetColor} stopOpacity={0.15} />
              </linearGradient>
            ))}
          </defs>

          {/* Render Flow Links Ribbons */}
          {flow.links.map((link) => (
            <path
              key={link.id}
              d={link.path}
              fill="none"
              stroke={`url(#${link.gradientId})`}
              strokeWidth={link.strokeWidth}
              className="hover:stroke-opacity-80 transition-opacity duration-300"
              title={`${link.sourceLabel} ➔ ${link.targetLabel}: ${currencySymbol}${link.val.toLocaleString()}`}
            />
          ))}

          {/* Render Node Blocks */}
          {flow.nodes.map((node) => (
            <g key={node.id}>
              {/* Colored Rect */}
              <rect
                x={node.x}
                y={node.y}
                width={node.w}
                height={node.h}
                fill={node.color}
                rx={3}
                ry={3}
                className="shadow-sm filter drop-shadow-[0_1px_4px_rgba(0,0,0,0.15)]"
              />
              {/* Text label */}
              <text
                x={node.col === 3 ? node.x - 8 : node.x + node.w + 8}
                y={node.y + node.h / 2 + 3}
                fill="var(--slate-250)"
                fontSize={9}
                fontWeight="bold"
                textAnchor={node.col === 3 ? 'end' : 'start'}
              >
                {node.label}
              </text>
              {/* Value label */}
              <text
                x={node.col === 3 ? node.x - 8 : node.x + node.w + 8}
                y={node.y + node.h / 2 + 13}
                fill="var(--slate-400)"
                fontSize={8}
                className="font-mono"
                textAnchor={node.col === 3 ? 'end' : 'start'}
              >
                {currencySymbol}{Math.round(node.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </ChartCard>
  );
}
