'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Loader2, Calendar, Camera, Clock, CheckCircle2, XCircle, RefreshCcw, AlertTriangle, PackageCheck, Undo, CalendarClock, X, MapPin, Check } from 'lucide-react';

interface EquipmentItem {
  equipmentId: string;
  quantity: number;
  details: {
    name: string;
    code: string;
    category: string;
    image: string;
  };
}

interface BorrowRequest {
  id: string;
  purpose: string;
  borrowDate: string;
  returnDate: string;
  actualReturnDate?: string;
  status: 'PENDING' | 'APPROVED' | 'HANDED_OVER' | 'OVERDUE' | 'REJECTED' | 'RETURNED';
  rejectReason?: string;
  handedOverAt?: string;
  handoverCondition?: string;
  returnCondition?: string;
  adminNote?: string;
  createdAt: string;
  equipments: EquipmentItem[];
}

interface StudioBooking {
  id: string;
  fullName: string;
  studioName?: string;
  participants: number;
  purpose: string;
  technicalSupport: boolean;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  rejectReason?: string;
  adminNote?: string;
  notes?: string;
  createdAt: string;
  userCheckInAt?: string;
  adminConfirmedAt?: string;
  attendanceStatus?: string;
  attendanceInfo?: {
    code: 'FUTURE_BOOKING' | 'WAITING_USER_CHECKIN' | 'WAITING_ADMIN_CONFIRM' | 'USAGE_CONFIRMED' | 'ABSENT' | 'PENDING_APPROVAL' | string;
    label: string;
    subLabel?: string;
    color: string;
    canUserCheckIn: boolean;
    canAdminConfirm: boolean;
    bookingDate?: string;
    userCheckInAt?: string | null;
    adminConfirmedAt?: string | null;
  };
}

