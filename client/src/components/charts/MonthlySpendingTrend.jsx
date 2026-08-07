import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartCard from './ChartCard';
import { CHART_COLORS, premiumTooltipConfig, premiumLegendConfig, premiumGridConfig, premiumAnimation } from '../../utils/chartTheme';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

export default function MonthlySpendingTrend({ monthlyData = [] }) {
  const [timeSelector, setTimeSelector] = useState('Month');

  const chartData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return null;

    return {
      labels: monthlyData.map(d => d.name),
      datasets: [
        {
          label: 'Income',
          data: monthlyData.map(d => d.income || 0),
          backgroundColor: CHART_COLORS.income,
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.85,
          categoryPercentage: 0.85,
        },
        {
          label: 'Expenses',
          data: monthlyData.map(d => d.expense || 0),
          backgroundColor: CHART_COLORS.expense,
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.85,
          categoryPercentage: 0.85,
        }
      ]
    };
  }, [monthlyData]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: premiumAnimation,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: premiumLegendConfig,
      tooltip: {
        ...premiumTooltipConfig,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += '₹' + context.parsed.y.toLocaleString('en-IN');
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: premiumGridConfig.x,
      y: {
        ...premiumGridConfig.y,
        ticks: {
          ...premiumGridConfig.y.ticks,
          callback: function (value) {
            if (value === 0) return '0';
            if (value >= 1000) return '₹' + value / 1000 + 'k';
            return '₹' + value;
          }
        }
      }
    },
    layout: {
      padding: {
        top: 5,
        bottom: 0,
      }
    }
  };

  const headerActions = (
    <div className="flex bg-slate-800/50 rounded-lg p-1">
      {['Month', 'Quarter', 'Year'].map((period) => (
        <button
          key={period}
          onClick={() => setTimeSelector(period)}
          className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
            timeSelector === period
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {period}
        </button>
      ))}
    </div>
  );

  if (!chartData) {
    return (
      <ChartCard title="Money Flow Trajectory" subtitle="Income vs Expenses">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          No historical monthly data available to display trajectory.
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Money Flow Trajectory"
      subtitle="Income vs Expenses across periods"
      headerActions={headerActions}
    >
      <div className="w-full h-full relative">
        <Bar data={chartData} options={options} />
      </div>
    </ChartCard>
  );
}
