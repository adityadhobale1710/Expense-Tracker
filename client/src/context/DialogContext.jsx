import React, { createContext, useState, useCallback, useMemo } from 'react';
import DialogContainer from '../components/common/dialog/DialogContainer';
import ToastContainer from '../components/common/toast/ToastContainer';

export const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Toast functions
  const addToast = useCallback((type, message, title = '') => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]); // Keep max 5 toasts visible
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((message, title = 'Success') => {
    addToast('success', message, title);
  }, [addToast]);

  const showError = useCallback((message, title = 'Error') => {
    addToast('error', message, title);
  }, [addToast]);

  const showWarning = useCallback((message, title = 'Warning') => {
    addToast('warning', message, title);
  }, [addToast]);

  const showInfo = useCallback((message, title = 'Information') => {
    addToast('info', message, title);
  }, [addToast]);

  // Dialog functions
  const showConfirm = useCallback(({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'confirmation',
    icon = null,
  }) => {
    return new Promise((resolve) => {
      setDialog({
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        variant,
        icon,
        resolve: (val) => {
          setDialog(null);
          resolve(val);
        },
      });
    });
  }, []);

  const showAlert = useCallback(({
    title = 'Alert',
    message = '',
    confirmText = 'OK',
    variant = 'info',
    icon = null,
  }) => {
    return new Promise((resolve) => {
      setDialog({
        type: 'alert',
        title,
        message,
        confirmText,
        variant,
        icon,
        resolve: () => {
          setDialog(null);
          resolve(true);
        },
      });
    });
  }, []);

  const contextValue = useMemo(() => ({
    showConfirm,
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }), [showConfirm, showAlert, showSuccess, showError, showWarning, showInfo]);

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
      <DialogContainer dialog={dialog} />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </DialogContext.Provider>
  );
}
