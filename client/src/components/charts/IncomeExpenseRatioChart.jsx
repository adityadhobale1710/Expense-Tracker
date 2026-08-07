import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import ChartCard from './ChartCard';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function IncomeExpenseRatioChart({ summary = {} }) {
  const totalIncome = summary.totalIncome || 0;
  const totalExpense = summary.totalExpense || 0;
  const total = totalIncome + totalExpense;

  if (total === 0) {
    return (
      <ChartCard title="Income vs Expense" subtitle="Overall financial ratio">
        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
          Not enough data to calculate ratio.
        </div>
      </ChartCard>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
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
          padding: 20,
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
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed);
            }
            return label;
          }
        }
      },
    },
  };

  const data = {
    labels: ['Total Income', 'Total Expense'],
    datasets: [
      {
        data: [totalIncome, totalExpense],
        backgroundColor: [
          'rgba(16, 185, 129, 0.9)', // emerald-500
          'rgba(244, 63, 94, 0.9)', // rose-500
        ],
        borderColor: [
          '#0f172a', // background color for gap
          '#0f172a',
        ],
        borderWidth: 4,
        hoverOffset: 4,
      },
    ],
  };

  const incomePercent = ((totalIncome / total) * 100).toFixed(1);
  const expensePercent = ((totalExpense / total) * 100).toFixed(1);

  return (
    <ChartCard
      title="Income vs Expense"
      subtitle="Overall cash flow ratio"
      infoText="A quick glance at how your total inflows compare to your total outflows."
    >
      <div className="w-full h-full relative flex items-center justify-center">
        <Doughnut options={options} data={data} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
          <span className="text-xl font-bold text-slate-200">
            {incomePercent}%
          </span>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Income Ratio
          </span>
        </div>
      </div>
    </ChartCard>
  );
}
