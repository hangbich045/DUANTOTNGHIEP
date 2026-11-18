'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export interface DatePickerVNProps {
  /** Giá trị ngày dạng chuẩn ISO YYYY-MM-DD (hoặc chuỗi rỗng '' nếu chưa chọn) */
  value: string;
  /** Callback trả về chuỗi YYYY-MM-DD (hoặc '' khi xóa nếu clearable=true) */
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Đánh dấu màu nhẹ cho Chủ nhật (Studio nghỉ CN với USER thường) */
  highlightSunday?: boolean;
  /** Giới hạn ngày tối thiểu (YYYY-MM-DD) */
  minDate?: string;
  /** Giới hạn ngày tối đa (YYYY-MM-DD) */
  maxDate?: string;
  /** Cho phép xóa trống ngày (dùng cho các bộ lọc Từ ngày / Đến ngày hoặc ngày tùy chọn) */
  clearable?: boolean;
  /** Tuỳ chọn nút kích hoạt riêng (ví dụ nút chọn khoảng tuần ở Bảng lịch trực) */
  renderTrigger?: (args: { open: boolean; toggle: () => void }) => React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

const WEEKDAYS_VN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const FULL_WEEKDAYS_VN = [
  'Chủ nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

const POPUP_WIDTH = 296;
const POPUP_ESTIMATED_HEIGHT = 355;

function parseIsoToLocal(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

function toIsoString(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDisplayVN(iso: string): string {
  const dt = parseIsoToLocal(iso);
  if (!dt) return '';
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
}

function parseDisplayVNToIso(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const d = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const y = parseInt(match[3], 10);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return toIsoString(dt);
}

export default function DatePickerVN({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  className = '',
  inputClassName = '',
  highlightSunday = false,
  minDate,
  maxDate,
  clearable = false,
  renderTrigger,
  disabled = false,
  required = false,
  id,
}: DatePickerVNProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const { isLight } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [inputText, setInputText] = useState<string>(() => toDisplayVN(value));
  const [popupCoords, setPopupCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedDateObj = useMemo(() => parseIsoToLocal(value), [value]);
  const todayIso = useMemo(() => toIsoString(new Date()), []);
  const tomorrowIso = useMemo(() => {
    const dt = new Date();
    dt.setDate(dt.getDate() + 1);
    return toIsoString(dt);
  }, []);

  const [viewYear, setViewYear] = useState<number>(() => {
    const dt = parseIsoToLocal(value) || new Date();
    return dt.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const dt = parseIsoToLocal(value) || new Date();
    return dt.getMonth(); // 0..11
  });

  // Kiểm tra ngày có nằm ngoài giới hạn minDate / maxDate không
  const isOutOfBounds = useCallback(
    (iso: string) => {
      if (!iso) return false;
      if (minDate && /^\d{4}-\d{2}-\d{2}$/.test(minDate) && iso < minDate) return true;
      if (maxDate && /^\d{4}-\d{2}-\d{2}$/.test(maxDate) && iso > maxDate) return true;
      return false;
    },
    [minDate, maxDate]
  );

  // Đồng bộ inputText khi prop value thay đổi từ bên ngoài
  useEffect(() => {
    setInputText(toDisplayVN(value));
    const dt = parseIsoToLocal(value);
    if (dt) {
      setViewYear(dt.getFullYear());
      setViewMonth(dt.getMonth());
    }
  }, [value]);

  // Tính tọa độ cố định (fixed) cho Portal popup để không bao giờ bị cắt bởi overflow hay tràn màn hình
  const updatePopupPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const actualHeight = popupRef.current?.offsetHeight || POPUP_ESTIMATED_HEIGHT;

    let top = rect.bottom + 8;
    if (top + actualHeight > vh - 12 && rect.top - actualHeight - 8 >= 12) {
      top = rect.top - actualHeight - 8;
    } else if (top + actualHeight > vh - 12) {
      top = Math.max(12, vh - actualHeight - 12);
    }

    let left = rect.left;
    if (left + POPUP_WIDTH > vw - 12) {
      left = Math.max(12, vw - POPUP_WIDTH - 12);
    }
    if (left < 12) left = 12;

    setPopupCoords({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePopupPosition();
    const raf = requestAnimationFrame(updatePopupPosition);

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!popupRef.current || !popupRef.current.contains(target))
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('resize', updatePopupPosition);
    window.addEventListener('scroll', updatePopupPosition, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePopupPosition);
      window.removeEventListener('scroll', updatePopupPosition, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, updatePopupPosition]);

  // Tạo lưới 42 ngày (6 tuần, bắt đầu từ Thứ Hai)
  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // 0 = T2, ..., 6 = CN
    const startDate = new Date(viewYear, viewMonth, 1 - startOffset);

    const days: {
      date: Date;
      iso: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isSunday: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }[] = [];

    for (let i = 0; i < 42; i++) {
      const dt = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const iso = toIsoString(dt);
      days.push({
        date: dt,
        iso,
        dayNumber: dt.getDate(),
        isCurrentMonth: dt.getMonth() === viewMonth && dt.getFullYear() === viewYear,
        isSunday: dt.getDay() === 0,
        isToday: iso === todayIso,
        isSelected: iso === value,
        isDisabled: isOutOfBounds(iso),
      });
    }
    return days;
  }, [viewYear, viewMonth, value, todayIso, isOutOfBounds]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (iso: string) => {
    if (isOutOfBounds(iso)) return;
    onChange(iso);
    setInputText(toDisplayVN(iso));
    setOpen(false);
  };

  const handleQuickSelect = (iso: string) => {
    if (isOutOfBounds(iso)) return;
    handleSelectDay(iso);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange('');
    setInputText('');
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/[^\d/]/g, '').slice(0, 10);
    setInputText(cleaned);

    if (cleaned === '' && clearable) {
      onChange('');
      return;
    }

    if (cleaned.length === 10) {
      const parsedIso = parseDisplayVNToIso(cleaned);
      if (parsedIso && !isOutOfBounds(parsedIso)) {
        onChange(parsedIso);
      }
    }
  };

  const handleInputBlur = () => {
    if (inputText.trim() === '' && clearable) {
      if (value !== '') onChange('');
      setInputText('');
      return;
    }
    const parsedIso = parseDisplayVNToIso(inputText);
    if (parsedIso && !isOutOfBounds(parsedIso)) {
      if (parsedIso !== value) {
        onChange(parsedIso);
      }
      setInputText(toDisplayVN(parsedIso));
    } else {
      setInputText(toDisplayVN(value));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputBlur();
      setOpen(false);
    }
  };

  const weekdayLabel = selectedDateObj ? FULL_WEEKDAYS_VN[selectedDateObj.getDay()] : '';
  const todayDisabled = isOutOfBounds(todayIso);
  const tomorrowDisabled = isOutOfBounds(tomorrowIso);

  const popupContent = open ? (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        top: `${popupCoords.top}px`,
        left: `${popupCoords.left}px`,
        width: `${POPUP_WIDTH}px`,
      }}
      className={`rounded-2xl border p-4 z-[9999] animate-in fade-in zoom-in-95 duration-150 select-none ${
        isLight
          ? 'bg-white border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.16)]'
          : 'bg-[#161822] border-white/15 shadow-2xl shadow-black/80'
      }`}
      role="dialog"
      aria-label="Lịch chọn ngày"
    >
      {/* Header tháng / năm */}
      <div className={`flex items-center justify-between mb-3 pb-2.5 border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <button
          type="button"
          onClick={handlePrevMonth}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isLight
              ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              : 'hover:bg-white/10 text-studio-muted hover:text-white'
          }`}
          title="Tháng trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className={`text-xs font-extrabold tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Tháng {String(viewMonth + 1).padStart(2, '0')} / {viewYear}
          </div>
          {weekdayLabel && value ? (
            <div className="text-[10px] text-brand-primary font-semibold mt-0.5">
              Đang chọn: {weekdayLabel}, {toDisplayVN(value)}
            </div>
          ) : (
            <div className={`text-[10px] font-medium mt-0.5 ${isLight ? 'text-slate-500' : 'text-studio-muted'}`}>
              Chưa chọn ngày
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isLight
              ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              : 'hover:bg-white/10 text-studio-muted hover:text-white'
          }`}
          title="Tháng sau"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Hàng thứ trong tuần (T2 -> CN) */}
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAYS_VN.map((day, idx) => (
          <div
            key={day}
            className={`text-center text-[10px] font-bold py-1 uppercase ${
              idx === 6
                ? isLight ? 'text-rose-600' : 'text-rose-400/90'
                : isLight ? 'text-slate-500' : 'text-studio-muted'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Lưới ngày */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell) => {
          let btnClass =
            'h-8 w-full rounded-lg text-xs font-semibold flex items-center justify-center transition-all ';

          if (cell.isDisabled) {
            btnClass += isLight
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-studio-muted/25 cursor-not-allowed opacity-45';
          } else if (cell.isSelected) {
            btnClass +=
              'bg-brand-primary text-white font-extrabold shadow-md shadow-brand-primary/35 ring-1 ring-white/20 cursor-pointer';
          } else if (!cell.isCurrentMonth) {
            btnClass += isLight
              ? 'text-slate-300 hover:bg-slate-100 hover:text-slate-600 cursor-pointer'
              : 'text-studio-muted/30 hover:bg-white/5 hover:text-studio-muted/70 cursor-pointer';
          } else if (cell.isToday) {
            btnClass += isLight
              ? 'bg-amber-50 text-amber-700 font-bold ring-1 ring-amber-400 hover:bg-amber-100 cursor-pointer'
              : 'bg-amber-500/15 text-amber-300 font-bold ring-1 ring-amber-400/60 hover:bg-amber-500/25 cursor-pointer';
          } else if (cell.isSunday && highlightSunday) {
            btnClass += isLight
              ? 'text-rose-600 hover:bg-rose-50 cursor-pointer'
              : 'text-rose-400/80 hover:bg-rose-500/15 cursor-pointer';
          } else {
            btnClass += isLight
              ? 'text-slate-700 hover:bg-blue-50 hover:text-[#284F9E] cursor-pointer'
              : 'text-white/90 hover:bg-white/10 hover:text-white cursor-pointer';
          }

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={cell.isDisabled}
              onClick={() => handleSelectDay(cell.iso)}
              title={
                cell.isDisabled
                  ? `${toDisplayVN(cell.iso)} (Ngoài phạm vi cho phép)`
                  : cell.isSunday && highlightSunday
                  ? `${toDisplayVN(cell.iso)} (Chủ nhật - Studio nghỉ)`
                  : toDisplayVN(cell.iso)
              }
              className={btnClass}
            >
              {cell.dayNumber}
            </button>
          );
        })}
      </div>

      {/* Nút chọn nhanh */}
      <div className={`mt-3 pt-2.5 border-t flex items-center justify-between gap-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            disabled={todayDisabled}
            onClick={() => handleQuickSelect(todayIso)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isLight
                ? 'bg-slate-50 hover:bg-blue-50 hover:text-[#284F9E] text-slate-700 border-slate-200'
                : 'bg-white/5 hover:bg-brand-primary/20 hover:text-brand-primary text-white/90 border-white/10'
            }`}
          >
            Hôm nay
          </button>
          <button
            type="button"
            disabled={tomorrowDisabled}
            onClick={() => handleQuickSelect(tomorrowIso)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isLight
                ? 'bg-slate-50 hover:bg-blue-50 hover:text-[#284F9E] text-slate-700 border-slate-200'
                : 'bg-white/5 hover:bg-brand-primary/20 hover:text-brand-primary text-white/90 border-white/10'
            }`}
          >
            Ngày mai
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`p-1 rounded-lg transition-colors cursor-pointer ${
            isLight
              ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              : 'text-studio-muted hover:text-white hover:bg-white/10'
          }`}
          title="Đóng lịch"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {renderTrigger ? (
        renderTrigger({
          open,
          toggle: () => !disabled && setOpen((prev) => !prev),
        })
      ) : (
        <div className="relative flex items-center w-full">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            value={inputText}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            onFocus={() => !disabled && setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete="off"
            aria-label="Chọn ngày theo định dạng dd/mm/yyyy"
            className={`w-full min-w-[155px] border rounded-xl pl-3.5 ${
              clearable && value ? 'pr-16' : 'pr-10'
            } py-2 text-xs font-semibold tracking-wide focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isLight
                ? 'bg-white border-slate-300 hover:border-[#284F9E] focus:border-[#284F9E] text-slate-900 placeholder:text-slate-400'
                : 'bg-black/50 border-white/15 hover:border-brand-primary/60 focus:border-brand-primary text-white placeholder:text-studio-muted/60'
            } ${inputClassName}`}
          />
          <div className="absolute right-1.5 flex items-center space-x-0.5">
            {clearable && value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                title="Xóa ngày đã chọn"
                className="p-1 rounded-lg text-studio-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setOpen((prev) => !prev)}
              title="Mở lịch chọn ngày"
              className="p-1.5 rounded-lg text-brand-primary hover:bg-brand-primary/15 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {mounted && popupContent && createPortal(popupContent, document.body)}
    </div>
  );
}
