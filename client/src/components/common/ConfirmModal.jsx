export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  loading = false,
  danger = true
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-dark-800 border border-slate-700 rounded-2xl shadow-2xl animate-slide-up p-6 overflow-hidden">
        <div className="flex items-start gap-4">
          {/* Warning Icon Badge */}
          <div className={`p-3 rounded-full flex-shrink-0 ${danger ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-primary-500/10 text-primary-400 border border-primary-500/20'}`}>
            {danger ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-100 mb-1">{title}</h3>
            <div className="text-sm text-slate-300 leading-relaxed">{message}</div>
          </div>

          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary px-4 py-2 text-sm"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`${danger ? 'bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-all duration-200' : 'btn-primary'} px-4 py-2 text-sm flex items-center gap-2`}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
