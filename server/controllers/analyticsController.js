import asyncHandler from 'express-async-handler';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import FinancialDataService from '../services/financial/FinancialDataService.js';
import {
  calculateMonthlyExpense,
  calculateMonthlyIncome,
  calculateSavings,
} from '../services/ai/ToolRegistry.js';

/**
 * Issue #5 fix: sanitize cell values to prevent CSV/Excel formula injection.
 * Prefixes dangerous-leading characters (=, +, -, @, TAB, CR) with a single quote.
 */
const sanitizeCell = (val) => {
  if (typeof val !== 'string') return val;
  return /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;
};

/**
 * Helper: Parses query parameters for start and end dates
 * Fallback is current month
 */
const getQueryDateRange = (req) => {
  const { startDate, endDate, start: qStart, end: qEnd } = req.query;
  const rawStart = startDate || qStart;
  const rawEnd = endDate || qEnd;
  let start = rawStart ? new Date(rawStart) : null;
  let end = rawEnd ? new Date(rawEnd) : null;

  const now = new Date();
  if (!start || isNaN(start.getTime())) {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    start.setHours(0, 0, 0, 0);
  }
  if (!end || isNaN(end.getTime())) {
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else {
    end.setHours(23, 59, 59, 999);
  }
  return { start, end };
};

/**
 * Helper: Calculate duration in days
 */
const getDaysDuration = (start, end) => {
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
};

/**
 * @desc  GET /analytics/summary
 * Returns income/expense summaries, savings, balance, transaction counts, daily averages, min/max days, and trends
 */
export const getAnalyticsSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { start, end } = getQueryDateRange(req);
  const duration = end - start;

  const prevStart = new Date(start.getTime() - duration - 1);
  const prevEnd = new Date(start.getTime() - 1);

  // Fetch from single source of truth
  const [currentSnapshot, prevSnapshot] = await Promise.all([
    FinancialDataService.getFinancialSnapshot(userId, { startDate: start, endDate: end }),
    FinancialDataService.getFinancialSnapshot(userId, { startDate: prevStart, endDate: prevEnd })
  ]);

  const { incomes: currentIncome, expenses: currentExpense } = currentSnapshot;
  const { incomes: prevIncome, expenses: prevExpense } = prevSnapshot;

  // M4: use ToolRegistry calculators (single source of truth for totals)
  const currentExpSummary = calculateMonthlyExpense(currentExpense);
  const currentIncSummary = calculateMonthlyIncome(currentIncome);
  const currentSavSummary = calculateSavings(currentIncSummary.total, currentExpSummary.total);

  const totalIncome = currentIncSummary.total;
  const totalExpense = currentExpSummary.total;
  const savings = Math.max(0, currentSavSummary.amount);
  const balance = currentSavSummary.amount;

  const prevExpSummary = calculateMonthlyExpense(prevExpense);
  const prevIncSummary = calculateMonthlyIncome(prevIncome);
  const prevSavSummary = calculateSavings(prevIncSummary.total, prevExpSummary.total);

  const prevTotalIncome = prevIncSummary.total;
  const prevTotalExpense = prevExpSummary.total;
  const prevSavings = Math.max(0, prevSavSummary.amount);
  const prevBalance = prevSavSummary.amount;

  // Percentage Trends
  const incomeTrend = prevTotalIncome > 0 ? ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100 : 0;
  const expenseTrend = prevTotalExpense > 0 ? ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100 : 0;
  const savingsTrend = prevSavings > 0 ? ((savings - prevSavings) / prevSavings) * 100 : 0;
  const balanceTrend = prevBalance !== 0 ? ((balance - prevBalance) / Math.abs(prevBalance)) * 100 : 0;

  // Averages & High/Low Days
  const daysInPeriod = getDaysDuration(start, end) + 1;
  const avgDailyExpense = totalExpense / daysInPeriod;

  const dailyExpenseMap = {};
  currentExpense.forEach(e => {
    const dStr = new Date(e.date).toISOString().split('T')[0];
    dailyExpenseMap[dStr] = (dailyExpenseMap[dStr] || 0) + e.amount;
  });

  const dailyKeys = Object.keys(dailyExpenseMap).sort((a, b) => dailyExpenseMap[b] - dailyExpenseMap[a]);
  const highestExpenseDay = dailyKeys.length > 0 ? { date: dailyKeys[0], amount: dailyExpenseMap[dailyKeys[0]] } : null;
  const lowestExpenseDay = dailyKeys.length > 0 ? { date: dailyKeys[dailyKeys.length - 1], amount: dailyExpenseMap[dailyKeys[dailyKeys.length - 1]] } : null;

  // Mini sparklines
  const sparklineSteps = 10;
  const stepMs = Math.max(1, duration / sparklineSteps);
  const sparklines = [];
  for (let i = 0; i <= sparklineSteps; i++) {
    const stepStart = new Date(start.getTime() + i * stepMs);
    const stepEnd = new Date(start.getTime() + (i + 1) * stepMs);
    sparklines.push({ index: i, start: stepStart, end: stepEnd, amount: 0 });
  }

  currentExpense.forEach((exp) => {
    const itemTime = new Date(exp.date).getTime();
    const bucket = sparklines.find((s) => itemTime >= s.start.getTime() && itemTime <= s.end.getTime());
    if (bucket) bucket.amount += exp.amount;
  });

  sendSuccess(res, 200, 'Analytics summary fetched successfully', {
    totalIncome,
    totalExpense,
    savings,
    balance,
    avgDailyExpense,
    highestExpenseDay,
    lowestExpenseDay,
    totalTransactions: currentIncome.length + currentExpense.length,
    trends: { incomeTrend, expenseTrend, savingsTrend, balanceTrend },
    sparkline: sparklines.map((s) => s.amount)
  });
});

