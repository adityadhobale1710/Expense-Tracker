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
import { CHART_COLORS, premiumTooltipConfig } from '../../utils/chartTheme';

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
      tooltip: premiumTooltipConfig,
    },
    scales: {
      x: {
        grid: {
          color: CHART_COLORS.grid,
          drawBorder: false,
          borderDash: [5, 5],
        },
        ticks: {
          color: CHART_COLORS.neutral,
          font: {
            size: 11,
            family: 'Inter, system-ui, sans-serif'
          },
        },
      },
      y: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: CHART_COLORS.neutral,
          font: {
            size: 12,
            weight: 'bold',
            family: 'Inter, system-ui, sans-serif'
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
        backgroundColor: topSources.map(d => d.color || CHART_COLORS.income),
        borderRadius: 6,
        barThickness: 24,
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
