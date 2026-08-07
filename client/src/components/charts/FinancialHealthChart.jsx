import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import ChartCard from './ChartCard';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function FinancialHealthChart({ data = [] }) {
  if (data.length === 0) {
    return (
      <ChartCard title="Financial Health" subtitle="Budget Rule Analysis">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          Not enough data to calculate financial health.
        </div>
      </ChartCard>
    );
  }

  // data = [ {name: 'Needs & Bills', value: X}, {name: 'Wants & Leisure', value: Y}, {name: 'Savings & Investments', value: Z} ]
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const actualPercents = data.map(item => {
    return total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
  });

  const benchmarkPercents = [50, 30, 20]; // 50/30/20 Rule

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
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
            if (context.parsed !== null) {
              label += context.parsed.r + '%';
            }
            return label;
          }
        }
      },
    },
    scales: {
      r: {
        angleLines: {
          color: '#1e293b',
        },
        grid: {
          color: '#1e293b',
          circular: true,
        },
        pointLabels: {
          color: '#94a3b8',
          font: {
            size: 11,
            weight: 'bold',
          },
        },
        ticks: {
          display: false,
          max: 100,
          min: 0,
          stepSize: 20,
        },
      },
    },
  };

  const chartData = {
    labels: data.map(d => d.name),
    datasets: [
      {
        label: 'Your Allocation',
        data: actualPercents,
        backgroundColor: 'rgba(56, 189, 248, 0.4)', // sky-400
        borderColor: '#38bdf8',
        pointBackgroundColor: '#38bdf8',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#38bdf8',
        borderWidth: 2,
      },
      {
        label: '50/30/20 Rule Benchmark',
        data: benchmarkPercents,
        backgroundColor: 'rgba(148, 163, 184, 0.1)', // slate-400
        borderColor: '#64748b',
        pointBackgroundColor: '#64748b',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#64748b',
        borderWidth: 1.5,
        borderDash: [5, 5],
      },
    ],
  };

  return (
    <ChartCard
      title="Financial Health"
      subtitle="Needs vs Wants vs Savings"
      infoText="Compares your actual spending allocation against the standard 50/30/20 financial rule."
    >
      <div className="w-full h-full relative">
        <Radar options={options} data={chartData} />
      </div>
    </ChartCard>
  );
}