/**
 * @desc  GET /analytics/monthly
 * Grouped Bar Chart comparison (last 12 months)
 */
export const getAnalyticsMonthly = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { startDate: twelveMonthsAgo });
  const { incomes, expenses } = snapshot;

  const monthsData = [];
  const currentDate = new Date(twelveMonthsAgo);
  const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 12; i++) {
    const yr = currentDate.getFullYear();
    const mo = currentDate.getMonth();

    const incTotal = incomes.filter(inc => new Date(inc.date).getFullYear() === yr && new Date(inc.date).getMonth() === mo).reduce((sum, inc) => sum + inc.amount, 0);
    const expTotal = expenses.filter(exp => new Date(exp.date).getFullYear() === yr && new Date(exp.date).getMonth() === mo).reduce((sum, exp) => sum + exp.amount, 0);
    const savings = Math.max(0, incTotal - expTotal);

    monthsData.push({
      name: `${monthsNames[mo]} ${yr}`,
      income: incTotal,
      expense: expTotal,
      savings
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  sendSuccess(res, 200, 'Monthly comparison data fetched', monthsData);
});

/**
 * @desc  GET /analytics/category
 * Category breakdown matching screenshot layout
 */
export const getAnalyticsCategory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { start, end } = getQueryDateRange(req);

  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { startDate: start, endDate: end });
  const { expenses } = snapshot;

  const breakdownMap = {};
  let totalExpense = 0;

  expenses.forEach(exp => {
    const catId = exp.category?._id?.toString() || 'uncategorized';
    if (!breakdownMap[catId]) {
      breakdownMap[catId] = {
        _id: catId === 'uncategorized' ? null : exp.category._id,
        name: exp.category?.name || 'Uncategorized',
        icon: exp.category?.icon || '📁',
        color: exp.category?.color || '#6b7280',
        total: 0,
        count: 0,
        lastTransactionDate: exp.date
      };
    }
    breakdownMap[catId].total += exp.amount;
    breakdownMap[catId].count += 1;
    if (new Date(exp.date) > new Date(breakdownMap[catId].lastTransactionDate)) {
      breakdownMap[catId].lastTransactionDate = exp.date;
    }
    totalExpense += exp.amount;
  });

  let breakdown = Object.values(breakdownMap).sort((a, b) => b.total - a.total);
  breakdown = breakdown.map((item) => ({
    ...item,
    percentage: totalExpense > 0 ? parseFloat(((item.total / totalExpense) * 100).toFixed(2)) : 0
  }));

  sendSuccess(res, 200, 'Category breakdown data fetched', {
    breakdown,
    totalExpense
  });
});

/**
 * @desc  GET /analytics/trend
 * Returns rolling 7-day average, 30-day average, and prediction forecasts
 */
