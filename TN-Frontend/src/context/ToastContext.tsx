'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { isLight } = useTheme();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertOctagon className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getToastStyles = (type: ToastType) => {
    if (isLight) {
      switch (type) {
        case 'success':
          return {
            container: 'bg-white border-emerald-200 border-l-4 border-l-emerald-500 text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.14)]',
            iconBox: 'bg-emerald-50 border border-emerald-200 text-emerald-600',
            badgeText: 'Thành công',
            badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          };
        case 'error':
          return {
            container: 'bg-white border-rose-200 border-l-4 border-l-rose-500 text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.14)]',
            iconBox: 'bg-rose-50 border border-rose-200 text-rose-600',
            badgeText: 'Lỗi',
            badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          };
        case 'warning':
          return {
            container: 'bg-white border-amber-200 border-l-4 border-l-amber-500 text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.14)]',
            iconBox: 'bg-amber-50 border border-amber-200 text-amber-600',
            badgeText: 'Cảnh báo',
            badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          };
        case 'info':
        default:
          return {
            container: 'bg-white border-blue-200 border-l-4 border-l-[#284F9E] text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.14)]',
            iconBox: 'bg-blue-50 border border-blue-200 text-[#284F9E]',
            badgeText: 'Thông tin',
            badgeColor: 'bg-blue-50 text-[#284F9E] border-blue-200',
          };
      }
    }
    switch (type) {
      case 'success':
        return {
          container: 'bg-[#0E1B19] border-[#059669] border-l-4 border-l-[#10B981] text-white shadow-[0_12px_36px_rgba(0,0,0,0.85)]',
          iconBox: 'bg-[#064E3B] border border-[#10B981] text-[#34D399]',
          badgeText: 'Thành công',
          badgeColor: 'bg-[#064E3B] text-[#34D399] border-[#10B981]',
        };
      case 'error':
        return {
          container: 'bg-[#1F1216] border-[#DC2626] border-l-4 border-l-[#EF4444] text-white shadow-[0_12px_36px_rgba(0,0,0,0.85)]',
          iconBox: 'bg-[#7F1D1D] border border-[#EF4444] text-[#F87171]',
          badgeText: 'Lỗi',
          badgeColor: 'bg-[#7F1D1D] text-[#F87171] border-[#EF4444]',
        };
      case 'warning':
        return {
          container: 'bg-[#20180B] border-[#D97706] border-l-4 border-l-[#F59E0B] text-white shadow-[0_12px_36px_rgba(0,0,0,0.85)]',
          iconBox: 'bg-[#78350F] border border-[#F59E0B] text-[#FBBF24]',
          badgeText: 'Cảnh báo',
          badgeColor: 'bg-[#78350F] text-[#FBBF24] border-[#F59E0B]',
        };
      case 'info':
      default:
        return {
          container: 'bg-[#101828] border-[#2563EB] border-l-4 border-l-[#3B82F6] text-white shadow-[0_12px_36px_rgba(0,0,0,0.85)]',
          iconBox: 'bg-[#1E3A8A] border border-[#3B82F6] text-[#60A5FA]',
          badgeText: 'Thông tin',
          badgeColor: 'bg-[#1E3A8A] text-[#60A5FA] border-[#3B82F6]',
        };
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container portal - Solid background, high contrast, responsive */}
      <div className="fixed bottom-4 sm:bottom-6 right-0 sm:right-6 left-0 sm:left-auto mx-auto sm:mx-0 z-50 flex flex-col space-y-3 px-4 sm:px-0 max-w-md w-full pointer-events-none">
        {toasts.map((t) => {
          const style = getToastStyles(t.type);
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start space-x-3.5 p-4 rounded-2xl border animate-in slide-in-from-bottom duration-250 ${style.container}`}
            >
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${style.iconBox}`}>
                {getIcon(t.type)}
              </div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${style.badgeColor}`}>
                    {style.badgeText}
                  </span>
                </div>
                <p className={`text-sm font-semibold leading-relaxed ${isLight ? 'text-slate-800' : 'text-white'}`}>{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 mt-0.5 ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                    : 'bg-black/40 hover:bg-white/20 text-gray-400 hover:text-white'
                }`}
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
