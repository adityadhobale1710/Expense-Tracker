import { useEffect, useRef } from 'react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Keep a stable ref to the latest onClose so the Escape handler never becomes
  // stale without making it a useEffect dependency.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    // Remember what had focus before the modal opened so we can restore it.
    previousFocusRef.current = document.activeElement;

    // Attempt to move initial focus into the dialog ONCE, right after paint.
    // We use requestAnimationFrame so the DOM is fully rendered before we query it.
    // Critically: we only steal focus when nothing inside the dialog is already
    // focused. This prevents the focus from being yanked away when:
    //   • The user clicks an input faster than a setTimeout(50ms) would fire.
    //   • The user clicks the native date picker (which triggers a blur then a
    //     system-level popup — no element inside the dialog gets focus).
    let rafId = requestAnimationFrame(() => {
      if (!dialogRef.current) return;
      const alreadyFocusedInside = dialogRef.current.contains(document.activeElement);
      if (!alreadyFocusedInside) {
        // Focus the close button as the accessibility-safe default.
        closeButtonRef.current?.focus();
      }
    });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that was active before the modal opened.
      previousFocusRef.current?.focus();
    };
  }, [isOpen]); // isOpen only — never onClose (new arrow function every render).

  if (!isOpen) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
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

