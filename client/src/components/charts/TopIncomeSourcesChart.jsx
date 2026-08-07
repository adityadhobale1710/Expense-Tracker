import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartCard from './ChartCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function TopIncomeSourcesChart({ categoryData = [] }) {
  if (!categoryData || categoryData.length === 0) {
    return (
      <ChartCard title="Top Income Sources" subtitle="Where your money comes from">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          No income data available.
        </div>
      </ChartCard>
    );
  }

  // Sort and take top 5 sources
  const topSources = [...categoryData].sort((a, b) => b.total - a.total).slice(0, 5);

  const options = {
    indexAxis: 'y',
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
            return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed.x);
          }
        }
      },
    },
    scales: {
      x: {
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
      y: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11,
            weight: 'bold',
          },
        },
      },
    },
  };

  const data = {
    labels: topSources.map(d => d.name),
    datasets: [
      {
        label: 'Income',
        data: topSources.map(d => d.total),
        backgroundColor: topSources.map(d => d.color || '#3b82f6'),
        borderRadius: 4,
        barThickness: 20,
      },
    ],
  };

  return (
    <ChartCard
      title="Top Income Sources"
      subtitle="Highest revenue generators"
      infoText="A breakdown of your top 5 income sources, ordered by total amount."
    >
      <div className="w-full h-full relative">
        <Bar options={options} data={data} />
      </div>
    </ChartCard>
  );
}
