import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Download, Eye, FileSpreadsheet, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TransactionTable({ incomes, expenses, categories, startDate, endDate, selectedCategory, onSelectCategory }) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterAmount, setFilterAmount] = useState('all');
  
  // Sorting states
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Sync donut chart category clicks
  useEffect(() => {
    if (selectedCategory) {
      setFilterCategory(selectedCategory);
    } else {
      setFilterCategory('all');
    }
  }, [selectedCategory]);

  // Combine and format transactions
  const combinedTransactions = useMemo(() => {
    const list = [];
    
    // Process Incomes
    incomes.forEach((inc) => {
      list.push({
        id: inc._id,
        date: new Date(inc.date),
        type: 'income',
        category: inc.category || 'Other',
        title: inc.title,
        amount: inc.amount,
        paymentMethod: 'bank', // Incomes go to bank by default
        description: inc.description || '',
        tags: []
      });
    });

    // Process Expenses
    expenses.forEach((exp) => {
      let catName = 'Other';
      if (exp.category) {
        catName = typeof exp.category === 'object' ? exp.category.name : exp.category;
      }
      list.push({
        id: exp._id,
        date: new Date(exp.date),
        type: 'expense',
        category: catName,
        title: exp.title,
        amount: exp.amount,
        paymentMethod: exp.paymentMethod || 'other',
        description: exp.description || '',
        tags: exp.tags || []
      });
    });

    return list;
  }, [incomes, expenses]);

  // Handle Filtering
  const filteredTransactions = useMemo(() => {
    return combinedTransactions.filter((txn) => {
      // Date filter
      if (startDate && txn.date < startDate) return false;
      if (endDate && txn.date > endDate) return false;

      // Search filter (Debounced/Text matching)
      const query = search.toLowerCase();
      if (query && !txn.title.toLowerCase().includes(query) && !txn.description.toLowerCase().includes(query)) {
        return false;
      }

      // Category filter
      if (filterCategory !== 'all' && txn.category.toLowerCase() !== filterCategory.toLowerCase()) {
        return false;
      }

      // Payment method filter
      if (filterPayment !== 'all' && txn.paymentMethod !== filterPayment) {
        return false;
      }

      // Amount filter ranges
      if (filterAmount === 'under1000' && txn.amount >= 1000) return false;
      if (filterAmount === '1000to5000' && (txn.amount < 1000 || txn.amount > 5000)) return false;
      if (filterAmount === 'over5000' && txn.amount <= 5000) return false;

      return true;
    });
  }, [combinedTransactions, search, filterCategory, filterPayment, filterAmount, startDate, endDate]);

  // Handle Sorting
  const sortedTransactions = useMemo(() => {
    const list = [...filteredTransactions];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle category/date objects comparison
      if (sortField === 'date') {
        aVal = a.date.getTime();
        bVal = b.date.getTime();
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === 'asc'
          ? aVal - bVal
          : bVal - aVal;
      }
    });
    return list;
  }, [filteredTransactions, sortField, sortDirection]);

  // Handle Pagination
  const paginatedTransactions = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedTransactions, currentPage]);

  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage) || 1;

  // Handle sort trigger clicks
  const requestSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const handleExport = (format) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const sStr = startDate ? startDate.toISOString() : '';
    const eStr = endDate ? endDate.toISOString() : '';
    const token = localStorage.getItem('accessToken');
    const url = `${baseUrl}/analytics/export/${format}?startDate=${sStr}&endDate=${eStr}&token=${token}`;
    
    // To download authenticated files seamlessly, we can open in a new window or trigger fetch.
    // Opening window with token query parameter, or standard fetch anchor:
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.click();
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={12} className="inline ml-1" /> : <ChevronDown size={12} className="inline ml-1" />;
  };

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-6">
      
      {/* Controls & Export buttons row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Detailed Transactions Ledger</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Filter, sort, or export financial statements</p>
        </div>

        {/* Exporters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-dark-900 border border-slate-800 text-rose-400 hover:bg-slate-800 rounded-xl cursor-pointer transition-all"
          >
            <FileText size={14} />
            <span>PDF Statement</span>
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-dark-900 border border-slate-800 text-emerald-400 hover:bg-slate-800 rounded-xl cursor-pointer transition-all"
          >
            <FileSpreadsheet size={14} />
            <span>Excel Spread</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-dark-900 border border-slate-800 text-sky-400 hover:bg-slate-800 rounded-xl cursor-pointer transition-all"
          >
            <Download size={14} />
            <span>CSV Sheet</span>
          </button>
        </div>
      </div>

      {/* Filter inputs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search ledgers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-dark-900 border border-slate-800/80 rounded-xl text-slate-200 focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* Category Filters */}
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            onSelectCategory(e.target.value === 'all' ? null : e.target.value);
            setCurrentPage(1);
          }}
          className="px-3.5 py-2.5 text-xs bg-dark-900 border border-slate-800/80 rounded-xl text-slate-350 focus:outline-none focus:border-primary-500 cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat._id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Payment Methods */}
        <select
          value={filterPayment}
          onChange={(e) => { setFilterPayment(e.target.value); setCurrentPage(1); }}
          className="px-3.5 py-2.5 text-xs bg-dark-900 border border-slate-800/80 rounded-xl text-slate-350 focus:outline-none focus:border-primary-500 cursor-pointer"
        >
          <option value="all">All Payment Methods</option>
          <option value="cash">💵 Cash</option>
          <option value="card">💳 Card</option>
          <option value="upi">📱 UPI</option>
          <option value="bank">🏦 Bank</option>
          <option value="other">📁 Other</option>
        </select>

        {/* Amount range filters */}
        <select
          value={filterAmount}
          onChange={(e) => { setFilterAmount(e.target.value); setCurrentPage(1); }}
          className="px-3.5 py-2.5 text-xs bg-dark-900 border border-slate-800/80 rounded-xl text-slate-350 focus:outline-none focus:border-primary-500 cursor-pointer"
        >
          <option value="all">All Amounts</option>
          <option value="under1000">Under ₹1,000</option>
          <option value="1000to5000">₹1,000 - ₹5,000</option>
          <option value="over5000">Over ₹5,000</option>
        </select>
      </div>

      {/* HTML Table rendering */}
      <div className="overflow-x-auto border border-slate-850 rounded-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-dark-900/60 border-b border-slate-800 text-[10px] font-bold text-slate-450 uppercase tracking-wider select-none">
              <th onClick={() => requestSort('date')} className="px-5 py-4 cursor-pointer hover:text-white">
                Date {renderSortIndicator('date')}
              </th>
              <th onClick={() => requestSort('type')} className="px-5 py-4 cursor-pointer hover:text-white">
                Type {renderSortIndicator('type')}
              </th>
              <th onClick={() => requestSort('category')} className="px-5 py-4 cursor-pointer hover:text-white">
                Category {renderSortIndicator('category')}
              </th>
              <th onClick={() => requestSort('title')} className="px-5 py-4 cursor-pointer hover:text-white">
                Title {renderSortIndicator('title')}
              </th>
              <th onClick={() => requestSort('paymentMethod')} className="px-5 py-4 cursor-pointer hover:text-white">
                Method {renderSortIndicator('paymentMethod')}
              </th>
              <th onClick={() => requestSort('amount')} className="px-5 py-4 cursor-pointer hover:text-white text-right">
                Amount {renderSortIndicator('amount')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-xs font-semibold text-slate-200">
            {paginatedTransactions.map((txn) => (
              <tr key={txn.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-5 py-3.5 font-mono text-[11px] text-slate-450">
                  {txn.date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase border ${
                    txn.type === 'income'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-450'
                  }`}>
                    {txn.type}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="bg-slate-800/80 border border-slate-750 px-2.5 py-1 rounded-lg text-slate-300">
                    {txn.category}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-100">{txn.title}</span>
                    {txn.description && <span className="text-[10px] text-slate-500 mt-0.5">{txn.description}</span>}
                  </div>
                </td>
                <td className="px-5 py-3.5 capitalize font-mono text-slate-450 text-[11px]">
                  {txn.paymentMethod}
                </td>
                <td className={`px-5 py-3.5 text-right font-black font-mono text-[13px] ${
                  txn.type === 'income' ? 'text-emerald-400' : 'text-rose-450'
                }`}>
                  {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                </td>
              </tr>
            ))}

            {paginatedTransactions.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500 text-xs">
                  No records match active query settings
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination indicators footer */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center border-t border-slate-800/60 pt-4">
          <span className="text-[10px] font-bold text-slate-500">
            Page {currentPage} of {totalPages} ({sortedTransactions.length} records)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-800 bg-dark-900 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-800 bg-dark-900 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
