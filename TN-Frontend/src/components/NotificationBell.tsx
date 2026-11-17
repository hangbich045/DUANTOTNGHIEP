'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  X,
  ExternalLink,
  Calendar,
  Camera,
  CheckSquare,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldAlert,
  Inbox,
  Filter,
} from 'lucide-react';
import api from '@/lib/api';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell({ align = 'right' }: { align?: 'left' | 'right' }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNREAD'>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?limit=25');
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  // Lọc thông báo theo tab
  const displayedNotifications = filterMode === 'UNREAD'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  // Lấy icon trực quan theo loại thông báo
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'TASK_COMPLETED':
      case 'TASK_SUBMITTED':
        return <CheckSquare className="w-4 h-4 text-emerald-400" />;
      case 'TASK_REVISION_REQUESTED':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'BORROW_REQUEST_APPROVED':
      case 'BORROW_REQUEST_CREATED':
      case 'EQUIPMENT_HANDED_OVER':
      case 'EQUIPMENT_RETURNED':
        return <Camera className="w-4 h-4 text-blue-400" />;
      case 'BORROW_OVERDUE':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'STUDIO_BOOKING_APPROVED':
      case 'STUDIO_BOOKING_REQUEST':
      case 'STUDIO_BOOKING_REJECTED':
        return <Calendar className="w-4 h-4 text-purple-400" />;
      case 'DUTY_PERIOD_OPEN':
      case 'DUTY_REGISTRATION_SUBMITTED':
      case 'DUTY_SCHEDULE_CONFIRMED':
        return <Clock className="w-4 h-4 text-amber-300" />;
      default:
        return <Bell className="w-4 h-4 text-brand-primary" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút Chuông thông báo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all cursor-pointer ${
          isOpen
            ? 'bg-[#1E253B] border-[#3B82F6] text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
            : 'bg-[#141724] border-[#2B3553] hover:border-[#3B82F6] hover:bg-[#1B2032] text-[#CBD5E1] hover:text-white'
        }`}
        title="Thông báo hệ thống"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-[#DC2626] text-[10px] font-black text-white shadow-lg shadow-red-900/80 ring-2 ring-[#0D101A] animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN THÔNG BÁO SOLID BACKGROUND HOÀN TOÀN (100% ĐẶC, KHÔNG TRONG SUỐT, NỔI BẬT Z-INDEX) */}
      {isOpen && (
        <div
          className={`fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full mt-2 w-auto sm:w-[420px] max-w-[calc(100vw-1.5rem)] rounded-2xl border-2 border-[#2B3553] bg-[#0D101A] shadow-[0_25px_60px_rgba(0,0,0,0.95)] z-[100] max-h-[min(580px,85vh)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            align === 'left' ? 'sm:left-0 sm:right-auto' : 'sm:right-0 sm:left-auto'
          }`}
        >
          {/* Header đặc, độ tương phản cao */}
          <div className="bg-[#151928] px-4 py-3.5 border-b border-[#2B3553] shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-brand-accent" />
                <span className="text-sm font-extrabold text-white tracking-wide">Thông báo</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#1E3A8A] text-[#93C5FD] border border-[#3B82F6] shadow-sm">
                    {unreadCount} chưa đọc
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1.5">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-[#60A5FA] hover:text-white font-semibold flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-[#1E293B] border border-transparent hover:border-[#3B82F6] transition-all cursor-pointer"
                    title="Đánh dấu tất cả thông báo là đã đọc"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Đã đọc tất cả</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-studio-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Đóng thông báo (Esc)"
                  aria-label="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Thanh lọc nhanh: Tất cả / Chưa đọc */}
            <div className="flex items-center space-x-2 mt-3 pt-2.5 border-t border-[#23293D]">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'ALL'
                    ? 'bg-[#2563EB] text-white border border-[#3B82F6] shadow-sm'
                    : 'bg-[#0F121C] text-[#94A3B8] hover:text-white hover:bg-[#1A1F30] border border-[#242A3D]'
                }`}
              >
                Tất cả ({notifications.length})
              </button>
              <button
                onClick={() => setFilterMode('UNREAD')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'UNREAD'
                    ? 'bg-[#2563EB] text-white border border-[#3B82F6] shadow-sm'
                    : 'bg-[#0F121C] text-[#94A3B8] hover:text-white hover:bg-[#1A1F30] border border-[#242A3D]'
                }`}
              >
                Chưa đọc ({unreadCount})
              </button>
            </div>
          </div>

          {/* Danh sách thông báo dạng Card với màu nền đặc, tương phản cao, cuộn độc lập */}
          <div className="flex-1 max-h-[380px] overflow-y-auto overscroll-contain p-2.5 space-y-2.5 bg-[#0A0C14] divide-y-0">
            {displayedNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <Inbox className="w-10 h-10 text-gray-500 mx-auto opacity-50" />
                <p className="text-white font-bold text-sm">
                  {filterMode === 'UNREAD' ? 'Không có thông báo chưa đọc nào' : 'Bạn chưa có thông báo nào'}
                </p>
                <p className="text-xs text-[#94A3B8]">
                  Các cập nhật về mượn thiết bị, đặt phòng, phân công việc và lịch trực sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              displayedNotifications.map((n) => {
                const isUnread = !n.isRead;

                return (
                  <div
                    key={n.id}
                    onClick={() => isUnread && handleMarkAsRead(n.id)}
                    className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isUnread
                        ? 'bg-[#1C243B] hover:bg-[#232E4A] border-[#374567] hover:border-[#4B5E8C] border-l-4 border-l-[#3B82F6] shadow-[0_4px_16px_rgba(0,0,0,0.6)]'
                        : 'bg-[#11141E] hover:bg-[#161B29] border-[#1F2433] hover:border-[#2C3348] border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon nhận diện loại thông báo */}
                      <div
                        className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                          isUnread
                            ? 'bg-[#111728] border-[#3B82F6] shadow-inner'
                            : 'bg-[#0D0F17] border-[#1F2433] opacity-75'
                        }`}
                      >
                        {getNotificationIcon(n.type)}
                      </div>

                      {/* Nội dung thông báo */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-[#3B82F6] shrink-0 shadow-[0_0_8px_#3B82F6]" />
                            )}
                            <h4
                              className={`text-xs leading-snug line-clamp-2 ${
                                isUnread ? 'text-white font-bold' : 'text-[#CBD5E1] font-medium'
                              }`}
                            >
                              {n.title}
                            </h4>
                          </div>

                          {isUnread && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#2563EB] text-white border border-[#60A5FA] shadow-sm">
                              Mới
                            </span>
                          )}
                        </div>

                        <p
                          className={`text-xs leading-relaxed line-clamp-2 ${
                            isUnread ? 'text-[#E2E8F0] font-normal' : 'text-[#8892A4]'
                          }`}
                        >
                          {n.message}
                        </p>

                        <div className="flex items-center justify-between pt-1.5">
                          <span className="text-[10px] text-[#94A3B8] font-medium flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-[#64748B]" />
                            <span>
                              {new Date(n.createdAt).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </span>

                          {n.link && (
                            <Link
                              href={n.link}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isUnread) handleMarkAsRead(n.id);
                                setIsOpen(false);
                              }}
                              className={`text-[11px] flex items-center space-x-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                isUnread
                                  ? 'bg-[#161F33] hover:bg-[#2563EB] text-[#60A5FA] hover:text-white border border-[#3B82F6] font-bold shadow-sm'
                                  : 'bg-[#0F131D] hover:bg-[#1E293B] text-[#94A3B8] hover:text-white border border-[#252B3C] hover:border-[#3B82F6] font-medium'
                              }`}
                            >
                              <span>Xem chi tiết</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer đặc, có nút xem toàn bộ trang */}
          <div className="bg-[#151928] px-4 py-2.5 border-t border-[#2B3553] flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#94A3B8] font-medium">
              Hiển thị {displayedNotifications.length} thông báo gần nhất
            </span>

            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-brand-accent hover:text-[#FDE047] hover:underline flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <span>Xem tất cả</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
