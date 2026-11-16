'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Clock,
  ExternalLink,
  Calendar,
  Camera,
  CheckSquare,
  AlertTriangle,
  ShieldAlert,
  Inbox,
  Filter,
  Search,
  RefreshCcw,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast('Vui lòng đăng nhập để xem thông báo', 'warning');
        router.push('/auth/login');
      } else {
        fetchNotifications();
      }
    }
  }, [user, authLoading, router]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=100');
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tải thông báo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      toast('Đã đánh dấu thông báo là đã đọc', 'success');
    } catch (err: any) {
      toast(err.message || 'Lỗi khi cập nhật trạng thái', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast('Đã đánh dấu tất cả thông báo là đã đọc', 'success');
    } catch (err: any) {
      toast(err.message || 'Lỗi khi cập nhật trạng thái', 'error');
    }
  };

  // Lọc theo tab và tìm kiếm
  const filteredNotifications = notifications.filter((n) => {
    if (filterTab === 'UNREAD' && n.isRead) return false;
    if (filterTab === 'READ' && !n.isRead) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(term);
      const matchMsg = n.message.toLowerCase().includes(term);
      return matchTitle || matchMsg;
    }
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'TASK_COMPLETED':
      case 'TASK_SUBMITTED':
        return <CheckSquare className="w-5 h-5 text-emerald-400" />;
      case 'TASK_REVISION_REQUESTED':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'BORROW_REQUEST_APPROVED':
      case 'BORROW_REQUEST_CREATED':
      case 'EQUIPMENT_HANDED_OVER':
      case 'EQUIPMENT_RETURNED':
        return <Camera className="w-5 h-5 text-blue-400" />;
      case 'BORROW_OVERDUE':
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      case 'STUDIO_BOOKING_APPROVED':
      case 'STUDIO_BOOKING_REQUEST':
      case 'STUDIO_BOOKING_REJECTED':
        return <Calendar className="w-5 h-5 text-purple-400" />;
      case 'DUTY_PERIOD_OPEN':
      case 'DUTY_REGISTRATION_SUBMITTED':
      case 'DUTY_SCHEDULE_CONFIRMED':
        return <Clock className="w-5 h-5 text-amber-300" />;
      default:
        return <Bell className="w-5 h-5 text-brand-primary" />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F111A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F111A] text-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Header Title đặc, tương phản cao */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141726] p-6 rounded-3xl border border-[#2B3553] shadow-xl">
          <div className="flex items-center space-x-3.5">
            <div className="p-3.5 bg-[#1E263D] rounded-2xl border border-[#3B82F6] text-[#ECC354] shadow-md shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-2xl font-black text-white tracking-tight">Hộp Thư Thông Báo</h1>
                {unreadCount > 0 && (
                  <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-[#1E3A8A] text-[#93C5FD] border border-[#3B82F6] shadow-sm">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <p className="text-xs text-[#94A3B8] mt-1">
                Theo dõi toàn bộ các sự kiện công việc, mượn trả thiết bị, đặt phòng Studio và lịch trực.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end sm:self-auto">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 border border-[#3B82F6] cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Đã đọc tất cả</span>
              </button>
            )}

            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="p-2.5 rounded-xl border border-[#2B3553] bg-[#1B2030] hover:bg-[#242A40] text-[#CBD5E1] hover:text-white transition-all cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Thanh công cụ lọc & Tìm kiếm */}
        <div className="bg-[#141726] p-4 rounded-2xl border border-[#2B3553] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
          {/* Bộ lọc tab */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'ALL'
                  ? 'bg-[#2563EB] text-white border border-[#3B82F6] shadow-sm'
                  : 'bg-[#1B2030] text-[#94A3B8] hover:text-white hover:bg-[#242A40] border border-[#2B3553]'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              onClick={() => setFilterTab('UNREAD')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'UNREAD'
                  ? 'bg-[#2563EB] text-white border border-[#3B82F6] shadow-sm'
                  : 'bg-[#1B2030] text-[#94A3B8] hover:text-white hover:bg-[#242A40] border border-[#2B3553]'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
            <button
              onClick={() => setFilterTab('READ')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'READ'
                  ? 'bg-[#2563EB] text-white border border-[#3B82F6] shadow-sm'
                  : 'bg-[#1B2030] text-[#94A3B8] hover:text-white hover:bg-[#242A40] border border-[#2B3553]'
              }`}
            >
              Đã đọc ({notifications.length - unreadCount})
            </button>
          </div>

          {/* Ô tìm kiếm từ khóa */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm nội dung thông báo..."
              className="w-full bg-[#1B2030] border border-[#2B3553] focus:border-[#3B82F6] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#64748B] focus:outline-none"
            />
          </div>
        </div>

        {/* Danh sách thông báo */}
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-[#141726] rounded-3xl border border-[#2B3553]">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-[#141726] rounded-3xl border border-[#2B3553]">
            <Inbox className="w-14 h-14 text-gray-500 mx-auto opacity-50" />
            <p className="text-white font-bold text-base">
              {searchTerm ? 'Không tìm thấy thông báo phù hợp' : 'Không có thông báo nào trong mục này'}
            </p>
            <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
              Khi có các cập nhật mới về nhiệm vụ, ca trực hoặc trạng thái đơn mượn phòng, hệ thống sẽ tự động hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((n) => {
              const isUnread = !n.isRead;

              return (
                <div
                  key={n.id}
                  onClick={() => isUnread && handleMarkAsRead(n.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isUnread
                      ? 'bg-[#1C243B] hover:bg-[#232D4A] border-[#374567] hover:border-[#4B5E8C] border-l-4 border-l-[#3B82F6] shadow-[0_6px_20px_rgba(0,0,0,0.6)]'
                      : 'bg-[#11141E] hover:bg-[#161A28] border-[#1F2433] hover:border-[#2C3348] border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Icon loại thông báo */}
                    <div
                      className={`p-3.5 rounded-2xl shrink-0 mt-0.5 border ${
                        isUnread
                          ? 'bg-[#111728] border-[#3B82F6] shadow-inner'
                          : 'bg-[#0D0F17] border-[#1F2433] opacity-75'
                      }`}
                    >
                      {getNotificationIcon(n.type)}
                    </div>

                    {/* Nội dung thông báo */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          {isUnread && (
                            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shrink-0 shadow-[0_0_8px_#3B82F6]" />
                          )}
                          <h3
                            className={`text-sm sm:text-base leading-snug ${
                              isUnread ? 'text-white font-extrabold' : 'text-[#CBD5E1] font-semibold'
                            }`}
                          >
                            {n.title}
                          </h3>
                        </div>

                        <div className="flex items-center space-x-2">
                          {isUnread && (
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#2563EB] text-white border border-[#60A5FA] shadow-sm">
                              Mới
                            </span>
                          )}
                          <span className="text-[11px] text-[#94A3B8] font-medium flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-[#64748B]" />
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
                        </div>
                      </div>

                      <p
                        className={`text-xs sm:text-sm leading-relaxed ${
                          isUnread ? 'text-[#E2E8F0] font-normal' : 'text-[#8892A4]'
                        }`}
                      >
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between pt-2">
                        <div>
                          {isUnread && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(n.id);
                              }}
                              className="text-xs text-[#94A3B8] hover:text-white flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-[#13192B] hover:bg-[#1E263D] border border-[#252E47] transition-all cursor-pointer font-semibold"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Đánh dấu đã đọc</span>
                            </button>
                          )}
                        </div>

                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isUnread) handleMarkAsRead(n.id);
                            }}
                            className={`text-xs flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                              isUnread
                                ? 'bg-[#161F33] hover:bg-[#2563EB] text-[#60A5FA] hover:text-white border border-[#3B82F6] font-bold shadow-sm'
                                : 'bg-[#0F131D] hover:bg-[#1E293B] text-[#94A3B8] hover:text-white border border-[#252B3C] hover:border-[#3B82F6] font-medium'
                            }`}
                          >
                            <span>Xem trang chi tiết</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

