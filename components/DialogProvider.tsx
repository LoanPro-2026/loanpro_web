"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type DialogType = 'success' | 'error' | 'warning' | 'info';

type AlertDialog = {
  kind: 'alert';
  title: string;
  message: string;
  type: DialogType;
  confirmText: string;
  resolve: () => void;
};

type ConfirmDialog = {
  kind: 'confirm';
  title: string;
  message: string;
  type: DialogType;
  confirmText: string;
  cancelText: string;
  resolve: (value: boolean) => void;
};

type PromptDialog = {
  kind: 'prompt';
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText: string;
  cancelText: string;
  required: boolean;
  resolve: (value: string | null) => void;
};

type DialogState = AlertDialog | ConfirmDialog | PromptDialog;

interface DialogContextType {
  alert: (message: string, options?: { title?: string; type?: DialogType; confirmText?: string }) => Promise<void>;
  confirm: (
    message: string,
    options?: { title?: string; type?: DialogType; confirmText?: string; cancelText?: string }
  ) => Promise<boolean>;
  prompt: (
    message: string,
    options?: {
      title?: string;
      placeholder?: string;
      defaultValue?: string;
      confirmText?: string;
      cancelText?: string;
      required?: boolean;
    }
  ) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType>({
  alert: async () => {},
  confirm: async () => false,
  prompt: async () => null,
});

export function useDialog() {
  return useContext(DialogContext);
}

const typeStyles: Record<DialogType, { iconBg: string; iconText: string; button: string; icon: React.ElementType }> = {
  success: {
    iconBg: 'bg-green-100',
    iconText: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700',
    icon: CheckCircleIcon,
  },
  error: {
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
    button: 'bg-red-600 hover:bg-red-700',
    icon: XCircleIcon,
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700',
    icon: ExclamationTriangleIcon,
  },
  info: {
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
    icon: InformationCircleIcon,
  },
};

export default function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const queueRef = useRef<DialogState[]>([]);

  const enqueue = useCallback((nextDialog: DialogState) => {
    setDialog((current) => {
      if (!current) {
        if (nextDialog.kind === 'prompt') {
          setPromptValue(nextDialog.defaultValue || '');
        }
        return nextDialog;
      }
      queueRef.current.push(nextDialog);
      return current;
    });
  }, []);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift() || null;
    if (next?.kind === 'prompt') {
      setPromptValue(next.defaultValue || '');
    }
    setDialog(next);
  }, []);

  const alert = useCallback<DialogContextType['alert']>(
    (message, options) =>
      new Promise<void>((resolve) => {
        enqueue({
          kind: 'alert',
          title: options?.title || 'Notice',
          message,
          type: options?.type || 'info',
          confirmText: options?.confirmText || 'OK',
          resolve,
        });
      }),
    [enqueue]
  );

  const confirm = useCallback<DialogContextType['confirm']>(
    (message, options) =>
      new Promise<boolean>((resolve) => {
        enqueue({
          kind: 'confirm',
          title: options?.title || 'Please Confirm',
          message,
          type: options?.type || 'warning',
          confirmText: options?.confirmText || 'Confirm',
          cancelText: options?.cancelText || 'Cancel',
          resolve,
        });
      }),
    [enqueue]
  );

  const prompt = useCallback<DialogContextType['prompt']>(
    (message, options) =>
      new Promise<string | null>((resolve) => {
        enqueue({
          kind: 'prompt',
          title: options?.title || 'Input Required',
          message,
          placeholder: options?.placeholder,
          defaultValue: options?.defaultValue,
          confirmText: options?.confirmText || 'Submit',
          cancelText: options?.cancelText || 'Cancel',
          required: options?.required ?? false,
          resolve,
        });
      }),
    [enqueue]
  );

  const handleAlertClose = () => {
    if (!dialog || dialog.kind !== 'alert') return;
    dialog.resolve();
    showNext();
  };

  const handleConfirm = (value: boolean) => {
    if (!dialog || dialog.kind !== 'confirm') return;
    dialog.resolve(value);
    showNext();
  };

  const handlePromptCancel = () => {
    if (!dialog || dialog.kind !== 'prompt') return;
    dialog.resolve(null);
    showNext();
  };

  const handlePromptSubmit = () => {
    if (!dialog || dialog.kind !== 'prompt') return;
    if (dialog.required && !promptValue.trim()) return;
    dialog.resolve(promptValue.trim() ? promptValue : dialog.required ? '' : null);
    showNext();
  };

  const resolvedType: DialogType = dialog && 'type' in dialog ? dialog.type : 'info';
  const style = typeStyles[resolvedType];
  const Icon = style.icon;

  return (
    <DialogContext.Provider value={{ alert, confirm, prompt }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${style.iconBg}`}>
                    <Icon className={`w-6 h-6 ${style.iconText}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{dialog.title}</h3>
                  </div>
                </div>
                {dialog.kind === 'alert' && (
                  <button
                    onClick={handleAlertClose}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
                    aria-label="Close"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-700 whitespace-pre-line leading-relaxed">{dialog.message}</p>

              {dialog.kind === 'prompt' && (
                <input
                  autoFocus
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  placeholder={dialog.placeholder || ''}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePromptSubmit();
                    }
                  }}
                />
              )}
            </div>

            <div className="p-6 pt-0 flex justify-end gap-3">
              {dialog.kind === 'confirm' && (
                <button
                  onClick={() => handleConfirm(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-5 rounded-lg transition-colors"
                >
                  {dialog.cancelText}
                </button>
              )}

              {dialog.kind === 'prompt' && (
                <button
                  onClick={handlePromptCancel}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-5 rounded-lg transition-colors"
                >
                  {dialog.cancelText}
                </button>
              )}

              {dialog.kind === 'alert' && (
                <button
                  onClick={handleAlertClose}
                  className={`${style.button} text-white font-semibold py-2.5 px-6 rounded-lg transition-colors`}
                >
                  {dialog.confirmText}
                </button>
              )}

              {dialog.kind === 'confirm' && (
                <button
                  onClick={() => handleConfirm(true)}
                  className={`${style.button} text-white font-semibold py-2.5 px-6 rounded-lg transition-colors`}
                >
                  {dialog.confirmText}
                </button>
              )}

              {dialog.kind === 'prompt' && (
                <button
                  onClick={handlePromptSubmit}
                  className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors ${
                    dialog.required && !promptValue.trim() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={dialog.required && !promptValue.trim()}
                >
                  {dialog.confirmText}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
