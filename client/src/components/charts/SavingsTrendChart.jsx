import React from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  CategoryScale,
  BarElement,
  PointElement,
  LineElement,
  Legend,
  Tooltip,
  Title,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import ChartCard from './ChartCard';

ChartJS.register(
  LinearScale,
  CategoryScale,
  BarElement,
  PointElement,
  LineElement,
  Legend,
  Tooltip,
  Title
);

export default function SavingsTrendChart({ monthlyData = [] }) {
  if (monthlyData.length === 0) {
    return (
      <ChartCard title="Savings Trend" subtitle="Income vs Expense vs Savings">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          Not enough data to display savings trend.
        </div>
      </ChartCard>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#cbd5e1',
          usePointStyle: true,
          boxWidth: 8,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#cbd5e1',
        bodyColor: '#f8fafc',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed.y);
            }
            return label;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 10,
          },
        },
      },
      y: {
        grid: {
          color: '#1e293b',
          drawBorder: false,
          borderDash: [5, 5],
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 10,
          },
          callback: function(value) {
            return '₹' + (value >= 1000 ? (value / 1000) + 'k' : value);
          }
        },
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  const labels = monthlyData.map(d => d.name);
  const data = {
    labels,
    datasets: [
      {
        type: 'line',
        label: 'Net Savings',
        borderColor: '#3b82f6', // blue-500
        backgroundColor: '#3b82f6',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        data: monthlyData.map(d => d.savings),
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        type: 'bar',
        label: 'Income',
        backgroundColor: 'rgba(16, 185, 129, 0.8)', // emerald-500
        data: monthlyData.map(d => d.income),
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
      {
        type: 'bar',
        label: 'Expense',
        backgroundColor: 'rgba(244, 63, 94, 0.8)', // rose-500
        data: monthlyData.map(d => d.expense),
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    ],
  };

  return (
    <ChartCard
      title="Savings Progress"
      subtitle="Monthly cash flow comparison"
      infoText="Compares your earnings vs spending per month, showing your overall net savings trajectory over time."
    >
      <div className="w-full h-full relative">
        <Chart type="bar" options={options} data={data} />
      </div>
    </ChartCard>
  );
}
