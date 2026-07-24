import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { GOAL_CATEGORIES, SUGGESTED_ICONS, PRESET_COLORS, PRESET_GRADIENTS } from '../../utils/goalHelpers';

export default function GoalModal({
  isOpen,
  onClose,
  onSubmit,
  goal = null, // if provided, we are editing
  templates = []
}) {
  const isEdit = !!goal;

  const [activeTab, setActiveTab] = useState('basic'); // basic, autosave, style
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
    gradient: '',
    notes: '',
    autoSaveEnabled: false,
    autoSaveType: null,
    autoSavePercentage: 0,
    autoSaveFixedAmount: 0,
    autoSaveCategories: [],
    visibility: 'Private'
  });

  const [error, setError] = useState('');

  // Load existing goal data if editing
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
        gradient: goal.gradient || '',
        notes: goal.notes || '',
        autoSaveEnabled: goal.autoSaveEnabled || false,
        autoSaveType: goal.autoSaveType || null,
        autoSavePercentage: goal.autoSavePercentage || 0,
        autoSaveFixedAmount: goal.autoSaveFixedAmount || 0,
        autoSaveCategories: goal.autoSaveCategories || [],
        visibility: goal.visibility || 'Private'
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
        gradient: '',
        notes: '',
        autoSaveEnabled: false,
        autoSaveType: null,
        autoSavePercentage: 0,
        autoSaveFixedAmount: 0,
        autoSaveCategories: [],
        visibility: 'Private'
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

  const handleCheckboxChange = (catName) => {
    const list = [...formData.autoSaveCategories];
    const index = list.indexOf(catName);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(catName);
    }
    setFormData(prev => ({ ...prev, autoSaveCategories: list }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validations
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
        className="w-full max-w-xl bg-dark-800/90 border border-slate-700/60 rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-700/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400">
              <Sparkles size={18} />
            </div>
            <h3 className="text-base font-black text-slate-100">
              {isEdit ? 'Modify Savings Goal' : 'Initiate Financial Goal'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-dark-900 border border-slate-700/30 text-slate-400 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-700/25 my-4 text-xs font-bold gap-2">
          <button
            onClick={() => setActiveTab('basic')}
            className={`pb-2 px-1 border-b-2 transition-all ${activeTab === 'basic' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-slate-350'}`}
          >
            Basic Rules
          </button>
          <button
            onClick={() => setActiveTab('autosave')}
            className={`pb-2 px-1 border-b-2 transition-all ${activeTab === 'autosave' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-slate-350'}`}
          >
            Auto Save Engine
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`pb-2 px-1 border-b-2 transition-all ${activeTab === 'style' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-slate-350'}`}
          >
            Fintech Aesthetics
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold mb-4">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4">
          
          {/* Tab 1: Basic Information */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
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
                    disabled={isEdit} // don't modify saved amount directly if editing (must use contributions)
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

              {/* Description & Visibility */}
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
            </div>
          )}

          {/* Tab 2: Auto Save Configuration */}
          {activeTab === 'autosave' && (
            <div className="space-y-4">
              {/* Enable AutoSave Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-dark-900/40 border border-slate-700/30 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Automatically Allocate Savings</h4>
                  <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Secure savings allocations whenever you add new income transactions</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, autoSaveEnabled: !prev.autoSaveEnabled }))}
                  className={`w-9 h-5 rounded-full p-[2px] transition-colors focus:outline-none ${formData.autoSaveEnabled ? 'bg-primary-500' : 'bg-slate-700'}`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${formData.autoSaveEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {formData.autoSaveEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-1"
                >
                  {/* Auto Save Type */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Savings Distribution Rule</label>
                    <select
                      value={formData.autoSaveType || 'percentage'}
                      onChange={(e) => setFormData(prev => ({ ...prev, autoSaveType: e.target.value }))}
                      className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500"
                    >
                      <option value="percentage">Percentage (e.g. Save 10% of Income)</option>
                      <option value="fixed">Fixed Amount (e.g. Save ₹5,000 every Salary)</option>
                      <option value="round_up_100">Round-Up to nearest ₹100</option>
                      <option value="round_up_500">Round-Up to nearest ₹500</option>
                      <option value="round_up_1000">Round-Up to nearest ₹1000</option>
                      <option value="remaining_salary">All Remaining Salary allocation</option>
                    </select>
                  </div>

                  {/* Input parameters if percentage or fixed */}
                  {(formData.autoSaveType === 'percentage' || formData.autoSaveType === 'remaining_salary') && (
                    <div className="flex flex-col space-y-1 animate-fadeIn">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Percentage (%) to Save</label>
                      <input
                        type="number"
                        value={formData.autoSavePercentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, autoSavePercentage: Number(e.target.value) }))}
                        placeholder="e.g. 10"
                        className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  )}

                  {formData.autoSaveType === 'fixed' && (
                    <div className="flex flex-col space-y-1 animate-fadeIn">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fixed Amount (INR) to Save</label>
                      <input
                        type="number"
                        value={formData.autoSaveFixedAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, autoSaveFixedAmount: Number(e.target.value) }))}
                        placeholder="e.g. 5000"
                        className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  )}

                  {/* Connected income categories */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Connected Income Categories</label>
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                      {['Salary', 'Freelance', 'Bonus', 'Investment', 'Refunds', 'Other'].map(cat => (
                        <label
                          key={cat}
                          className="flex items-center gap-2 p-2.5 bg-dark-900/60 border border-slate-700/30 rounded-xl hover:bg-dark-800 transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.autoSaveCategories.includes(cat)}
                            onChange={() => handleCheckboxChange(cat)}
                            className="rounded text-primary-500 bg-dark-900 border-slate-700 focus:ring-0 focus:ring-offset-0"
                          />
                          <span>{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Tab 3: Fintech Aesthetics */}
          {activeTab === 'style' && (
            <div className="space-y-4">
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
                      onClick={() => setFormData(prev => ({ ...prev, color: col.hex, gradient: '' }))}
                      className={`h-9 border rounded-xl flex items-center justify-center transition-all ${formData.color === col.hex && !formData.gradient ? 'border-white scale-105' : 'border-transparent'}`}
                      style={{ backgroundColor: col.hex }}
                      title={col.name}
                    />
                  ))}
                </div>
              </div>

              {/* Gradient Themes */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Choose Premium Gradient Background</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, gradient: '' }))}
                    className={`h-12 bg-dark-900 border rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-colors ${!formData.gradient ? 'border-primary-500 bg-primary-500/5' : 'border-slate-700/40'}`}
                  >
                    Classic Dark
                  </button>
                  {PRESET_GRADIENTS.map(grad => (
                    <button
                      key={grad.name}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, gradient: grad.value }))}
                      className={`h-12 bg-gradient-to-br border rounded-xl flex items-center justify-center transition-all ${formData.gradient === grad.value ? 'border-white scale-105 shadow-lg' : 'border-transparent'} ${grad.value}`}
                      title={grad.name}
                    />
                  ))}
                </div>
              </div>

              {/* Visibility Settings */}
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Goal Visibility</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                  className="px-3.5 py-2 bg-dark-900 border border-slate-700/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary-500"
                >
                  <option value="Private">🔒 Private (User-specific logs)</option>
                  <option value="Family">👪 Family Sharing (Visible to family members)</option>
                  <option value="Shared">🌐 Public/Shared (Visible to shared links)</option>
                </select>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-4 border-t border-slate-700/30 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-dark-900 border border-slate-700/40 text-xs font-bold text-slate-350 hover:text-slate-100 rounded-xl transition-all"
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
