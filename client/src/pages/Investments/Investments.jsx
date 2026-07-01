import { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#ef4444'];

export default function Investments() {
  const [investments, setInvestments] = useState([]);
  const [stats, setStats] = useState({
    totalInvested: 0,
    totalCurrentValue: 0,
    profitOrLoss: 0,
    percentageReturn: 0,
    allocation: []
  });
  const [loading, setLoading] = useState(true);

  // New investment form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('stocks');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [symbol, setSymbol] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, statsRes] = await Promise.all([
        api.get('/investments'),
        api.get('/investments/stats')
      ]);
      setInvestments(invRes.data.data || []);
      setStats(statsRes.data.data || {
        totalInvested: 0,
        totalCurrentValue: 0,
        profitOrLoss: 0,
        percentageReturn: 0,
        allocation: []
      });
    } catch {
      toast.error('Failed to load investments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !investedAmount) return toast.error('Please enter name and invested amount');
    try {
      await api.post('/investments', {
        name,
        type,
        investedAmount: Number(investedAmount),
        currentValue: currentValue ? Number(currentValue) : Number(investedAmount),
        symbol
      });
      toast.success('Investment logged!');
      setShowCreate(false);
      setName('');
      setInvestedAmount('');
      setCurrentValue('');
      setSymbol('');
      fetchData();
    } catch {
      toast.error('Failed to add investment');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this investment log?')) return;
    try {
      await api.delete(`/investments/${id}`);
      toast.success('Investment log deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete investment');
    }
  };

  const assetAllocationData = stats.allocation.map(a => ({
    name: a.type.toUpperCase().replace('_', ' '),
    value: a.amount
  })).filter(a => a.value > 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Investments Portfolio</h1>
          <p className="text-xs text-slate-400 mt-0.5">Track stocks, mutual funds, gold, crypto, NPS, and FDs</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
          + Add Asset Log
        </button>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card-sm flex items-center gap-4 border-l-4 border-indigo-500">
          <span className="text-2xl">💼</span>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Invested Value</p>
            <p className="text-lg font-extrabold text-slate-100 mt-0.5">₹{Number(stats.totalInvested).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="card-sm flex items-center gap-4 border-l-4 border-emerald-500">
          <span className="text-2xl">📈</span>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Current Value</p>
            <p className="text-lg font-extrabold text-slate-100 mt-0.5">₹{Number(stats.totalCurrentValue).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="card-sm flex items-center gap-4 border-l-4 border-green-500">
          <span className="text-2xl">🟢</span>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Profit/Loss</p>
            <p className={`text-lg font-extrabold mt-0.5 ${stats.profitOrLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ₹{Number(stats.profitOrLoss).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        <div className="card-sm flex items-center gap-4 border-l-4 border-amber-500">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Percentage Returns</p>
            <p className={`text-lg font-extrabold mt-0.5 ${stats.percentageReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.percentageReturn.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table list */}
        <div className="card lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Asset Ledger</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Type</th>
                  <th>Invested (₹)</th>
                  <th>Current (₹)</th>
                  <th>P&L (₹)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-slate-500">Loading portfolios...</td>
                  </tr>
                ) : investments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-slate-500">No assets tracked yet.</td>
                  </tr>
                ) : (
                  investments.map((inv) => {
                    const diff = inv.currentValue - inv.investedAmount;
                    const pct = inv.investedAmount > 0 ? (diff / inv.investedAmount) * 100 : 0;
                    return (
                      <tr key={inv._id}>
                        <td>
                          <span className="font-semibold text-slate-200">{inv.name}</span>
                          {inv.symbol && <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded ml-2 text-slate-400 font-bold uppercase">{inv.symbol}</span>}
                        </td>
                        <td className="text-xs uppercase text-slate-500">{inv.type.replace('_', ' ')}</td>
                        <td>₹{Number(inv.investedAmount).toLocaleString('en-IN')}</td>
                        <td>₹{Number(inv.currentValue).toLocaleString('en-IN')}</td>
                        <td className={diff >= 0 ? 'text-green-400' : 'text-red-400'}>
                          ₹{diff.toLocaleString('en-IN')} ({pct.toFixed(1)}%)
                        </td>
                        <td>
                          <button onClick={() => handleDelete(inv._id)} className="text-slate-500 hover:text-red-400">
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recharts allocation pie chart */}
        <div className="card flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-200">Asset Allocation</h3>
          <div className="h-60 mt-4 relative flex items-center justify-center">
            {assetAllocationData.length === 0 ? (
              <p className="text-xs text-slate-500">No allocations to map</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetAllocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {assetAllocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-1.5 text-xs">
            {assetAllocationData.map((d, index) => (
              <div key={d.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-400">{d.name}</span>
                </div>
                <span className="font-bold text-slate-200">₹{Number(d.value).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CREATE ASSET LOG MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="font-bold text-slate-100">Log Asset Investment</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-100">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="form-group">
                <label className="label">Asset / Holding Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Parag Parikh Flexi Cap, Nifty ETF, Bitcoin" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Asset Class</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="select">
                    <option value="stocks">Stocks</option>
                    <option value="mutual_funds">Mutual Funds</option>
                    <option value="gold">Gold (SGB/Physical)</option>
                    <option value="crypto">Cryptocurrency</option>
                    <option value="fd">Fixed Deposit (FD)</option>
                    <option value="ppf">Public Provident Fund (PPF)</option>
                    <option value="nps">National Pension Scheme (NPS)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Ticker Symbol (Optional)</label>
                  <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. NIFTYBEES, BTC" className="input text-transform: uppercase" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Invested Principal (₹)</label>
                  <input type="number" value={investedAmount} onChange={(e) => setInvestedAmount(e.target.value)} placeholder="0.00" className="input" />
                </div>
                <div className="form-group">
                  <label className="label">Current Asset Value (₹)</label>
                  <input type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="Omit to match invested" className="input" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">Log Investment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
