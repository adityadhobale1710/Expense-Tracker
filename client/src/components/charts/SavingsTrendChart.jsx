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
  Filler
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import ChartCard from './ChartCard';
import { CHART_COLORS, premiumTooltipConfig, premiumLegendConfig, premiumGridConfig, premiumAnimation } from '../../utils/chartTheme';
import AnalyticsEmptyState from './AnalyticsEmptyState';
import { LineChart } from 'lucide-react';

ChartJS.register(
  LinearScale,
  CategoryScale,
  BarElement,
  PointElement,
  LineElement,
  Legend,
  Tooltip,
  Title,
  Filler
);

export default function SavingsTrendChart({ monthlyData = [] }) {
  if (monthlyData.length === 0) {
    return (
      <ChartCard title="Savings Trend" subtitle="Income vs Expense vs Savings">
        <AnalyticsEmptyState 
          icon={LineChart} 
          title="No Savings Trend" 
          message="Record income and expenses to visualize your savings trend." 
        />
      </ChartCard>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: premiumLegendConfig,
      tooltip: premiumTooltipConfig,
    },
    animation: premiumAnimation,
    scales: {
      x: premiumGridConfig.x,
      y: {
        ...premiumGridConfig.y,
        ticks: {
          ...premiumGridConfig.y.ticks,
          callback: function(value) {
            return '₹' + (value >= 1000 ? (value / 1000) + 'k' : value);
          }
        }
      }
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
        type: 'line',
        label: 'Net Savings',
        borderColor: CHART_COLORS.savings,
        backgroundColor: `${CHART_COLORS.savings}30`,
        borderWidth: 5,
        tension: 0.45,
        fill: true,
        data: monthlyData.map(d => d.savings),
        pointBackgroundColor: '#ffffff',
        pointBorderColor: CHART_COLORS.savings,
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 9,
        pointHoverBackgroundColor: CHART_COLORS.savings,
        pointHoverBorderColor: '#ffffff',
        order: 1
      },
      {
        type: 'bar',
        label: 'Income',
        backgroundColor: `${CHART_COLORS.income}E6`,
        hoverBackgroundColor: CHART_COLORS.income,
        data: monthlyData.map(d => d.income),
        borderRadius: 6,
        barPercentage: 0.85,
        categoryPercentage: 0.85,
        order: 2
      },
      {
        type: 'bar',
        label: 'Expense',
        backgroundColor: `${CHART_COLORS.expense}E6`,
        hoverBackgroundColor: CHART_COLORS.expense,
        data: monthlyData.map(d => d.expense),
        borderRadius: 6,
        barPercentage: 0.85,
        categoryPercentage: 0.85,
        order: 3
      },
    ],
  };

  return (
    <ChartCard
      title="Savings Progress"
      subtitle="Monthly cash flow comparison"
      infoText="Compares your earnings vs spending per month, showing your overall net savings trajectory over time."
      heightClass="h-48 sm:h-52"
    >
      <div className="w-full h-full relative mt-2">
        <Chart type="bar" options={options} data={data} />
      </div>
    </ChartCard>
  );
}