export const getAnalyticsTrend = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { start, end } = getQueryDateRange(req);

  // We fetch up to 30 days prior to the start of range to accurately calculate trailing averages
  const extendedStart = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000);

  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { startDate: extendedStart, endDate: end });
  const expenses = snapshot.expenses.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Compute daily totals
  const dailyTotals = {};
  expenses.forEach((e) => {
    const dayKey = new Date(e.date).toISOString().split('T')[0];
    dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + e.amount;
  });

  const trends = [];
  const currentDate = new Date(start);
  const targetEnd = new Date(end);

  // Generate trend metrics daily
  while (currentDate <= targetEnd) {
    const dayStr = currentDate.toISOString().split('T')[0];
    const amount = dailyTotals[dayStr] || 0;

    // Rolling calculation helpers
    const getRollingAvg = (days) => {
      let sum = 0;
      for (let i = 0; i < days; i++) {
        const d = new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000);
        const k = d.toISOString().split('T')[0];
        sum += dailyTotals[k] || 0;
      }
      return sum / days;
    };

    trends.push({
      date: dayStr,
      amount,
      rolling7: parseFloat(getRollingAvg(7).toFixed(2)),
      rolling30: parseFloat(getRollingAvg(30).toFixed(2))
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Simple Linear Regression algorithm for forecasting
  // Fitting y = mx + c based on actual spending days
  const actualDaysKeys = Object.keys(dailyTotals).sort();
  const n = actualDaysKeys.length;

  if (n > 2) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    actualDaysKeys.forEach((key, index) => {
      sumX += index;
      sumY += dailyTotals[key];
      sumXY += index * dailyTotals[key];
      sumX2 += index * index;
    });

    const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const c = (sumY - m * sumX) / n;

    // Project forward for length of trends
    trends.forEach((t, i) => {
      const idx = n + i;
      t.prediction = Math.max(0, parseFloat((m * idx + c).toFixed(2)));
    });
  } else {
    // Fallback if not enough data
    trends.forEach((t) => {
      t.prediction = t.rolling7;
    });
  }

  sendSuccess(res, 200, 'Trend curve data generated successfully', trends);
});

/**
 * @desc  GET /analytics/cashflow
 * Returns historical cash flow: Income vs Expense vs Running Balance
 */
export const getAnalyticsCashflow = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { start, end } = getQueryDateRange(req);

  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { startDate: start, endDate: end });
  const incomes = snapshot.incomes.sort((a, b) => new Date(a.date) - new Date(b.date));
  const expenses = snapshot.expenses.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Combine and sort chronologically
  const timeline = {};
  incomes.forEach((i) => {
    const dStr = new Date(i.date).toISOString().split('T')[0];
    if (!timeline[dStr]) timeline[dStr] = { income: 0, expense: 0 };
    timeline[dStr].income += i.amount;
  });

  expenses.forEach((e) => {
    const dStr = new Date(e.date).toISOString().split('T')[0];
    if (!timeline[dStr]) timeline[dStr] = { income: 0, expense: 0 };
    timeline[dStr].expense += e.amount;
  });

  const sortedDates = Object.keys(timeline).sort();
  let runningBalance = 0;
  const cashflow = sortedDates.map((date) => {
    const { income, expense } = timeline[date];
    runningBalance += income - expense;
    return {
      date,
      income,
      expense,
      runningBalance
    };
  });

  sendSuccess(res, 200, 'Cash flow trajectory calculated', cashflow);
});

/**
 * @desc  GET /analytics/heatmap
 * Calendar heatmap grid (higher spending = darker)
 */
export const getAnalyticsHeatmap = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { start, end } = getQueryDateRange(req);

  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { startDate: start, endDate: end });
  
  const heatmapMap = {};
  snapshot.expenses.forEach(exp => {
    const dStr = new Date(exp.date).toISOString().split('T')[0];
    if (!heatmapMap[dStr]) {
      heatmapMap[dStr] = { _id: dStr, amount: 0, count: 0 };
    }
    heatmapMap[dStr].amount += exp.amount;
    heatmapMap[dStr].count += 1;
  });

  const dailyTotals = Object.values(heatmapMap).sort((a, b) => a._id.localeCompare(b._id));

  sendSuccess(res, 200, 'Calendar heatmap data aggregated', dailyTotals);
});

/**
 * @desc  GET /analytics/income
 * Analyzes Income sources
 */
export const getAnalyticsIncome = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { start, end } = getQueryDateRange(req);

  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { startDate: start, endDate: end });
  
  const sourcesMap = {};
  let totalIncome = 0;

  snapshot.incomes.forEach(inc => {
    const sourceName = inc.category || 'Uncategorized';
    if (!sourcesMap[sourceName]) {
      sourcesMap[sourceName] = { source: sourceName, amount: 0, count: 0 };
    }
    sourcesMap[sourceName].amount += inc.amount;
    sourcesMap[sourceName].count += 1;
    totalIncome += inc.amount;
  });

  let data = Object.values(sourcesMap).sort((a, b) => b.amount - a.amount);
  data = data.map((s) => ({
    ...s,
    percentage: totalIncome > 0 ? parseFloat(((s.amount / totalIncome) * 100).toFixed(2)) : 0
  }));

  sendSuccess(res, 200, 'Income source analytics compiled', { sources: data, totalIncome });
});

