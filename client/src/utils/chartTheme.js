export const CHART_COLORS = {
  income: '#10B981', // Emerald 500
  expense: '#F43F5E', // Rose 500
  savings: '#6366F1', // Indigo 500
  warning: '#F59E0B', // Amber 500
  health: '#06B6D4', // Cyan 500
  neutral: '#94A3B8', // Slate 400
  grid: '#1e293b', // Slate 800
  tooltipBg: '#0f172a', // Slate 900
  tooltipBorder: '#334155', // Slate 700
  tooltipText: '#f8fafc', // Slate 50
  tooltipTitle: '#cbd5e1', // Slate 300
};

// Reusable Chart.js Tooltip Configuration
export const premiumTooltipConfig = {
  backgroundColor: CHART_COLORS.tooltipBg,
  titleColor: CHART_COLORS.tooltipTitle,
  bodyColor: CHART_COLORS.tooltipText,
  borderColor: CHART_COLORS.tooltipBorder,
  borderWidth: 1,
  padding: 12,
  cornerRadius: 8,
  titleFont: {
    size: 13,
    weight: 'bold',
    family: 'Inter, system-ui, sans-serif',
  },
  bodyFont: {
    size: 12,
    weight: '500',
    family: 'Inter, system-ui, sans-serif',
  },
  bodySpacing: 6,
  boxPadding: 6,
  usePointStyle: true,
  boxWidth: 8,
  boxHeight: 8,
};

// Reusable Chart.js Legend Configuration
export const premiumLegendConfig = {
  position: 'top',
  labels: {
    color: CHART_COLORS.tooltipTitle,
    usePointStyle: true,
    boxWidth: 8,
    font: {
      size: 11,
      family: 'Inter, system-ui, sans-serif',
      weight: '600'
    },
    padding: 16,
  },
};

// Reusable Chart.js Grid and Axis Configuration
export const premiumGridConfig = {
  x: {
    grid: { display: false, drawBorder: false },
    ticks: {
      color: CHART_COLORS.neutral,
      font: { size: 10, family: 'Inter, system-ui, sans-serif', weight: '500' },
      maxRotation: 0,
      padding: 6
    },
    border: { display: false }
  },
  y: {
    grid: { color: `${CHART_COLORS.grid}50`, drawBorder: false, borderDash: [4, 4] },
    ticks: {
      color: CHART_COLORS.neutral,
      font: { size: 10, family: 'Inter, system-ui, sans-serif', weight: '500' },
      padding: 8,
      maxTicksLimit: 6
    },
    border: { display: false }
  }
};

// Reusable Animation Timing
export const premiumAnimation = {
  duration: 800,
  easing: 'easeOutQuart'
};

// Formatting helpers
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
};
