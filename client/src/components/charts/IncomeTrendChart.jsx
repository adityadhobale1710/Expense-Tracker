import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import ChartCard from './ChartCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function IncomeTrendChart({ monthlyData = [] }) {
  if (monthlyData.length === 0) {
    return (
      <ChartCard title="Monthly Income Trend" subtitle="Earnings over time">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          Not enough data to display income trend.
        </div>
      </ChartCard>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
        fill: true,
        label: 'Income',
        data: monthlyData.map(d => d.income),
        borderColor: '#10b981', // emerald-500
        backgroundColor: 'rgba(16, 185, 129, 0.1)', // emerald-500 with opacity
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#022c22', // emerald-950
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  return (
    <ChartCard
      title="Monthly Income Trend"
      subtitle="Your earning trajectory"
      infoText="Tracks your gross income over the selected months to help identify seasonal earnings or growth trends."
    >
      <div className="w-full h-full relative">
        <Line options={options} data={data} />
      </div>
    </ChartCard>
  );
}
