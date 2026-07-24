import { useEffect, useState } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import api from '../../services/api';
import toast from 'react-hot-toast';

const getLocalTodayString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getLocalTimeString = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank', 'other'];
const EMPTY = { title: '', amount: '', category: '', date: getLocalTodayString(), time: getLocalTimeString(), paymentMethod: 'upi', description: '', tags: '' };

export default function Expenses() {
  const { expenses, fetchExpenses, addExpense, updateExpense, deleteExpense, categories, fetchCategories, loading } = useExpense();
  const [modal, setModal] = useState({ open: false, mode: 'add', item: null });
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState({ paymentMethod: '', category: '' });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  useEffect(() => {
    fetchExpenses();
    fetchCategories('expense');
  }, []);

  const openAdd = () => {
    setForm({
      ...EMPTY,
      date: getLocalTodayString(),
      time: getLocalTimeString()
    });
    setModal({ open: true, mode: 'add', item: null });
  };

  const openEdit = (item) => {
    const itemDateObj = new Date(item.date);
    const yyyy = itemDateObj.getFullYear();
    const mm = String(itemDateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(itemDateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    const hh = String(itemDateObj.getHours()).padStart(2, '0');
    const min = String(itemDateObj.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${min}`;

    setForm({
      ...item,
      category: item.category?._id || item.category || '',
      date: dateStr,
      time: timeStr,
      tags: (item.tags || []).join(', '),
    });
    setModal({ open: true, mode: 'edit', item });
  };
  const closeModal = () => setModal({ open: false, mode: 'add', item: null });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend validations
    if (!form.title || !form.title.trim()) {
      toast.error('Please enter a title.');
      return;
    }
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (!form.date) {
      toast.error('Please select a date.');
      return;
    }
    if (!form.category) {
      toast.error('Please select a category.');
      return;
    }
    if (!form.paymentMethod) {
      toast.error('Please select a payment method.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        date: new Date(`${form.date}T${form.time || '00:00'}`).toISOString(),
      };
      delete payload.time;

      // Clean up fields not accepted by backend Joi schema to avoid unknown field errors
      delete payload._id;
      delete payload.user;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.__v;
      delete payload.wallet;

      // Format/trim input fields
      if (payload.title) payload.title = payload.title.trim();
      if (payload.amount) payload.amount = Number(payload.amount);
      if (payload.tags && typeof payload.tags === 'string') {
        payload.tags = payload.tags.split(',').map((t) => t.trim()).filter(Boolean);
      } else if (!payload.tags) {
        payload.tags = [];
      }

      console.log("Outgoing Payload:", payload);

      if (modal.mode === 'add') await addExpense(payload);
      else await updateExpense(modal.item._id, payload);
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id, loading: false });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await deleteExpense(deleteConfirm.id);
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
    } catch {
      toast.error('Failed to delete');
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const filtered = expenses.filter((e) => {
    if (filter.paymentMethod && e.paymentMethod !== filter.paymentMethod) return false;
    if (filter.category && e.category?._id !== filter.category) return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="expenses-page space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">{filtered.length} records · Total: <span className="text-red-400 font-semibold">₹{totalFiltered.toLocaleString('en-IN')}</span></p>
        </div>
        <button id="add-expense-btn" onClick={openAdd} className="btn-primary">+ Add Expense</button>
      </div>

      {/* Filters */}
      <div className="card-sm flex flex-wrap gap-3">
        <select className="select flex-1 min-w-[140px]" value={filter.paymentMethod} onChange={(e) => setFilter({ ...filter, paymentMethod: e.target.value })}>
          <option value="">All Payment Methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
        </select>
        <select className="select flex-1 min-w-[140px]" value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
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
                    <td className="text-slate-400">
                      <div className="flex flex-col">
                        <span>{new Date(item.date).toLocaleDateString('en-IN')}</span>
                        <span className="text-[10px] text-slate-500">{new Date(item.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Grocery shopping" />
            </div>
            <div className="form-group">
              <label className="label">Amount (₹) *</label>
              <input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="label">Time *</label>
              <input type="time" className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleteConfirm.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  );
}