/**
 * @desc  GET /analytics/export/csv
 * Exports transactions as CSV
 */
export const exportCSV = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { start, end } = getQueryDateRange(req);

  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { startDate: start, endDate: end });
  const incomes = snapshot.incomes.sort((a, b) => new Date(b.date) - new Date(a.date));
  const expenses = snapshot.expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

  let csvContent = 'Date,Type,Category,Title,Amount,Payment Method,Description\n';

  incomes.forEach((inc) => {
    const dateStr = new Date(inc.date).toISOString().split('T')[0];
    csvContent += `"${dateStr}","Income","${inc.category || 'Other'}","${inc.title.replace(/"/g, '""')}",${inc.amount},"bank","${inc.description ? inc.description.replace(/"/g, '""') : ''}"\n`;
  });

  expenses.forEach((exp) => {
    const dateStr = new Date(exp.date).toISOString().split('T')[0];
    csvContent += `"${dateStr}","Expense","${exp.category?.name || 'Uncategorized'}","${exp.title.replace(/"/g, '""')}",${exp.amount},"${exp.paymentMethod}","${exp.description ? exp.description.replace(/"/g, '""') : ''}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=financial_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.csv`);
  res.status(200).send(csvContent);
});

/**
 * @desc  GET /analytics/export/excel
 * Exports transactions as formatted Excel
 */
