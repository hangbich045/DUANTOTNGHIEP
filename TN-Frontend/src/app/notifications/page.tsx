'use strict';
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Search,
  RefreshCcw,
  Mail,
  MailCheck,
  MailWarning,
  Send,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  senderName?: string | null;
  recipientEmail?: string | null;
  emailStatus?: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  emailSentAt?: string | null;
  emailError?: string | null;
  emailRetryCount?: number;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

interface EmailLogStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  skipped: number;
}

interface SmtpStatusInfo {
  configured: boolean;
  connected: boolean;
  host: string;
  port: number;
  sender: string | null;
  frontendUrl: string;
  error: string | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [activeView, setActiveView] = useState<'INBOX' | 'EMAIL_LOGS'>('INBOX');

  // Personal Inbox state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Admin Email Logs state
  const [emailLogs, setEmailLogs] = useState<NotificationItem[]>([]);
  const [emailStats, setEmailStats] = useState<EmailLogStats>({ total: 0, sent: 0, failed: 0, pending: 0, skipped: 0 });
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatusInfo | null>(null);
  const [emailLoading, setEmailLoading] = useState<boolean>(false);
  const [emailStatusFilter, setEmailStatusFilter] = useState<'ALL' | 'SENT' | 'FAILED' | 'PENDING' | 'SKIPPED'>('ALL');
  const [emailSearch, setEmailSearch] = useState<string>('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendingAll, setResendingAll] = useState<boolean>(false);
  const [checkingSmtp, setCheckingSmtp] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
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
  }, [toast]);

  const fetchEmailLogs = useCallback(async () => {
    if (!isAdmin) return;
    setEmailLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (emailStatusFilter !== 'ALL') params.set('emailStatus', emailStatusFilter);
      if (emailSearch.trim()) params.set('search', emailSearch.trim());
      const res = await api.get(`/notifications/email-logs?${params.toString()}`);
      if (res.success && res.data) {
        setEmailLogs(res.data.items || []);
        if (res.data.stats) setEmailStats(res.data.stats);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tải lịch sử gửi email', 'error');
    } finally {
      setEmailLoading(false);
    }
  }, [isAdmin, emailStatusFilter, emailSearch, toast]);

  const checkSmtpConnection = useCallback(async (showToast = false) => {
    if (!isAdmin) return;
    setCheckingSmtp(true);
    try {
      const res = await api.get('/notifications/email-status');
      if (res.success && res.data) {
        setSmtpStatus(res.data.smtp || null);
        if (res.data.stats) setEmailStats(res.data.stats);
        if (showToast) {
          if (res.data.smtp?.connected) {
            toast('Kết nối máy chủ gửi email hoạt động bình thường', 'success');
          } else {
            toast(res.data.smtp?.error || 'Không thể kết nối máy chủ gửi email', 'error');
          }
        }
      }
    } catch (err: any) {
      if (showToast) toast(err.message || 'Lỗi khi kiểm tra máy chủ email', 'error');
    } finally {
      setCheckingSmtp(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast('Vui lòng đăng nhập để xem thông báo', 'warning');
        router.push('/auth/login');
      } else {
        fetchNotifications();
      }
    }
  }, [user, authLoading, router, fetchNotifications, toast]);

  useEffect(() => {
    if (isAdmin && activeView === 'EMAIL_LOGS') {
      fetchEmailLogs();
      if (!smtpStatus) {
        checkSmtpConnection(false);
      }
    }
  }, [isAdmin, activeView, fetchEmailLogs, smtpStatus, checkSmtpConnection]);

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

  const handleResendOne = async (id: string) => {
    setResendingId(id);
    try {
      const res = await api.post(`/notifications/${id}/resend-email`, {});
      if (res.success) {
        toast(res.message || 'Đã gửi lại email thành công', 'success');
      } else {
        toast(res.message || 'Gửi lại email chưa thành công', 'warning');
      }
      await fetchEmailLogs();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi gửi lại email', 'error');
    } finally {
      setResendingId(null);
    }
  };

  const handleResendAllFailed = async () => {
    setResendingAll(true);
    try {
      const res = await api.post('/notifications/resend-failed', { limit: 50 });
      toast(res.message || 'Đã xử lý gửi lại các email lỗi', res.data?.failed > 0 ? 'warning' : 'success');
      await fetchEmailLogs();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi gửi lại email lỗi', 'error');
    } finally {
      setResendingAll(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterTab === 'UNREAD' && n.isRead) return false;
    if (filterTab === 'READ' && !n.isRead) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return n.title.toLowerCase().includes(term) || n.message.toLowerCase().includes(term);
    }
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'TASK_COMPLETED':
      case 'TASK_SUBMITTED':
      case 'TASK_IN_PROGRESS':
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
      case 'STUDIO_BOOKING_RESCHEDULED':
      case 'STUDIO_BOOKING_CANCELLED':
      case 'STUDIO_USER_CHECKED_IN':
      case 'STUDIO_USAGE_CONFIRMED':
      case 'STUDIO_BOOKING_ABSENT':
        return <Calendar className="w-5 h-5 text-purple-400" />;
      case 'DUTY_PERIOD_OPEN':
      case 'DUTY_REGISTRATION_SUBMITTED':
      case 'DUTY_SCHEDULE_CONFIRMED':
      case 'DUTY_SCHEDULE_UPDATED':
        return <Clock className="w-5 h-5 text-amber-300" />;
      default:
        return <Bell className="w-5 h-5 text-brand-primary" />;
    }
  };

  const renderEmailStatusBadge = (status?: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <MailCheck className="w-3 h-3" />
            <span>Đã gửi email</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <MailWarning className="w-3 h-3" />
            <span>Gửi lỗi</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            <span>Đang gửi</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-studio-muted border border-white/10">
            <Mail className="w-3 h-3" />
            <span>Bỏ qua</span>
          </span>
        );
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
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141726] p-6 rounded-3xl border border-[#2B3553] shadow-xl">
          <div className="flex items-center space-x-3.5">
            <div className="p-3.5 bg-[#1E263D] rounded-2xl border border-[#3B82F6] text-[#ECC354] shadow-md shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h1 className="text-2xl font-black text-white tracking-tight">Hộp Thư Thông Báo</h1>
                {unreadCount > 0 && (
                  <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-[#1E3A8A] text-[#93C5FD] border border-[#3B82F6] shadow-sm">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <p className="text-xs text-[#94A3B8] mt-1">
                Theo dõi toàn bộ thông báo công việc, mượn trả thiết bị, đặt phòng Studio, lịch trực và đồng bộ qua email.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 self-end sm:self-auto flex-wrap gap-y-2">
            {isAdmin && (
              <div className="flex items-center bg-[#1B2030] p-1 rounded-xl border border-[#2B3553]">
                <button
                  onClick={() => setActiveView('INBOX')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeView === 'INBOX'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Hộp thư của tôi
                </button>
                <button
                  onClick={() => setActiveView('EMAIL_LOGS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    activeView === 'EMAIL_LOGS'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Lịch sử gửi Email</span>
                </button>
              </div>
            )}

            {activeView === 'INBOX' && unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 border border-[#3B82F6] cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Đã đọc tất cả</span>
              </button>
            )}

            <button
              onClick={activeView === 'INBOX' ? fetchNotifications : fetchEmailLogs}
              disabled={activeView === 'INBOX' ? loading : emailLoading}
              className="p-2.5 rounded-xl border border-[#2B3553] bg-[#1B2030] hover:bg-[#242A40] text-[#CBD5E1] hover:text-white transition-all cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCcw className={`w-4 h-4 ${(activeView === 'INBOX' ? loading : emailLoading) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* VIEW 1: HỘP THƯ CÁ NHÂN (ALL USERS) */}
        {activeView === 'INBOX' ? (
          <>
            {/* Thanh công cụ lọc & Tìm kiếm */}
            <div className="bg-[#141726] p-4 rounded-2xl border border-[#2B3553] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
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
                  Khi có các cập nhật mới về nhiệm vụ, ca trực hoặc trạng thái đơn mượn phòng, hệ thống sẽ tự động hiển thị tại đây và gửi email tới bạn.
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
                        <div
                          className={`p-3.5 rounded-2xl shrink-0 mt-0.5 border ${
                            isUnread
                              ? 'bg-[#111728] border-[#3B82F6] shadow-inner'
                              : 'bg-[#0D0F17] border-[#1F2433] opacity-75'
                          }`}
                        >
                          {getNotificationIcon(n.type)}
                        </div>

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

                            <div className="flex items-center flex-wrap gap-2">
                              {n.emailStatus === 'SENT' && renderEmailStatusBadge('SENT')}
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

                          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                            <div className="flex items-center space-x-3">
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
                              {n.senderName && (
                                <span className="text-[11px] text-[#94A3B8]">
                                  Người gửi: <strong className="text-white/90">{n.senderName}</strong>
                                </span>
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
          </>
        ) : (
          /* VIEW 2: LỊCH SỬ & TRẠNG THÁI GỬI EMAIL (ADMIN ONLY) */
          <div className="space-y-5">
            {/* Trạng thái SMTP + Thống kê */}
            <div className="bg-[#141726] p-5 rounded-2xl border border-[#2B3553] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      smtpStatus?.connected
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {smtpStatus?.connected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center space-x-2">
                      <span>Trạng thái máy chủ gửi email</span>
                      {smtpStatus && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            smtpStatus.connected
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {smtpStatus.connected ? 'Đang kết nối' : 'Chưa kết nối'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      {smtpStatus
                        ? `${smtpStatus.host}:${smtpStatus.port}${smtpStatus.sender ? ` • Tài khoản gửi: ${smtpStatus.sender}` : ''}${smtpStatus.error ? ` • Lỗi: ${smtpStatus.error}` : ''}`
                        : 'Đang kiểm tra kết nối máy chủ gửi email...'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => checkSmtpConnection(true)}
                    disabled={checkingSmtp}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1B2030] hover:bg-[#242A40] text-white border border-[#2B3553] transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    {checkingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                    <span>Kiểm tra kết nối</span>
                  </button>

                  {emailStats.failed > 0 && (
                    <button
                      onClick={handleResendAllFailed}
                      disabled={resendingAll}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      {resendingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Gửi lại tất cả lỗi ({emailStats.failed})</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/5">
                <div className="p-3.5 rounded-xl bg-[#11141E] border border-[#1F2433]">
                  <p className="text-[11px] text-[#94A3B8] font-semibold">Tổng thông báo</p>
                  <p className="text-xl font-black text-white mt-1">{emailStats.total}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#11141E] border border-emerald-500/20">
                  <p className="text-[11px] text-emerald-300 font-semibold">Gửi thành công</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">{emailStats.sent}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#11141E] border border-rose-500/20">
                  <p className="text-[11px] text-rose-300 font-semibold">Gửi thất bại</p>
                  <p className="text-xl font-black text-rose-400 mt-1">{emailStats.failed}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#11141E] border border-amber-500/20">
                  <p className="text-[11px] text-amber-300 font-semibold">Đang chờ / Bỏ qua</p>
                  <p className="text-xl font-black text-amber-300 mt-1">{emailStats.pending + emailStats.skipped}</p>
                </div>
              </div>
            </div>

            {/* Bộ lọc lịch sử email */}
            <div className="bg-[#141726] p-4 rounded-2xl border border-[#2B3553] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center flex-wrap gap-2">
                {(['ALL', 'SENT', 'FAILED', 'PENDING', 'SKIPPED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setEmailStatusFilter(st)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      emailStatusFilter === st
                        ? 'bg-[#2563EB] text-white border border-[#3B82F6]'
                        : 'bg-[#1B2030] text-[#94A3B8] hover:text-white border border-[#2B3553]'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'Tất cả'
                      : st === 'SENT'
                      ? 'Đã gửi'
                      : st === 'FAILED'
                      ? 'Thất bại'
                      : st === 'PENDING'
                      ? 'Đang gửi'
                      : 'Bỏ qua'}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  placeholder="Tìm email người nhận, tiêu đề..."
                  className="w-full bg-[#1B2030] border border-[#2B3553] focus:border-[#3B82F6] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#64748B] focus:outline-none"
                />
              </div>
            </div>

            {/* Bảng lịch sử gửi email */}
            <div className="bg-[#141726] rounded-2xl border border-[#2B3553] overflow-hidden">
              {emailLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin text-brand-primary" />
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="py-16 text-center text-sm text-[#94A3B8]">
                  Chưa có bản ghi lịch sử gửi email phù hợp.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#1B2030] text-[#94A3B8] border-b border-[#2B3553]">
                        <th className="py-3 px-4 font-bold">Thời gian</th>
                        <th className="py-3 px-4 font-bold">Người nhận</th>
                        <th className="py-3 px-4 font-bold">Tiêu đề &amp; Người gửi</th>
                        <th className="py-3 px-4 font-bold">Trạng thái</th>
                        <th className="py-3 px-4 font-bold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {emailLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 whitespace-nowrap text-[#94A3B8]">
                            <div>
                              {new Date(log.createdAt).toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            {log.emailSentAt && (
                              <div className="text-[10px] text-emerald-400 mt-0.5">
                                Gửi lúc:{' '}
                                {new Date(log.emailSentAt).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{log.user?.fullName || '—'}</div>
                            <div className="text-[11px] text-[#94A3B8]">{log.recipientEmail || log.user?.email || 'Chưa có email'}</div>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-semibold text-white truncate" title={log.title}>
                              {log.title}
                            </div>
                            <div className="text-[11px] text-[#94A3B8] mt-0.5">
                              Từ: {log.senderName || 'Hệ thống LHU Media Studio'}
                            </div>
                            {log.emailError && (
                              <div className="text-[10px] text-rose-400 mt-0.5 line-clamp-2" title={log.emailError}>
                                Lỗi: {log.emailError}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div>{renderEmailStatusBadge(log.emailStatus)}</div>
                            <div className="text-[10px] text-[#94A3B8] mt-1">
                              Số lần thử: {log.emailRetryCount || 0}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleResendOne(log.id)}
                              disabled={resendingId === log.id}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#1B2030] hover:bg-[#2563EB] text-white border border-[#2B3553] hover:border-[#3B82F6] text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                            >
                              {resendingId === log.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              <span>Gửi lại</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