export default function UserHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'studio' | 'equipment'>('studio');
  const [borrows, setBorrows] = useState<BorrowRequest[]>([]);
  const [bookings, setBookings] = useState<StudioBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // Reschedule Studio Booking states (FR-03.6)
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedBookingReschedule, setSelectedBookingReschedule] = useState<StudioBooking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('08:00');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('11:00');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  // Cancel Studio Booking states
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingCancel, setSelectedBookingCancel] = useState<StudioBooking | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      toast('Vui lòng đăng nhập để xem lịch sử', 'warning');
      router.push('/auth/login');
    }
  }, [user, authLoading, router, toast]);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, activeTab]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      if (activeTab === 'studio') {
        const data = await api.get('/studio-bookings?mine=true');
        setBookings(data);
      } else {
        const data = await api.get('/borrow-requests');
        setBorrows(data);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi tải lịch sử đăng ký', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openReschedule = (booking: StudioBooking) => {
    setSelectedBookingReschedule(booking);
    try {
      const s = new Date(booking.startTime);
      const e = new Date(booking.endTime);
      setRescheduleDate(format(s, 'yyyy-MM-dd'));
      setRescheduleStartTime(format(s, 'HH:mm'));
      setRescheduleEndTime(format(e, 'HH:mm'));
    } catch {
      setRescheduleDate(format(new Date(), 'yyyy-MM-dd'));
      setRescheduleStartTime('08:00');
      setRescheduleEndTime('11:00');
    }
    setRescheduleReason('');
    setRescheduleModalOpen(true);
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingReschedule) return;
    if (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) {
      toast('Vui lòng chọn ngày và khung giờ mới', 'warning');
      return;
    }

    setRescheduleSubmitting(true);
    try {
      const startIso = new Date(`${rescheduleDate}T${rescheduleStartTime}:00`).toISOString();
      const endIso = new Date(`${rescheduleDate}T${rescheduleEndTime}:00`).toISOString();

      await api.put(`/studio-bookings/${selectedBookingReschedule.id}/reschedule`, {
        startTime: startIso,
        endTime: endIso,
        rescheduleReason: rescheduleReason.trim() || undefined,
      });

      toast('Yêu cầu dời lịch đặt phòng Studio đã được gửi thành công!', 'success');
      setRescheduleModalOpen(false);
      setSelectedBookingReschedule(null);
      fetchHistory();
    } catch (err: any) {
      toast(err.message || 'Lỗi dời lịch đặt phòng Studio', 'error');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const openCancel = (booking: StudioBooking) => {
    setSelectedBookingCancel(booking);
    setCancelModalOpen(true);
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingCancel) return;
    setCancelSubmitting(true);
    try {
      await api.patch(`/studio-bookings/${selectedBookingCancel.id}/cancel`);
      toast('Đã hủy đặt phòng thành công!', 'success');
      setCancelModalOpen(false);
      setSelectedBookingCancel(null);
      fetchHistory();
    } catch (err: any) {
      toast(err.message || 'Lỗi hủy đặt phòng', 'error');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const handleUserCheckIn = async (bookingId: string) => {
    setCheckingInId(bookingId);
    try {
      await api.put(`/studio-bookings/${bookingId}/check-in`);
      toast('Xác nhận đã đến Studio thành công! Hệ thống đã gửi thông báo đến Quản trị viên.', 'success');
      fetchHistory();
    } catch (err: any) {
      toast(err.message || 'Xác nhận đã đến thất bại', 'error');
    } finally {
      setCheckingInId(null);
    }
  };

  const getStudioApprovalBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-accent/15 text-brand-accent border border-brand-accent/20">
            <Clock className="w-3.5 h-3.5" />
            <span>Chờ duyệt</span>
          </span>
        );
      case 'APPROVED':
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-success/15 text-brand-success border border-brand-success/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã duyệt</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Hoàn thành</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-error/15 text-brand-error border border-brand-error/20">
            <XCircle className="w-3.5 h-3.5" />
            <span>Từ chối</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-studio-muted border border-white/10">
            <XCircle className="w-3.5 h-3.5" />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getStudioAttendanceBadge = (booking: StudioBooking) => {
    if (booking.status === 'PENDING' || booking.status === 'REJECTED' || booking.status === 'CANCELLED') {
      return <span className="text-xs text-studio-muted">—</span>;
    }

    const info = booking.attendanceInfo;
    const code = info?.code;

    // 4. Đã xác nhận sử dụng
    if (code === 'USAGE_CONFIRMED' || booking.adminConfirmedAt || booking.status === 'COMPLETED') {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Đã xác nhận sử dụng</span>
          </span>
          {booking.adminConfirmedAt && (
            <span className="text-[10px] text-studio-muted mt-0.5">
              Admin: {format(new Date(booking.adminConfirmedAt), 'HH:mm dd/MM')}
            </span>
          )}
        </div>
      );
    }

    // 3. Chờ ADMIN xác nhận (Chờ xác nhận có mặt)
    if (code === 'WAITING_ADMIN_CONFIRM' || (booking.userCheckInAt && !booking.adminConfirmedAt)) {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse shadow-xs">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Chờ ADMIN xác nhận</span>
          </span>
          {booking.userCheckInAt && (
            <span className="text-[10px] text-blue-300/90 mt-0.5 font-medium">
              Đã báo có mặt: {format(new Date(booking.userCheckInAt), 'HH:mm dd/MM')}
            </span>
          )}
        </div>
      );
    }

    // 2. Chờ xác nhận người dùng (Đúng ngày hôm nay)
    if (code === 'WAITING_USER_CHECKIN') {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Chờ bạn xác nhận có mặt</span>
          </span>
          <span className="text-[10px] text-amber-300/80 mt-0.5 font-medium">Hôm nay</span>
        </div>
      );
    }

    // 1. Chưa đến ngày đặt
    if (code === 'FUTURE_BOOKING') {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-studio-muted border border-white/10">
            <Calendar className="w-3.5 h-3.5 text-studio-muted shrink-0" />
            <span>Chưa đến ngày đặt</span>
          </span>
          <span className="text-[10px] text-studio-muted mt-0.5">
            {format(new Date(booking.startTime), 'dd/MM/yyyy')}
          </span>
        </div>
      );
    }

    // Không đến sử dụng
    if (code === 'ABSENT' || booking.attendanceStatus === 'ABSENT') {
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Không đến sử dụng</span>
          </span>
          <span className="text-[10px] text-rose-400/80 mt-0.5">Vắng mặt / Quá hạn</span>
        </div>
      );
    }

    return <span className="text-xs text-studio-muted">—</span>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-accent/15 text-brand-accent border border-brand-accent/20">
            <Clock className="w-3.5 h-3.5" />
            <span>Chờ duyệt</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-success/15 text-brand-success border border-brand-success/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã duyệt (Chờ nhận máy)</span>
          </span>
        );
      case 'HANDED_OVER':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Đang mượn</span>
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-600/30 text-red-400 border border-red-500/50 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Quá hạn</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-error/15 text-brand-error border border-brand-error/20">
            <XCircle className="w-3.5 h-3.5" />
            <span>Đã từ chối</span>
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-studio-muted border border-white/10">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã hoàn trả</span>
          </span>
        );
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studio-dark">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-12 px-6 md:px-12 max-w-7xl mx-auto w-full space-y-8 text-left">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Lịch Sử Hoạt Động</h1>
            <p className="text-sm text-studio-muted mt-1">Theo dõi trạng thái các yêu cầu đặt phòng và mượn thiết bị của bạn.</p>
          </div>
          <button
            onClick={fetchHistory}
            className="p-3 rounded-2xl border border-white/5 hover:bg-white/5 text-studio-muted hover:text-white transition-all cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex space-x-4 border-b border-white/5 pb-0.5">
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center space-x-2 pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === 'studio'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-studio-muted hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Đặt lịch Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('equipment')}
            className={`flex items-center space-x-2 pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === 'equipment'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-studio-muted hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Mượn thiết bị</span>
          </button>
        </div>

        {/* Content table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : activeTab === 'studio' ? (
          /* Bookings History list */
          bookings.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
              <p className="text-studio-muted">Bạn chưa gửi yêu cầu đặt phòng Studio nào.</p>
            </div>
          ) : (
            <div className="glass-panel overflow-hidden rounded-3xl border border-white/5 shadow-xl bg-black/25">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-studio-muted font-semibold bg-white/2">
                      <th className="py-4 px-6 text-left">Thời gian sử dụng</th>
                      <th className="py-4 px-6 text-left">Mục đích</th>
                      <th className="py-4 px-6 text-center">Người tham gia</th>
                      <th className="py-4 px-6 text-center">Hỗ trợ kỹ thuật</th>
                      <th className="py-4 px-6 text-center">Duyệt yêu cầu</th>
                      <th className="py-4 px-6 text-center">Xác nhận sử dụng</th>
                      <th className="py-4 px-6 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-white/2 transition-colors">
                        <td className="py-4 px-6 text-left font-medium text-white">
                          <span className="block">
                            {format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}
                          </span>
                          <span className="text-xs text-studio-muted font-normal block mt-0.5">
                            {format(new Date(booking.startTime), 'dd/MM/yyyy')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-left text-white max-w-xs" title={booking.purpose}>
                          <div className="font-semibold break-words whitespace-pre-wrap">{booking.purpose}</div>
                          {booking.status === 'REJECTED' && booking.rejectReason && (
                            <div className="text-xs text-brand-error mt-1 italic flex items-start space-x-1 font-medium bg-brand-error/5 border border-brand-error/15 py-1 px-2.5 rounded-lg w-fit max-w-full break-words whitespace-pre-wrap">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>Lý do từ chối: {booking.rejectReason}</span>
                            </div>
                          )}
                          {booking.adminNote && (
                            <div className="text-xs text-brand-primary mt-1 italic flex items-start space-x-1 font-medium bg-brand-primary/10 border border-brand-primary/20 py-1 px-2.5 rounded-lg w-fit max-w-full break-words whitespace-pre-wrap">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>Phản hồi của Admin: {booking.adminNote}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center text-white font-bold">{booking.participants}</td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                              booking.technicalSupport
                                ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30'
                                : 'bg-white/5 text-studio-muted border border-white/5'
                            }`}
                          >
                            {booking.technicalSupport ? 'Cần hỗ trợ' : 'Không'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">{getStudioApprovalBadge(booking.status)}</td>
                        <td className="py-4 px-6 text-center">{getStudioAttendanceBadge(booking)}</td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {/* Nút "Xác nhận đã đến" cho Người dùng vào đúng ngày đặt phòng */}
                            {(booking.status === 'APPROVED' || booking.status === 'CONFIRMED') &&
                              !booking.userCheckInAt &&
                              booking.attendanceInfo?.canUserCheckIn && (
                                <button
                                  onClick={() => handleUserCheckIn(booking.id)}
                                  disabled={checkingInId === booking.id}
                                  className="py-1 px-3 rounded-lg border border-blue-500/40 bg-blue-600/30 hover:bg-blue-600 hover:text-white text-blue-300 text-xs font-bold cursor-pointer transition-all flex items-center space-x-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50"
                                  title="Nhấn để thông báo bạn đã có mặt và sử dụng Studio theo lịch"
                                >
                                  {checkingInId === booking.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                  )}
                                  <span>Xác nhận đã đến</span>
                                </button>
                              )}

                            {/* Cho phép dời lịch hoặc hủy nếu chưa hoàn tất sử dụng */}
                            {(booking.status === 'PENDING' || (booking.status === 'APPROVED' && !booking.userCheckInAt)) && (
                              <>
                                <button
                                  onClick={() => openReschedule(booking)}
                                  className="py-1 px-2.5 rounded-lg border border-brand-primary/30 bg-brand-primary/10 hover:bg-brand-primary hover:text-white text-brand-primary text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1"
                                  title="Dời lịch đặt phòng Studio"
                                >
                                  <CalendarClock className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Dời lịch</span>
                                </button>
                                <button
                                  onClick={() => openCancel(booking)}
                                  className="py-1 px-2.5 rounded-lg border border-brand-error/20 bg-brand-error/5 hover:bg-brand-error/15 text-brand-error text-xs font-semibold cursor-pointer transition-all flex items-center space-x-1"
                                  title="Hủy đặt phòng"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Hủy</span>
                                </button>
                              </>
                            )}

                            {/* Nếu đã xác nhận đến hoặc đã sử dụng xong và không có nút dời lịch */}
                            {((booking.status === 'APPROVED' && booking.userCheckInAt) || booking.status === 'COMPLETED') && (
                              <span className="text-xs text-studio-muted italic">Đã ghi nhận</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          /* Equipment Borrow Requests list */
          borrows.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
              <p className="text-studio-muted">Bạn chưa gửi yêu cầu mượn thiết bị nào.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {borrows.map((borrow) => (
                <div
                  key={borrow.id}
                  className="glass-panel p-6 rounded-3xl border border-white/5 shadow-xl bg-black/25 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-4 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="text-xs text-studio-muted font-semibold uppercase tracking-wider">
                        Phiếu mượn: #{borrow.id.substring(borrow.id.length - 8)}
                      </span>
                      <span className="text-xs text-studio-muted">|</span>
                      <span className="text-xs text-studio-muted">
                        Mượn: {format(new Date(borrow.borrowDate), 'HH:mm dd/MM/yyyy')}
                      </span>
                      <span className="text-xs text-studio-muted">|</span>
                      <span className="text-xs text-studio-muted">
                        Trả: {format(new Date(borrow.returnDate), 'HH:mm dd/MM/yyyy')}
                      </span>
                    </div>

                    <p className="text-sm text-white font-medium break-words whitespace-pre-wrap">
                      <span className="text-studio-muted font-normal block mb-1">Mục đích:</span>
                      {borrow.purpose}
                    </p>

                    {borrow.status === 'OVERDUE' && (
                      <div className="text-xs text-red-400 mt-2 font-medium bg-red-500/10 border border-red-500/25 py-2 px-3 rounded-2xl w-fit max-w-full flex items-start space-x-1.5 animate-pulse">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                        <span>Cảnh báo: Đơn mượn đã quá thời hạn trả! Vui lòng liên hệ ban quản lý Studio và hoàn trả thiết bị sớm nhất có thể.</span>
                      </div>
                    )}

                    {borrow.handoverCondition && (
                      <div className="text-xs text-purple-300 mt-2 font-medium bg-purple-500/10 border border-purple-500/20 py-2 px-3 rounded-2xl w-fit max-w-full flex items-start space-x-1.5">
                        <PackageCheck className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Biên bản bàn giao: {borrow.handoverCondition}</span>
                      </div>
                    )}

                    {borrow.returnCondition && (
                      <div className="text-xs text-brand-primary mt-2 font-medium bg-brand-primary/10 border border-brand-primary/20 py-2 px-3 rounded-2xl w-fit max-w-full flex items-start space-x-1.5">
                        <Undo className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Biên bản nhận trả: {borrow.returnCondition}</span>
                      </div>
                    )}

                    {borrow.status === 'REJECTED' && borrow.rejectReason && (
                      <div className="text-xs text-brand-error mt-2 font-medium bg-brand-error/5 border border-brand-error/15 py-2 px-3 rounded-2xl w-fit max-w-full flex items-start space-x-1.5 break-words whitespace-pre-wrap">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Lý do từ chối: {borrow.rejectReason}</span>
                      </div>
                    )}

                    {borrow.adminNote && (
                      <div className="text-xs text-brand-primary mt-2 font-medium bg-brand-primary/10 border border-brand-primary/20 py-2 px-3 rounded-2xl w-fit max-w-full flex items-start space-x-1.5 break-words whitespace-pre-wrap">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Phản hồi của Admin: {borrow.adminNote}</span>
                      </div>
                    )}

                    {/* Equipments list inside this borrow */}
                    <div className="flex flex-wrap gap-3">
                      {borrow.equipments.map((eq) => (
                        <div
                          key={eq.equipmentId}
                          className="flex items-center space-x-2.5 bg-white/5 border border-white/5 py-1.5 px-3.5 rounded-xl text-xs text-white"
                        >
                          {eq.details?.image && (
                            <img
                              src={eq.details.image}
                              alt={eq.details.name}
                              className="w-6 h-6 rounded-md object-cover"
                            />
                          )}
                          <span className="font-semibold text-white">
                            {eq.details?.name || 'Thiết bị'}
                          </span>
                          <span className="text-brand-primary font-bold bg-brand-primary/10 px-1.5 py-0.2 rounded border border-brand-primary/10">
                            x{eq.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: status badge */}
                  <div className="flex items-center md:justify-end shrink-0">
                    {getStatusBadge(borrow.status)}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* User Reschedule Studio Modal (FR-03.6) */}
        {rescheduleModalOpen && selectedBookingReschedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setRescheduleModalOpen(false)}
            />

            <div className="glass-panel max-w-lg w-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
                <div className="flex items-center space-x-2 text-brand-primary">
                  <CalendarClock className="w-5 h-5" />
                  <h3 className="text-lg font-bold text-white">Dời Lịch Đặt Phòng Studio</h3>
                </div>
                <button
                  onClick={() => setRescheduleModalOpen(false)}
                  className="p-2 rounded-xl text-studio-muted hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit} className="p-6 space-y-4 text-left">
                {/* Lịch hiện tại */}
                <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-studio-muted font-bold uppercase block">Lịch hiện tại</span>
                  <div className="text-xs text-white font-medium flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-brand-primary" />
                    <span>
                      {format(new Date(selectedBookingReschedule.startTime), 'HH:mm')} – {format(new Date(selectedBookingReschedule.endTime), 'HH:mm')} • {format(new Date(selectedBookingReschedule.startTime), 'dd/MM/yyyy')}
                    </span>
                  </div>
                  <div className="text-[11px] text-studio-muted mt-1 truncate">
                    Mục đích: {selectedBookingReschedule.purpose}
                  </div>
                </div>

                {/* Chọn ngày mới */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">
                    Ngày dời sang (Thứ 2 – Thứ 7)
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full bg-black/35 border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                    required
                  />
                </div>

                {/* Chọn giờ mới */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-studio-muted uppercase block">
                      Giờ bắt đầu
                    </label>
                    <input
                      type="time"
                      value={rescheduleStartTime}
                      onChange={(e) => setRescheduleStartTime(e.target.value)}
                      className="w-full bg-black/35 border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-studio-muted uppercase block">
                      Giờ kết thúc
                    </label>
                    <input
                      type="time"
                      value={rescheduleEndTime}
                      onChange={(e) => setRescheduleEndTime(e.target.value)}
                      className="w-full bg-black/35 border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                      required
                    />
                  </div>
                </div>

                {/* Gợi ý khung giờ */}
                <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-xl text-[11px] text-brand-primary">
                  Khung giờ mở cửa: <strong>Sáng 07:30–11:30 | Chiều 13:30–16:30</strong> (Nghỉ Chủ nhật, đệm 30 phút).
                </div>

                {/* Lý do dời lịch */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">
                    Lý do xin dời lịch
                  </label>
                  <textarea
                    placeholder="Mô tả ngắn lý do dời lịch (ví dụ: Trùng lịch thi, Diễn giả dời thời gian...)"
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    className="w-full bg-black/35 border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 h-20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setRescheduleModalOpen(false)}
                    className="py-3 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-center text-xs"
                    disabled={rescheduleSubmitting}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={rescheduleSubmitting}
                    className="py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all cursor-pointer text-center text-xs disabled:opacity-50 flex items-center justify-center space-x-1.5 shadow-lg shadow-brand-primary/20"
                  >
                    {rescheduleSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CalendarClock className="w-4 h-4" />
                        <span>Gửi yêu cầu dời lịch</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Cancel Studio Booking Modal */}
        {cancelModalOpen && selectedBookingCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setCancelModalOpen(false)}
            />

            <div className="glass-panel max-w-md w-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200 p-6 text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Xác nhận hủy đặt phòng?</h3>
                <p className="text-xs text-studio-muted leading-relaxed">
                  Bạn có chắc chắn muốn hủy đơn đặt phòng Studio vào ngày{' '}
                  <strong className="text-white">
                    {format(new Date(selectedBookingCancel.startTime), 'dd/MM/yyyy (HH:mm')} – {format(new Date(selectedBookingCancel.endTime), 'HH:mm)')}
                  </strong>{' '}
                  không? Khung giờ này sẽ được giải phóng cho người khác đặt.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-xs"
                  disabled={cancelSubmitting}
                >
                  Không, quay lại
                </button>
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={cancelSubmitting}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer text-xs disabled:opacity-50 flex items-center justify-center space-x-1.5 shadow-lg shadow-rose-600/20"
                >
                  {cancelSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Xác nhận hủy</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
