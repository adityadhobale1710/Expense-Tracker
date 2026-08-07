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
import { CHART_COLORS, premiumTooltipConfig, premiumGridConfig, premiumAnimation } from '../../utils/chartTheme';
import AnalyticsEmptyState from './AnalyticsEmptyState';
import { TrendingUp } from 'lucide-react';

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
        <AnalyticsEmptyState 
          icon={TrendingUp} 
          title="No Income Trend" 
          message="Record income to visualize your earnings trend." 
        />
      </ChartCard>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: premiumAnimation,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: premiumTooltipConfig,
    },
    scales: {
      x: premiumGridConfig.x,
      y: {
        ...premiumGridConfig.y,
        ticks: {
          ...premiumGridConfig.y.ticks,
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
    layout: {
      padding: {
        top: 5,
        bottom: 0,
      }
    }
  };

  const labels = monthlyData.map(d => d.name);
  const data = {
    labels,
    datasets: [
      {
        fill: true,
        label: 'Income',
        data: monthlyData.map(d => d.income),
        borderColor: CHART_COLORS.income,
        backgroundColor: `${CHART_COLORS.income}1A`, // 10% opacity
        tension: 0.4,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: CHART_COLORS.income,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: CHART_COLORS.income,
        pointHoverBorderColor: '#ffffff',
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
