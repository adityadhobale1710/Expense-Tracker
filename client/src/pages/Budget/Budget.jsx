import { useEffect, useState } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const EMPTY_BUDGET = { category: '', limit: '', period: 'monthly', alertThreshold: 80 };

export default function Budget() {
  const { budgets, fetchBudgets, addBudget, updateBudget, deleteBudget, categories, fetchCategories } = useExpense();
  const [modal, setModal] = useState({ open: false, mode: 'add', item: null });
  const [form, setForm] = useState(EMPTY_BUDGET);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchBudgets(); fetchCategories('expense'); }, []);

  const openAdd = () => { setForm(EMPTY_BUDGET); setModal({ open: true, mode: 'add', item: null }); };
  const openEdit = (item) => {
    setForm({ ...item, category: item.category?._id || '' });
    setModal({ open: true, mode: 'edit', item });
  };
  const closeModal = () => setModal({ open: false, mode: 'add', item: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modal.mode === 'add') await addBudget(form);
      else await updateBudget(modal.item._id, form);
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save budget');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    try { await deleteBudget(id); } catch { toast.error('Failed to delete'); }
  };

  const totalBudgeted = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budget</h1>
          <p className="page-subtitle">
            Spent <span className="text-red-400 font-medium">₹{totalSpent.toLocaleString('en-IN')}</span> of <span className="text-primary-400 font-medium">₹{totalBudgeted.toLocaleString('en-IN')}</span> budgeted
          </p>
        </div>
        <button id="add-budget-btn" onClick={openAdd} className="btn-primary">+ Set Budget</button>
      </div>

      {budgets.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">🎯</p>
          <p className="text-slate-300 font-medium mb-1">No budgets set</p>
          <p className="text-slate-500 text-sm">Create budgets to track your spending limits per category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const pct = b.limit > 0 ? Math.min(Math.round((b.spent / b.limit) * 100), 100) : 0;
            const isOver = pct >= 100;
            const isWarning = pct >= b.alertThreshold;
            const barColor = isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500';
            const remaining = b.limit - b.spent;

            return (
              <div key={b._id} className={`card hover:border-primary-500/30 transition-all duration-200 ${isOver ? 'border-red-500/40' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${b.category?.color}20` }}>
                      {b.category?.icon || '📁'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-100">{b.category?.name || 'Budget'}</h3>
                      <span className="badge badge-purple capitalize">{b.period}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className="btn-icon text-sm">✏️</button>
                    <button onClick={() => handleDelete(b._id)} className="btn-icon text-sm">🗑️</button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">Progress</span>
                    <span className={`text-sm font-semibold ${isOver ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-green-400'}`}>{pct}%</span>
                  </div>
                  <div className="progress-bar h-3">
                    <div className={`progress-fill ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Spent</p>
                    <p className="text-sm font-semibold text-red-400">₹{b.spent.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Limit</p>
                    <p className="text-sm font-semibold text-slate-200">₹{b.limit.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Left</p>
                    <p className={`text-sm font-semibold ${remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>₹{remaining.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {isOver && <p className="mt-3 text-xs text-red-400 text-center">⚠️ Budget exceeded!</p>}
                {isWarning && !isOver && <p className="mt-3 text-xs text-yellow-400 text-center">⚡ Approaching limit ({b.alertThreshold}% threshold)</p>}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'add' ? 'Set Budget' : 'Edit Budget'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="label">Category *</label>
            <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Budget Limit (₹) *</label>
              <input type="number" className="input" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} required min="0" placeholder="0" />
            </div>
            <div className="form-group">
              <label className="label">Period</label>
              <select className="select" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Alert at (% of limit)</label>
            <input type="number" className="input" value={form.alertThreshold} onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })} min="0" max="100" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Saving...' : modal.mode === 'add' ? 'Create Budget' : 'Update'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