export const exportExcel = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { start, end } = getQueryDateRange(req);

  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { startDate: start, endDate: end });
  const incomes = snapshot.incomes.sort((a, b) => new Date(b.date) - new Date(a.date));
  const expenses = snapshot.expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

  const workbook = new ExcelJS.Workbook();
  const wsExpenses = workbook.addWorksheet('Expenses');
  const wsIncome = workbook.addWorksheet('Income');

  const expenseRows = expenses.map((exp) => ({
    Date: new Date(exp.date).toISOString().split('T')[0],
    Category: sanitizeCell(exp.category?.name || 'Uncategorized'),
    Title: sanitizeCell(exp.title),
    Amount: exp.amount,
    'Payment Method': sanitizeCell(exp.paymentMethod),
    Description: sanitizeCell(exp.description || '')
  }));

  const incomeRows = incomes.map((inc) => ({
    Date: new Date(inc.date).toISOString().split('T')[0],
    Source: sanitizeCell(inc.category || 'Other'),
    Title: sanitizeCell(inc.title),
    Amount: inc.amount,
    Description: sanitizeCell(inc.description || '')
  }));

  wsExpenses.columns = [
    { header: 'Date', key: 'Date', width: 15 },
    { header: 'Category', key: 'Category', width: 20 },
    { header: 'Title', key: 'Title', width: 25 },
    { header: 'Amount', key: 'Amount', width: 15 },
    { header: 'Payment Method', key: 'Payment Method', width: 18 },
    { header: 'Description', key: 'Description', width: 30 }
  ];
  expenseRows.forEach(row => wsExpenses.addRow(row));

  wsIncome.columns = [
    { header: 'Date', key: 'Date', width: 15 },
    { header: 'Source', key: 'Source', width: 20 },
    { header: 'Title', key: 'Title', width: 25 },
    { header: 'Amount', key: 'Amount', width: 15 },
    { header: 'Description', key: 'Description', width: 30 }
  ];
  incomeRows.forEach(row => wsIncome.addRow(row));

  const buf = await workbook.xlsx.writeBuffer();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=financial_report_${start.toISOString().split('T')[0]}.xlsx`);
  res.status(200).send(buf);
});


/**
 * @desc  GET /analytics/export/pdf
 * Generates an executive financial PDF report complete with vector summaries
 */
export const exportPDF = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { start, end } = getQueryDateRange(req);

  const snapshot = await FinancialDataService.getFinancialSnapshot(userId, { startDate: start, endDate: end });
  const { incomes, expenses } = snapshot;

  // M4: use ToolRegistry calculators for totals
  const incSummary = calculateMonthlyIncome(incomes);
  const expSummary = calculateMonthlyExpense(expenses);
  const totalInc = incSummary.total;
  const totalExp = expSummary.total;
  const balance = totalInc - totalExp;
  const savingsPDF = Math.max(0, balance);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Executive_Statement_${start.toISOString().split('T')[0]}.pdf`);
  doc.pipe(res);

  // Layout Design: Header
  doc.fillColor('#1e293b').rect(0, 0, 595, 120).fill();
  doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('EXECUTIVE FINANCIAL STATEMENT', 50, 40);
  doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()} | Reporting Window: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`, 50, 75);

  // Column Metrics Box
  doc.fillColor('#f8fafc').rect(50, 140, 495, 80).fill();
  doc.rect(50, 140, 495, 80).strokeColor('#cbd5e1').lineWidth(1).stroke();

  doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('Total Inflow', 70, 155);
  doc.fillColor('#10b981').fontSize(16).text(`₹${totalInc.toLocaleString('en-IN')}`, 70, 175);

  doc.fillColor('#0f172a').fontSize(11).text('Total Outflow', 200, 155);
  doc.fillColor('#ef4444').fontSize(16).text(`₹${totalExp.toLocaleString('en-IN')}`, 200, 175);

  doc.fillColor('#0f172a').fontSize(11).text('Net Savings', 330, 155);
  doc.fillColor('#3b82f6').fontSize(16).text(`₹${savingsPDF.toLocaleString('en-IN')}`, 330, 175);

  doc.fillColor('#0f172a').fontSize(11).text('Balance', 450, 155);
  doc.fillColor(balance >= 0 ? '#10b981' : '#ef4444').fontSize(16).text(`₹${balance.toLocaleString('en-IN')}`, 450, 175);

  // Category summary table & mini bar chart
  doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text('Category Allocation Summary', 50, 250);

  // Draw vector Category Breakdown Bar Chart directly in PDF!
  let barY = 280;
  const categoriesBreakdown = {};
  expenses.forEach((e) => {
    const cName = e.category?.name || 'Uncategorized';
    categoriesBreakdown[cName] = (categoriesBreakdown[cName] || 0) + e.amount;
  });

  const sortedCats = Object.entries(categoriesBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);

  sortedCats.forEach(([catName, amount]) => {
    const pct = totalExp > 0 ? amount / totalExp : 0;
    const barWidth = 200 * pct;

    // Draw text label
    doc.fillColor('#334155').fontSize(10).font('Helvetica-Bold').text(catName, 50, barY + 4);
    
    // Draw background progress bar
    doc.fillColor('#f1f5f9').rect(180, barY, 200, 18).fill();
    // Fill active progress bar
    doc.fillColor('#6366f1').rect(180, barY, barWidth, 18).fill();

    // Show percentage text
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica').text(`₹${amount.toLocaleString('en-IN')} (${(pct * 100).toFixed(0)}%)`, 395, barY + 4);

    barY += 28;
  });

  // Recent Transactions Table list
  doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text('Recent Ledgers', 50, 440);
  
  // Table headers
  doc.fillColor('#f8fafc').rect(50, 465, 495, 20).fill();
  doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold')
    .text('Date', 60, 471)
    .text('Type', 130, 471)
    .text('Category', 190, 471)
    .text('Title / Description', 280, 471)
    .text('Amount', 480, 471);

  let rowY = 495;
  const sortedTxns = [
    ...expenses.map((e) => ({ date: new Date(e.date), type: 'Expense', cat: e.category?.name || 'Other', title: e.title, amount: e.amount, isExp: true })),
    ...incomes.map((i) => ({ date: new Date(i.date), type: 'Income', cat: i.category || 'Other', title: i.title, amount: i.amount, isExp: false }))
  ].sort((a, b) => b.date - a.date).slice(0, 8);

  sortedTxns.forEach((txn) => {
    const dStr = txn.date.toISOString().split('T')[0];
    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(dStr, 60, rowY);
    doc.fillColor(txn.isExp ? '#ef4444' : '#10b981').text(txn.type, 130, rowY);
    doc.fillColor('#334155').text(txn.cat, 190, rowY);
    doc.text(txn.title.substring(0, 32), 280, rowY);
    doc.font('Helvetica-Bold').fillColor(txn.isExp ? '#ef4444' : '#10b981').text(`₹${txn.amount.toLocaleString('en-IN')}`, 480, rowY);
    
    // separator border line
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, rowY + 14).lineTo(545, rowY + 14).stroke();
    rowY += 20;
  });

  // Footer note
  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text('Thank you for choosing MERN Expense Tracker. Keep budget boundaries tight!', 50, 750, { align: 'center' });

  doc.end();
});
