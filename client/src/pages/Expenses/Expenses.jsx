import { useEffect, useState } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank', 'other'];
const EMPTY = { title: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'upi', description: '', tags: '' };

export default function Expenses() {
  const { expenses, fetchExpenses, addExpense, updateExpense, deleteExpense, categories, fetchCategories, loading } = useExpense();
  const [modal, setModal] = useState({ open: false, mode: 'add', item: null });
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState({ paymentMethod: '', category: '' });

  useEffect(() => { fetchExpenses(); fetchCategories('expense'); }, []);

  const openAdd = () => { setForm(EMPTY); setModal({ open: true, mode: 'add', item: null }); };
  const openEdit = (item) => {
    setForm({
      ...item,
      category: item.category?._id || item.category || '',
      date: new Date(item.date).toISOString().split('T')[0],
      tags: (item.tags || []).join(', '),
    });
    setModal({ open: true, mode: 'edit', item });
  };
  const closeModal = () => setModal({ open: false, mode: 'add', item: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [] };
      if (modal.mode === 'add') await addExpense(payload);
      else await updateExpense(modal.item._id, payload);
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await deleteExpense(id); } catch { toast.error('Failed to delete'); }
  };

  const filtered = expenses.filter((e) => {
    if (filter.paymentMethod && e.paymentMethod !== filter.paymentMethod) return false;
    if (filter.category && e.category?._id !== filter.category) return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">{filtered.length} records · Total: <span className="text-red-400 font-semibold">₹{totalFiltered.toLocaleString('en-IN')}</span></p>
        </div>
        <button id="add-expense-btn" onClick={openAdd} className="btn-primary">+ Add Expense</button>
      </div>

      {/* Filters */}
      <div className="card-sm flex flex-wrap gap-3">
        <select className="select max-w-[160px]" value={filter.paymentMethod} onChange={(e) => setFilter({ ...filter, paymentMethod: e.target.value })}>
          <option value="">All Payment Methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
        </select>
        <select className="select max-w-[180px]" value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
        </select>
        {(filter.paymentMethod || filter.category) && (
          <button onClick={() => setFilter({ paymentMethod: '', category: '' })} className="btn-ghost text-xs">Clear</button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-slate-400">No expenses found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Title</th><th>Category</th><th>Payment</th><th>Date</th><th>Amount</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item._id}>
                    <td className="font-medium text-slate-100">{item.title}</td>
                    <td>
                      {item.category ? (
                        <span className="flex items-center gap-1.5 text-sm">
                          <span>{item.category.icon}</span>
                          <span className="text-slate-300">{item.category.name}</span>
                        </span>
                      ) : <span className="text-slate-500">—</span>}
                    </td>
                    <td><span className="badge badge-blue">{item.paymentMethod?.toUpperCase()}</span></td>
                    <td className="text-slate-400">{new Date(item.date).toLocaleDateString('en-IN')}</td>
                    <td className="text-red-400 font-semibold">₹{item.amount.toLocaleString('en-IN')}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(item)} className="btn-ghost text-xs px-2 py-1">Edit</button>
                        <button onClick={() => handleDelete(item._id)} className="btn-danger text-xs px-2 py-1">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'add' ? 'Add Expense' : 'Edit Expense'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Grocery shopping" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Amount (₹) *</label>
              <input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0" placeholder="0" />
            </div>
            <div className="form-group">
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Category</label>
              <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Payment Method</label>
              <select className="select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Tags (comma-separated)</label>
            <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. food, weekend, family" />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional note" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Saving...' : modal.mode === 'add' ? 'Add Expense' : 'Update'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
