import { useEffect, useRef } from 'react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus trap / restore and Escape handler
  useEffect(() => {
    if (isOpen) {
      // Store the active element to restore focus later
      previousFocusRef.current = document.activeElement;
      
      const focusTimer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(focusTimer);
        window.removeEventListener('keydown', handleKeyDown);
        // Restore focus to previous element when modal unmounts/closes
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

  return (
    // Phase 4: outer wrapper scrollable so modal is reachable when keyboard is open
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Phase 4: max-h-[90dvh] + flex-col so header stays pinned and body scrolls */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full ${sizes[size]} bg-dark-800 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up flex flex-col max-h-[90dvh]`}
      >
        {/* Pinned header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <h3 id="modal-title" className="text-base font-semibold text-slate-100">{title}</h3>
          <button 
            ref={closeButtonRef}
            onClick={onClose} 
            className="btn-icon text-xl leading-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded p-1 cursor-pointer"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        {/* Scrollable body — grows to fill remaining space */}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
