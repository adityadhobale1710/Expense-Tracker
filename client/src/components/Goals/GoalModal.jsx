import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { GOAL_CATEGORIES, SUGGESTED_ICONS, PRESET_COLORS } from '../../utils/goalHelpers';

export default function GoalModal({
  isOpen,
  onClose,
  onSubmit,
  goal = null,
  templates = []
}) {
  const isEdit = !!goal && !goal.isTemplate;


  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Other',
    targetAmount: '',
    savedAmount: 0,
    targetDate: '',
    priority: 'Medium',
    color: '#6366f1',
    icon: '🎯',
    notes: ''
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title || '',
        description: goal.description || '',
        category: goal.category || 'Other',
        targetAmount: goal.targetAmount || '',
        savedAmount: goal.savedAmount || 0,
        targetDate: goal.targetDate ? goal.targetDate.substring(0, 10) : '',
        priority: goal.priority || 'Medium',
        color: goal.color || '#6366f1',
        icon: goal.icon || '🎯',
        notes: goal.notes || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'Other',
        targetAmount: '',
        savedAmount: 0,
        targetDate: '',
        priority: 'Medium',
        color: '#6366f1',
        icon: '🎯',
        notes: ''
      });
    }
    setError('');
  }, [goal, isOpen]);

  if (!isOpen) return null;

  const handleTemplateClick = (t) => {
    setFormData(prev => ({
      ...prev,
      title: t.name || prev.title,
      targetAmount: t.targetAmount || prev.targetAmount,
      icon: t.icon || prev.icon,
      category: t.category || prev.category,
      color: t.color || prev.color
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) return setError('Goal title is required');
    if (!formData.targetAmount || Number(formData.targetAmount) <= 0) {
      return setError('Target amount must be greater than zero');
    }
    if (!formData.targetDate) return setError('Target date is required');
    if (new Date(formData.targetDate) <= new Date() && !isEdit) {
      return setError('Target date must be in the future');
    }
    if (Number(formData.savedAmount) > Number(formData.targetAmount)) {
      return setError('Initial saved amount cannot exceed target amount');
    }

    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl bg-dark-800 border border-slate-700/50 rounded-2xl shadow-xl p-6 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-700/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400">
              <Sparkles size={18} />
            </div>
            <h3 className="text-base font-bold text-slate-100">
              {isEdit ? 'Modify Savings Goal' : 'Initiate Financial Goal'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-dark-900 border border-slate-700/30 text-slate-400 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold my-4">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 mt-4 space-y-4">
          
          {/* Prepackaged Templates (Create only) */}
          {!isEdit && templates.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Quick Start Templates</label>
              <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
                {templates.map(t => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => handleTemplateClick(t)}
                    className="flex-shrink-0 px-3 py-1.5 bg-dark-900 border border-slate-700/40 rounded-xl hover:border-primary-500 hover:bg-dark-800 transition-colors flex items-center gap-1.5 font-bold"
                  >
                    <span>{t.icon}</span>
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Goal Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. New MacBook Pro"
                className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500"
              >
                {GOAL_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Target & Saved */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Amount (INR)</label>
              <input
                type="number"
                value={formData.targetAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                placeholder="e.g. 150000"
                className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Already Saved (INR)</label>
              <input
                type="number"
                value={formData.savedAmount}
                disabled={isEdit}
                onChange={(e) => setFormData(prev => ({ ...prev, savedAmount: Number(e.target.value) }))}
                placeholder="e.g. 5000"
                className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Target Date & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Date</label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description / Personal Notes</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g. Target MacBook for developers, need to purchase by end of year."
              rows={2}
              className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500 resize-none"
            />
          </div>

          {/* Emoji Icon picker */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Choose Icon</label>
            <div className="grid grid-cols-6 gap-2 text-lg">
              {SUGGESTED_ICONS.map(ic => (
                <button
                  key={ic.char}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon: ic.char }))}
                  className={`p-2 bg-dark-900 border rounded-xl hover:bg-dark-800 transition-colors ${formData.icon === ic.char ? 'border-primary-500 bg-primary-500/5' : 'border-slate-700/40'}`}
                  title={ic.label}
                >
                  {ic.char}
                </button>
              ))}
            </div>
          </div>

          {/* Color Themes */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Choose Color Theme</label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map(col => (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: col.hex }))}
                  className={`h-9 border rounded-xl flex items-center justify-center transition-all ${formData.color === col.hex ? 'border-white scale-105' : 'border-transparent'}`}
                  style={{ backgroundColor: col.hex }}
                  title={col.name}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-700/30 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-dark-900 border border-slate-700/40 text-xs font-bold text-slate-300 hover:text-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-xs font-bold text-slate-100 rounded-xl shadow-md transition-all shadow-primary-500/10 flex items-center gap-1.5"
            >
              <span>{isEdit ? 'Save Changes' : 'Initialize Goal'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
