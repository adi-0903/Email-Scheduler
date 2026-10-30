import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { ToastItem } from '../types';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-20 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border text-xs sm:text-sm font-medium transition-all duration-200 animate-in slide-in-from-top-3 fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200/80 text-emerald-900 shadow-emerald-500/10'
              : 'bg-rose-50 border-rose-200/80 text-rose-900 shadow-rose-500/10'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 text-slate-800 leading-snug">{toast.message}</div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss toast"
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
