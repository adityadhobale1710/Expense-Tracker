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
          backgroundColor: '#9B7BFF',
          borderRadius: 12,
          borderSkipped: false,
          barPercentage: 0.8,
          categoryPercentage: 0.55,
        },
        {
          label: 'Expenses',
          data: monthlyData.map(d => d.expense || 0),
          backgroundColor: '#FFD84D',
          borderRadius: 12,
          borderSkipped: false,
          barPercentage: 0.8,
          categoryPercentage: 0.55,
        }
      ]
    };
  }, [monthlyData]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 900,
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'var(--chart-text, #94a3b8)',
          font: {
            family: "'Inter', sans-serif",
            size: 11,
            weight: 'bold'
          },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: 'var(--chart-tooltip-bg, #1e293b)',
        titleColor: 'var(--chart-tooltip-text, #f8fafc)',
        bodyColor: 'var(--chart-tooltip-text, #f8fafc)',
        borderColor: 'var(--chart-tooltip-border, #334155)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 12,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11, weight: 'bold' },
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
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: 'var(--chart-text, #94a3b8)',
          font: {
            family: "'Inter', sans-serif",
            size: 10,
            weight: 'bold'
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(200, 200, 200, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: 'var(--chart-text, #94a3b8)',
          font: {
            family: "'Inter', sans-serif",
            size: 10,
            weight: 'bold'
          },
          callback: function (value) {
            return '₹' + value.toLocaleString('en-IN');
          }
        }
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
