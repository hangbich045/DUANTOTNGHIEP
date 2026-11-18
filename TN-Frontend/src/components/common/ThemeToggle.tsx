'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface ThemeToggleProps {
  /** 'icon': nút vuông gọn cho thanh điều hướng & sidebar; 'pill': có nhãn Sáng/Tối */
  variant?: 'icon' | 'pill';
  className?: string;
}

export default function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const { isLight, mounted, toggleTheme } = useTheme();

  // Tránh lệch SSR/Client trước khi hydrate
  const showLight = mounted ? isLight : false;
  const label = showLight ? 'Chuyển sang giao diện Tối (Dark Mode)' : 'Chuyển sang giao diện Sáng (Light Mode)';

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        className={`theme-toggle-btn inline-flex items-center space-x-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer select-none ${
          showLight
            ? 'bg-white border-slate-200 text-slate-700 hover:border-[#284F9E] hover:text-[#284F9E] shadow-sm'
            : 'bg-[#141724] border-[#2B3553] text-[#CBD5E1] hover:border-[#ECC354]/60 hover:text-white'
        } ${className}`}
      >
        {showLight ? (
          <>
            <Moon className="w-4 h-4 text-[#284F9E] shrink-0 transition-transform duration-200" />
            <span>Tối</span>
          </>
        ) : (
          <>
            <Sun className="w-4 h-4 text-[#ECC354] shrink-0 transition-transform duration-200" />
            <span>Sáng</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`theme-toggle-btn relative p-2.5 rounded-xl border transition-all duration-200 cursor-pointer shrink-0 flex items-center justify-center ${
        showLight
          ? 'bg-white border-slate-200 text-[#284F9E] hover:bg-blue-50 hover:border-[#284F9E]/60 shadow-sm'
          : 'bg-[#141724] border-[#2B3553] text-[#ECC354] hover:bg-[#1B2032] hover:border-[#ECC354]/60'
      } ${className}`}
    >
      {showLight ? (
        <Moon className="w-5 h-5 transition-transform duration-200 hover:-rotate-12" />
      ) : (
        <Sun className="w-5 h-5 transition-transform duration-200 hover:rotate-45" />
      )}
    </button>
  );
}
