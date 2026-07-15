export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

  return (
    // Phase 4: outer wrapper scrollable so modal is reachable when keyboard is open
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Phase 4: max-h-[90dvh] + flex-col so header stays pinned and body scrolls */}
      <div className={`relative w-full ${sizes[size]} bg-dark-800 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up flex flex-col max-h-[90dvh]`}>
        {/* Pinned header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="btn-icon text-xl leading-none">×</button>
        </div>
        {/* Scrollable body — grows to fill remaining space */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
