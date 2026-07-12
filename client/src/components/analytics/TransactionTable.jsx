import { useState, useEffect, useMemo } from 'react';
import { 
  Search, ChevronDown, ChevronUp, Download, Eye, FileSpreadsheet, FileText, 
  ChevronLeft, ChevronRight, Settings2, Trash2, CheckSquare, Square, Columns, 
  Layers, Sliders, ChevronDownSquare, Calendar, Tag, CreditCard, ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function TransactionTable({ 
  incomes = [], 
  expenses = [], 
  categories = [], 
  startDate, 
  endDate, 
  selectedCategory, 
  onSelectCategory,
  refetchExpenses,
  refetchIncomes,
  currencySymbol = '₹'
}) {
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

  // Table options
  const [density, setDensity] = useState('cozy'); // 'standard' | 'cozy' | 'compact'
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    type: true,
    category: true,
    title: true,
    paymentMethod: true,
    amount: true
  });

  // Expandable row state
  const [expandedRow, setExpandedRow] = useState(null);

  // Bulk actions selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Sync category click filter from Donut Chart
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
        paymentMethod: 'bank',
        description: inc.description || '',
        tags: []
      });
    });

    // Process Expenses
    expenses.forEach((exp) => {
      let catName = 'Other';
      if (exp.category) {
        catName = (typeof exp.category === 'object' && exp.category !== null) ? (exp.category.name || 'Other') : (exp.category || 'Other');
      }
      list.push({
        id: exp._id,
        date: new Date(exp.date),
        type: 'expense',
        category: String(catName || 'Other'),
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
      // Date range filter
      if (startDate && txn.date < startDate) return false;
      if (endDate && txn.date > endDate) return false;

      // Global Search matching
      const query = search.toLowerCase();
      if (query && !txn.title.toLowerCase().includes(query) && !txn.description.toLowerCase().includes(query) && !txn.category.toLowerCase().includes(query)) {
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
    
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.click();
  };

  // Bulk Actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedTransactions.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} transactions? This action is irreversible.`)) {
      return;
    }

    setBulkDeleting(true);
    const deletePromises = selectedIds.map(async (id) => {
      // Find transaction item to resolve correct REST endpoint (incomes vs expenses)
      const txn = combinedTransactions.find(t => t.id === id);
      if (!txn) return;
      const endpoint = txn.type === 'income' ? `/income/${id}` : `/expenses/${id}`;
      return api.delete(endpoint);
    });

    toast.promise(
      Promise.all(deletePromises),
      {
        loading: 'Deleting transactions from ledger...',
        success: () => {
          setSelectedIds([]);
          setBulkDeleting(false);
          if (refetchExpenses) refetchExpenses();
          if (refetchIncomes) refetchIncomes();
          return 'Selected ledgers deleted successfully!';
        },
        error: () => {
          setBulkDeleting(false);
          return 'Failed to execute bulk deletion.';
        }
      }
    );
  };

  // Spacing densities
  const getPaddingClass = () => {
    if (density === 'compact') return 'py-2 px-4';
    if (density === 'compact') return 'py-1.5 px-3';
    if (density === 'standard') return 'py-4.5 px-6';
    return 'py-3 px-5'; // cozy default
  };

  return (
    <div className="flex flex-col p-6 bg-dark-800/80 border border-slate-700/60 rounded-3xl shadow-xl space-y-5">
      
      {/* Controls & Export Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-700/40 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Detailed Transactions Ledger</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Filter, sort, bulk delete, or export financial statements</p>
        </div>

        {/* Action triggers */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-dark-900 border border-slate-850 text-rose-400 hover:bg-slate-800 rounded-xl cursor-pointer transition-all shadow-sm"
          >
            <FileText size={14} />
            <span className="hidden sm:inline">PDF Statement</span>
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-dark-900 border border-slate-850 text-emerald-400 hover:bg-slate-800 rounded-xl cursor-pointer transition-all shadow-sm"
          >
            <FileSpreadsheet size={14} />
            <span className="hidden sm:inline">Excel Spread</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-dark-900 border border-slate-850 text-sky-400 hover:bg-slate-800 rounded-xl cursor-pointer transition-all shadow-sm"
          >
            <Download size={14} />
            <span className="hidden sm:inline">CSV Sheet</span>
          </button>
        </div>
      </div>

      {/* Spacing & Visibility filters toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-dark-800/40 border border-slate-750/30 p-2.5 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Density Picker */}
          <div className="flex items-center gap-1 bg-dark-900 border border-slate-850 p-1 rounded-xl">
            <button
              onClick={() => setDensity('compact')}
              className={`px-2 py-1 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${
                density === 'compact' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Compact
            </button>
            <button
              onClick={() => setDensity('cozy')}
              className={`px-2 py-1 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${
                density === 'cozy' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cozy
            </button>
            <button
              onClick={() => setDensity('standard')}
              className={`px-2 py-1 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${
                density === 'standard' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Standard
            </button>
          </div>

          {/* Column Chooser Selector */}
          <div className="relative">
            <button
              onClick={() => setShowColumnsMenu(!showColumnsMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-900 border border-slate-850 hover:border-slate-750 text-slate-350 hover:text-white text-[10px] font-bold rounded-xl cursor-pointer transition-all"
            >
              <Columns size={12} />
              <span>Columns</span>
            </button>
            <AnimatePresence>
              {showColumnsMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowColumnsMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute left-0 mt-2 w-44 bg-dark-800 border border-slate-700/80 rounded-2xl shadow-xl z-50 p-3 space-y-2 backdrop-blur-md"
                  >
                    <h4 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-700/40 pb-1.5">Show Columns</h4>
                    {Object.keys(visibleColumns).map((col) => (
                      <label key={col} className="flex items-center gap-2 text-[10px] font-bold text-slate-300 capitalize cursor-pointer hover:text-white select-none">
                        <input
                          type="checkbox"
                          checked={visibleColumns[col]}
                          onChange={(e) => setVisibleColumns({ ...visibleColumns, [col]: e.target.checked })}
                          className="rounded border-slate-700 bg-dark-900 text-primary-500 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                        />
                        <span>{col.replace(/Method/g, ' Method')}</span>
                      </label>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bulk Action Buttons */}
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3.5 py-1.5 rounded-2xl"
          >
            <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider">{selectedIds.length} Selected</span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="p-1.5 bg-rose-600 hover:bg-rose-550 disabled:opacity-40 text-white rounded-xl cursor-pointer flex items-center justify-center transition-all hover:shadow-lg active:scale-95"
            >
              <Trash2 size={13} />
            </button>
          </motion.div>
        )}
      </div>

      {/* Filter Inputs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search details..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-dark-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-primary-500 font-semibold"
          />
        </div>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            onSelectCategory(e.target.value === 'all' ? null : e.target.value);
            setCurrentPage(1);
          }}
          className="px-3.5 py-2.5 text-xs bg-dark-900 border border-slate-800 rounded-xl text-slate-350 focus:outline-none focus:border-primary-500 cursor-pointer font-semibold shadow-sm"
        >
          <option value="all">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat._id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Payment filter */}
        <select
          value={filterPayment}
          onChange={(e) => { setFilterPayment(e.target.value); setCurrentPage(1); }}
          className="px-3.5 py-2.5 text-xs bg-dark-900 border border-slate-800 rounded-xl text-slate-350 focus:outline-none focus:border-primary-500 cursor-pointer font-semibold shadow-sm"
        >
          <option value="all">All Payment Methods</option>
          <option value="cash">💵 Cash</option>
          <option value="card">💳 Card</option>
          <option value="upi">📱 UPI</option>
          <option value="bank">🏦 Bank</option>
          <option value="other">📁 Other</option>
        </select>

        {/* Amount filter ranges */}
        <select
          value={filterAmount}
          onChange={(e) => { setFilterAmount(e.target.value); setCurrentPage(1); }}
          className="px-3.5 py-2.5 text-xs bg-dark-900 border border-slate-800 rounded-xl text-slate-350 focus:outline-none focus:border-primary-500 cursor-pointer font-semibold shadow-sm"
        >
          <option value="all">All Amounts</option>
          <option value="under1000">Under {currencySymbol}1,000</option>
          <option value="1000to5000">{currencySymbol}1,000 - {currencySymbol}5,000</option>
          <option value="over5000">Over {currencySymbol}5,000</option>
        </select>
      </div>

      {/* Responsive Sticky Header HTML Table */}
      <div className="overflow-x-auto border border-slate-850 rounded-2xl relative max-h-[500px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-dark-900/80 border-b border-slate-800 text-[10px] font-extrabold text-slate-450 uppercase tracking-wider select-none sticky top-0 backdrop-blur-md z-30">
              {/* Select All Checkbox */}
              <th className="px-5 py-4 w-12 text-center">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={paginatedTransactions.length > 0 && selectedIds.length === paginatedTransactions.length}
                  className="rounded border-slate-700 bg-dark-900 text-primary-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                />
              </th>
              {visibleColumns.date && (
                <th onClick={() => requestSort('date')} className="px-5 py-4 cursor-pointer hover:text-white transition-colors">
                  Date {sortField === 'date' && (sortDirection === 'asc' ? <ChevronUp size={11} className="inline ml-1 text-primary-400" /> : <ChevronDown size={11} className="inline ml-1 text-primary-400" />)}
                </th>
              )}
              {visibleColumns.type && (
                <th onClick={() => requestSort('type')} className="px-5 py-4 cursor-pointer hover:text-white transition-colors">
                  Type {sortField === 'type' && (sortDirection === 'asc' ? <ChevronUp size={11} className="inline ml-1 text-primary-400" /> : <ChevronDown size={11} className="inline ml-1 text-primary-400" />)}
                </th>
              )}
              {visibleColumns.category && (
                <th onClick={() => requestSort('category')} className="px-5 py-4 cursor-pointer hover:text-white transition-colors">
                  Category {sortField === 'category' && (sortDirection === 'asc' ? <ChevronUp size={11} className="inline ml-1 text-primary-400" /> : <ChevronDown size={11} className="inline ml-1 text-primary-400" />)}
                </th>
              )}
              {visibleColumns.title && (
                <th onClick={() => requestSort('title')} className="px-5 py-4 cursor-pointer hover:text-white transition-colors">
                  Title {sortField === 'title' && (sortDirection === 'asc' ? <ChevronUp size={11} className="inline ml-1 text-primary-400" /> : <ChevronDown size={11} className="inline ml-1 text-primary-400" />)}
                </th>
              )}
              {visibleColumns.paymentMethod && (
                <th onClick={() => requestSort('paymentMethod')} className="px-5 py-4 cursor-pointer hover:text-white transition-colors">
                  Method {sortField === 'paymentMethod' && (sortDirection === 'asc' ? <ChevronUp size={11} className="inline ml-1 text-primary-400" /> : <ChevronDown size={11} className="inline ml-1 text-primary-400" />)}
                </th>
              )}
              {visibleColumns.amount && (
                <th onClick={() => requestSort('amount')} className="px-5 py-4 cursor-pointer hover:text-white text-right transition-colors">
                  Amount {sortField === 'amount' && (sortDirection === 'asc' ? <ChevronUp size={11} className="inline ml-1 text-primary-400" /> : <ChevronDown size={11} className="inline ml-1 text-primary-400" />)}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-xs font-semibold text-slate-250">
            {paginatedTransactions.map((txn) => {
              const isExpanded = expandedRow === txn.id;
              const isSelected = selectedIds.includes(txn.id);

              return (
                <>
                  <tr 
                    key={txn.id} 
                    className={`hover:bg-slate-800/25 transition-colors cursor-pointer ${
                      isExpanded ? 'bg-slate-800/10' : ''
                    } ${isSelected ? 'bg-primary-500/5' : ''}`}
                    onClick={() => setExpandedRow(isExpanded ? null : txn.id)}
                  >
                    {/* Row Checkbox */}
                    <td className={`${getPaddingClass()} text-center`} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(txn.id)}
                        className="rounded border-slate-700 bg-dark-900 text-primary-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    
                    {visibleColumns.date && (
                      <td className={`${getPaddingClass()} font-mono text-[10.5px] text-slate-450`}>
                        {txn.date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                    )}

                    {visibleColumns.type && (
                      <td className={getPaddingClass()}>
                        <span className={`px-2 py-0.5 text-[8.5px] font-extrabold rounded-lg uppercase border ${
                          txn.type === 'income'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-450'
                        }`}>
                          {txn.type}
                        </span>
                      </td>
                    )}

                    {visibleColumns.category && (
                      <td className={getPaddingClass()}>
                        <span className="bg-dark-900/60 border border-slate-800 px-2 py-0.5 rounded-lg text-slate-350 font-bold text-[10.5px]">
                          {txn.category}
                        </span>
                      </td>
                    )}

                    {visibleColumns.title && (
                      <td className={getPaddingClass()}>
                        <div className="flex flex-col min-w-[120px]">
                          <span className="font-bold text-slate-200">{txn.title}</span>
                          {txn.description && (
                            <span className="text-[10px] text-slate-500 truncate max-w-[160px] font-medium mt-0.5">
                              {txn.description}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {visibleColumns.paymentMethod && (
                      <td className={`${getPaddingClass()} capitalize font-mono text-slate-500 text-[10.5px] font-bold`}>
                        {txn.paymentMethod === 'upi' ? '📱 UPI' : txn.paymentMethod === 'card' ? '💳 Card' : txn.paymentMethod === 'cash' ? '💵 Cash' : txn.paymentMethod === 'bank' ? '🏦 Bank' : '📁 Other'}
                      </td>
                    )}

                    {visibleColumns.amount && (
                      <td className={`${getPaddingClass()} text-right font-black font-mono text-[12.5px] ${
                        txn.type === 'income' ? 'text-emerald-400' : 'text-rose-455'
                      }`}>
                        {txn.type === 'income' ? '+' : '-'}{currencySymbol}{txn.amount.toLocaleString('en-IN')}
                      </td>
                    )}
                  </tr>

                  {/* Expandable Drawer Row */}
                  <AnimatePresence>
                    {isExpanded && (
                      <tr className="bg-dark-900/30 border-b border-slate-850">
                        <td colSpan={8} className="px-6 py-4">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-slate-350"
                          >
                            {/* Metadata */}
                            <div className="space-y-1.5 p-3 bg-dark-900/40 border border-slate-850 rounded-2xl">
                              <h5 className="text-[9px] font-extrabold text-slate-450 uppercase tracking-wider flex items-center gap-1">
                                <Calendar size={10} className="text-primary-400" />
                                <span>Ledger Metadata</span>
                              </h5>
                              <p className="text-[10.5px]">
                                Date: <strong className="text-slate-200">{txn.date.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                              </p>
                              <p className="text-[10.5px]">
                                Transaction Reference ID: <strong className="text-slate-400 font-mono text-[9.5px]">{txn.id}</strong>
                              </p>
                            </div>

                            {/* Details description */}
                            <div className="space-y-1.5 p-3 bg-dark-900/40 border border-slate-850 rounded-2xl md:col-span-2">
                              <h5 className="text-[9px] font-extrabold text-slate-450 uppercase tracking-wider flex items-center gap-1">
                                <Tag size={10} className="text-primary-400" />
                                <span>Remarks & Notes</span>
                              </h5>
                              <p className="text-[10.5px] leading-relaxed text-slate-250 italic">
                                "{txn.description || 'No descriptive comments recorded for this entry.'}"
                              </p>
                              
                              {/* Tag list */}
                              {txn.tags && txn.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                  {txn.tags.map((tag) => (
                                    <span key={tag} className="px-2 py-0.5 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-lg text-[9px] font-bold">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </>
              );
            })}

            {paginatedTransactions.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500 text-xs">
                  No transaction records match active query filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center border-t border-slate-800/60 pt-4">
          <span className="text-[10px] font-bold text-slate-500">
            Showing Page {currentPage} of {totalPages} ({sortedTransactions.length} records filtered)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-850 bg-dark-900 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-850 bg-dark-900 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
