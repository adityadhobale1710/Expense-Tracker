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

const EMPTY = { title: '', amount: '', category: '', source: '', date: getLocalTodayString(), time: getLocalTimeString(), description: '' };

export default function Income() {
  const { incomes, fetchIncomes, addIncome, updateIncome, deleteIncome, categories, fetchCategories, loading } = useExpense();
  const [modal, setModal] = useState({ open: false, mode: 'add', item: null });
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  useEffect(() => {
    fetchIncomes();
    fetchCategories('income');
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
      date: dateStr,
      time: timeStr,
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

      // Ensure optional fields are trimmed/cleaned up
      if (payload.title) payload.title = payload.title.trim();
      if (payload.amount) payload.amount = Number(payload.amount);
      if (!payload.category) delete payload.category;
      if (!payload.source) delete payload.source;
      if (!payload.description) delete payload.description;

      console.log("Outgoing Payload:", payload);

      if (modal.mode === 'add') await addIncome(payload);
      else await updateIncome(modal.item._id, payload);
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
      await deleteIncome(deleteConfirm.id);
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
    } catch {
      toast.error('Failed to delete');
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Income</h1>
          <p className="page-subtitle">{incomes.length} records · Total: <span className="text-green-400 font-semibold">₹{totalIncome.toLocaleString('en-IN')}</span></p>
        </div>
        <button id="add-income-btn" onClick={openAdd} className="btn-primary">+ Add Income</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : incomes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💰</p>
            <p className="text-slate-400">No income records yet. Add your first income!</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th><th>Category</th><th>Source</th><th>Date</th><th>Amount</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((item) => (
                  <tr key={item._id}>
                    <td className="font-medium text-slate-100">{item.title}</td>
                    <td><span className="badge badge-green">{item.category || '—'}</span></td>
                    <td className="text-slate-400">{item.source || '—'}</td>
                    <td className="text-slate-400">
                      <div className="flex flex-col">
                        <span>{new Date(item.date).toLocaleDateString('en-IN')}</span>
                        <span className="text-[10px] text-slate-500">{new Date(item.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="text-green-400 font-semibold">₹{item.amount.toLocaleString('en-IN')}</td>
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

      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'add' ? 'Add Income' : 'Edit Income'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Monthly Salary" />
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
                {categories.map((c) => <option key={c._id} value={c.name}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Source</label>
              <input className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Company" />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional note" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Saving...' : modal.mode === 'add' ? 'Add Income' : 'Update'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Income"
        message="Are you sure you want to delete this income record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleteConfirm.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
      />
    </div>
  );
}
