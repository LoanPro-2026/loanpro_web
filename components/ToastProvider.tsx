"use client";
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import Toast from './Toast';
import { toUserFriendlyToastError } from '@/lib/toastErrorMessage';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: unknown, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: unknown, type: ToastType = 'info') => {
    const normalizedMessage =
      type === 'error'
        ? toUserFriendlyToastError(message)
        : typeof message === 'string'
          ? message
          : String(message ?? '');

    setToast({
      message: normalizedMessage || (type === 'error' ? 'Something went wrong. Please try again.' : ''),
      type,
    });
  }, []);

  const handleClose = () => setToast(null);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={handleClose} />
      )}
    </ToastContext.Provider>
  );
} 