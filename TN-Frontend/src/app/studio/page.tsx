'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import { format } from 'date-fns';
import {
  Loader2,
  Calendar,
  Users,
  HelpCircle,
  Send,
  X,
  Clock,
  HelpCircle as SupportIcon,
  Plus,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Info,
} from 'lucide-react';

// Load FullCalendar dynamically to avoid SSR errors
const StudioCalendar = dynamic(() => import('@/components/StudioCalendar'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full glass-panel flex items-center justify-center rounded-3xl border border-white/5 bg-black/25">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary mx-auto" />
        <p className="text-sm text-studio-muted">Đang tải lịch đặt phòng...</p>
      </div>
    </div>
  ),
});

interface Booking {
  id: string;
  userId: string;
  fullName: string;
  participants: number;
  purpose: string;
  technicalSupport: boolean;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'APPROVED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  rejectReason?: string;
}

export default function StudioBookingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Chế độ chọn khung giờ: 'SUGGESTED' (Gợi ý khung giờ còn trống) | 'CUSTOM' (Tự nhập khung giờ)
  const [bookingMode, setBookingMode] = useState<'SUGGESTED' | 'CUSTOM'>('SUGGESTED');

  // Ngày chọn đặt phòng (mặc định ngày mai hoặc ngày làm việc tiếp theo)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  // Dữ liệu slot trống gợi ý
  const [availableSlotsData, setAvailableSlotsData] = useState<any>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Dữ liệu tự nhập giờ
  const [customStartTime, setCustomStartTime] = useState('07:30');
  const [customEndTime, setCustomEndTime] = useState('09:30');

  // Booking Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [isMultiRangeMode, setIsMultiRangeMode] = useState(false);
  const [firstClickDate, setFirstClickDate] = useState<Date | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ start: Date; end: Date } | null>(null);
  const [confirmedRanges, setConfirmedRanges] = useState<{ start: Date; end: Date }[]>([]);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [participants, setParticipants] = useState(1);
  const [purpose, setPurpose] = useState('');
  const [technicalSupport, setTechnicalSupport] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal for clicks on calendar events
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Booking | null>(null);

  // Protect page
  useEffect(() => {
    if (!authLoading && !user) {
      toast('Vui lòng đăng nhập để đặt lịch Studio', 'warning');
      router.push('/auth/login');
    } else if (user) {
      setFullName(user.fullName);
    }
  }, [user, authLoading, router, toast]);

  // Load Bookings
  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  // Load Available Slots for selected date
  const fetchAvailableSlots = async (dateStr: string) => {
    if (!dateStr) return;
    setLoadingSlots(true);
    try {
      const res = await api.get(`/studio-bookings/available-slots?date=${dateStr}`);
      setAvailableSlotsData(res);
    } catch (err: any) {
      setAvailableSlotsData(null);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (user && selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [user, selectedDate]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await api.get('/studio-bookings?calendar=true');
      setBookings(data);
      if (selectedDate) {
        fetchAvailableSlots(selectedDate);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi tải danh sách đặt phòng', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Convert bookings and selections to FullCalendar events
  const calendarEvents = [
    ...bookings.map((b) => {
      const isConfirmed = b.status === 'CONFIRMED' || b.status === 'APPROVED' || b.status === 'COMPLETED';
      const isPending = b.status === 'PENDING';
      const isCancelled = b.status === 'CANCELLED' || b.status === 'REJECTED';
      
      let border = '#284F9E';
      let bg = 'rgba(40, 79, 158, 0.2)';
      let statusText = '✓ Đã Duyệt';

      if (isPending) {
        border = '#ECC354';
        bg = 'rgba(236, 195, 84, 0.2)';
        statusText = '⏳ Chờ Duyệt';
      } else if (isCancelled) {
        border = '#ef4444';
        bg = 'rgba(239, 68, 68, 0.15)';
        statusText = '✕ Đã Hủy';
      }

      return {
        id: b.id,
        title: `${statusText} - ${b.fullName}`,
        start: b.startTime,
        end: b.endTime,
        backgroundColor: bg,
        borderColor: border,
        textColor: '#ffffff',
        extendedProps: {
          bookingData: b,
        },
      };
    }),
    ...confirmedRanges.map((range, index) => ({
      id: `confirmed-range-${index}`,
      title: `✓ Khung giờ ${index + 1}`,
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      backgroundColor: 'rgba(40, 79, 158, 0.3)', // Brand blue transparent
      borderColor: '#284F9E', // Brand blue
      textColor: '#ffffff',
      extendedProps: {
        isConfirmedRange: true,
        rangeIndex: index,
      },
    })),
    ...(currentSelection ? [{
      id: 'current-selection',
      title: firstClickDate ? '★ Chọn điểm kết thúc...' : '★ Khung giờ đang chọn',
      start: currentSelection.start.toISOString(),
      end: currentSelection.end.toISOString(),
      backgroundColor: firstClickDate ? 'rgba(236, 195, 84, 0.2)' : 'rgba(236, 195, 84, 0.4)',
      borderColor: '#ECC354',
      textColor: '#ffffff',
      extendedProps: {
        isSelectedSlot: true,
      },
    }] : []),
  ];

  // Khoảng đệm 30 phút giữa 2 ca đặt Studio (Quy tắc nghiệp vụ Mục 4.3)
  const BUFFER_MS = 30 * 60 * 1000;

  const validateOperatingHours = (start: Date, end: Date): string | null => {
    if (end <= start) {
      return 'Thời gian kết thúc phải sau thời gian bắt đầu.';
    }

    const isSameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();

    if (!isSameDay) {
      return 'Lịch đặt Studio phải bắt đầu và kết thúc trong cùng một ngày.';
    }

    // ADMIN ĐẶC QUYỀN: Cho phép đặt ngoài giờ hành chính và Chủ nhật
    if (user?.role === 'ADMIN') {
      return null;
    }

    // 0 = Chủ nhật
    if (start.getDay() === 0) {
      return 'Phòng Studio không hoạt động vào Chủ nhật. Vui lòng chọn lịch từ Thứ Hai đến Thứ Bảy.';
    }

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();

    // Ca sáng: 07:30 (450p) – 11:30 (690p), Ca chiều: 13:30 (810p) – 16:30 (990p)
    const isMorning = startMinutes >= 450 && endMinutes <= 690;
    const isAfternoon = startMinutes >= 810 && endMinutes <= 990;

    if (!isMorning && !isAfternoon) {
      return 'Thời gian đặt phòng không nằm trong khung giờ hoạt động (Sáng: 07:30–11:30, Chiều: 13:30–16:30 từ Thứ Hai đến Thứ Bảy). Không cho phép đặt xuyên trưa hoặc ngoài giờ.';
    }

    return null;
  };

  const isOverlappingOrBufferViolation = (s: Date, e: Date) => {
    return bookings.some((b) => {
      // Chỉ bỏ qua các lịch đã hủy hoặc từ chối
      if (b.status === 'CANCELLED' || b.status === 'REJECTED') return false;
      const existingStart = new Date(b.startTime);
      const existingEnd = new Date(b.endTime);
      const bufferedStart = new Date(existingStart.getTime() - BUFFER_MS);
      const bufferedEnd = new Date(existingEnd.getTime() + BUFFER_MS);
      return s < bufferedEnd && e > bufferedStart;
    });
  };

  const handleSelectSlot = (start: Date, end: Date) => {
    if (start < new Date()) {
      toast('Không thể đặt lịch ở thời gian trong quá khứ', 'warning');
      return;
    }

    const clickedDateStr = format(start, 'yyyy-MM-dd');
    if (clickedDateStr !== selectedDate) {
      setSelectedDate(clickedDateStr);
    }

    const errorMsg = validateOperatingHours(start, end);
    if (errorMsg) {
      toast(errorMsg, 'warning');
      return;
    }

    if (firstClickDate === null) {
      // First click: set start
      if (isOverlappingOrBufferViolation(start, end)) {
        toast('Khung giờ này đã được phê duyệt hoặc vi phạm khoảng đệm 30 phút với lịch đã có.', 'error');
        return;
      }
      setFirstClickDate(start);
      setCurrentSelection({ start, end });
    } else {
      // Second click: set end and form the range
      let finalStart = firstClickDate;
      let finalEnd = end;

      if (start < firstClickDate) {
        finalStart = start;
        finalEnd = new Date(firstClickDate.getTime() + 30 * 60 * 1000);
      }

      const rangeError = validateOperatingHours(finalStart, finalEnd);
      if (rangeError) {
        toast(rangeError, 'warning');
        setFirstClickDate(start);
        setCurrentSelection({ start, end });
        return;
      }

      // Check overlap and buffer for the entire range
      if (isOverlappingOrBufferViolation(finalStart, finalEnd)) {
        toast('Dải giờ được chọn bị trùng hoặc vi phạm khoảng đệm 30 phút với lịch đã duyệt.', 'error');
        setFirstClickDate(start);
        setCurrentSelection({ start, end });
        return;
      }

      // Check overlap with confirmed ranges
      const overlapsConfirmed = confirmedRanges.some((r) => {
        const bufStart = new Date(r.start.getTime() - BUFFER_MS);
        const bufEnd = new Date(r.end.getTime() + BUFFER_MS);
        return finalStart < bufEnd && finalEnd > bufStart;
      });

      if (overlapsConfirmed) {
        toast('Dải giờ được chọn bị trùng hoặc vi phạm khoảng đệm 30 phút với dải giờ đã chọn khác.', 'error');
        setFirstClickDate(start);
        setCurrentSelection({ start, end });
        return;
      }

      setCurrentSelection({ start: finalStart, end: finalEnd });
      setFirstClickDate(null);
    }
  };

  // Chọn khung giờ được hệ thống gợi ý
  const handleSelectSuggestedSlot = (slot: any) => {
    setSelectedSlotId(slot.id);
    const start = new Date(slot.startIso);
    const end = new Date(slot.endIso);

    if (start < new Date()) {
      toast('Khung giờ này đã ở trong quá khứ, vui lòng chọn ngày/khung giờ khác.', 'warning');
      return;
    }

    if (isOverlappingOrBufferViolation(start, end)) {
      toast('Khung giờ này đã có lịch đặt hoặc vi phạm khoảng đệm 30 phút với lịch phòng hiện có.', 'error');
      return;
    }

    const overlapsConfirmed = confirmedRanges.some((r) => {
      const bufStart = new Date(r.start.getTime() - BUFFER_MS);
      const bufEnd = new Date(r.end.getTime() + BUFFER_MS);
      return start < bufEnd && end > bufStart;
    });

    if (overlapsConfirmed) {
      toast('Khung giờ này bị trùng hoặc vi phạm khoảng đệm 30 phút với dải giờ bạn đã chọn trước đó.', 'error');
      return;
    }

    setCurrentSelection({ start, end });
    setFirstClickDate(null);
    toast(`Đã chọn khung giờ: ${slot.label} (${slot.duration})`, 'info');
  };

  // Áp dụng khung giờ tự nhập
  const handleApplyCustomTime = () => {
    if (!selectedDate || !customStartTime || !customEndTime) {
      toast('Vui lòng chọn ngày, giờ bắt đầu và giờ kết thúc', 'warning');
      return;
    }

    const start = new Date(`${selectedDate}T${customStartTime}:00+07:00`);
    const end = new Date(`${selectedDate}T${customEndTime}:00+07:00`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast('Thời gian đã chọn không hợp lệ', 'error');
      return;
    }

    if (start < new Date()) {
      toast('Không thể đặt lịch ở thời gian trong quá khứ', 'warning');
      return;
    }

    const err = validateOperatingHours(start, end);
    if (err) {
      toast(err, 'warning');
      return;
    }

    if (isOverlappingOrBufferViolation(start, end)) {
      toast('Khung giờ bạn nhập đã bị trùng hoặc vi phạm khoảng đệm 30 phút với lịch đã có.', 'error');
      return;
    }

    const overlapsConfirmed = confirmedRanges.some((r) => {
      const bufStart = new Date(r.start.getTime() - BUFFER_MS);
      const bufEnd = new Date(r.end.getTime() + BUFFER_MS);
      return start < bufEnd && end > bufStart;
    });

    if (overlapsConfirmed) {
      toast('Khung giờ bạn nhập bị trùng hoặc vi phạm khoảng đệm 30 phút với dải giờ bạn đã chọn trước đó.', 'error');
      return;
    }

    setSelectedSlotId(null);
    setCurrentSelection({ start, end });
    setFirstClickDate(null);
    toast(`Đã chọn khung giờ: ${customStartTime} – ${customEndTime} ngày ${format(start, 'dd/MM/yyyy')}`, 'success');
  };

  const getRangesToSubmit = () => {
    const list = [...confirmedRanges];
    if (currentSelection) {
      list.push(currentSelection);
    }
    return list.sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ranges = getRangesToSubmit();
    if (ranges.length === 0) {
      toast('Vui lòng chọn ít nhất một khung giờ đặt phòng', 'warning');
      return;
    }

    if (!fullName || !purpose || participants < 1) {
      toast('Vui lòng nhập đầy đủ thông tin yêu cầu', 'warning');
      return;
    }

    if (participants > 40) {
      toast('Studio chỉ chứa tối đa 40 người!', 'warning');
      return;
    }

    if (purpose.length > 500) {
      toast('Mục đích sử dụng không được vượt quá 500 ký tự', 'warning');
      return;
    }

    // Kiểm tra giờ hoạt động cho tất cả các dải giờ
    for (const range of ranges) {
      const err = validateOperatingHours(range.start, range.end);
      if (err) {
        toast(err, 'error');
        return;
      }
    }

    // Final check for APPROVED overlaps & 30-min buffer before submitting
    const hasConflict = ranges.some((range) => isOverlappingOrBufferViolation(range.start, range.end));
    if (hasConflict) {
      toast('Một hoặc nhiều khung giờ đã chọn đã trùng hoặc vi phạm khoảng đệm 30 phút với lịch đã được phê duyệt. Vui lòng kiểm tra lại.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Submit ranges sequentially via API
      await Promise.all(
        ranges.map((range) => {
          const bookingData = {
            fullName,
            participants,
            purpose,
            technicalSupport,
            startTime: range.start.toISOString(),
            endTime: range.end.toISOString(),
          };
          return api.post('/studio-bookings', bookingData);
        })
      );

      toast('Gửi yêu cầu đặt phòng thành công!', 'success');
      setModalOpen(false);
      setPurpose('');
      setParticipants(1);
      setTechnicalSupport(false);
      setConfirmedRanges([]);
      setCurrentSelection(null);
      setFirstClickDate(null);
      fetchBookings();
    } catch (err: any) {
      toast(err.message || 'Lỗi gửi yêu cầu đặt phòng', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-12 px-6 md:px-12 max-w-7xl mx-auto w-full space-y-8 text-left">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Đặt Phòng Studio</h1>
          <p className="text-sm text-studio-muted mt-1">
            Chọn giờ bắt đầu, sau đó chọn giờ kết thúc hoặc chọn từ khung giờ còn trống được hệ thống gợi ý.
          </p>
        </div>

        {/* KHUNG ĐĂNG KÝ ĐẶT PHÒNG: GỢI Ý KHUNG GIỜ HOẶC TỰ NHẬP */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#121216] shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Chọn Khung Giờ Đặt Phòng</span>
                  {user?.role === 'ADMIN' && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                      <span>Đặc quyền ADMIN</span>
                    </span>
                  )}
                </h2>
                <p className="text-xs text-studio-muted mt-0.5">
                  Chọn khung giờ trống gợi ý sẵn hoặc tự nhập khoảng giờ bạn muốn sử dụng phòng
                </p>
              </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex items-center p-1 bg-white/5 rounded-2xl border border-white/5 w-fit">
              <button
                type="button"
                onClick={() => setBookingMode('SUGGESTED')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bookingMode === 'SUGGESTED'
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/25'
                    : 'text-studio-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gợi ý khung giờ còn trống</span>
              </button>
              <button
                type="button"
                onClick={() => setBookingMode('CUSTOM')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bookingMode === 'CUSTOM'
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/25'
                    : 'text-studio-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Tự nhập khung giờ</span>
              </button>
            </div>
          </div>

          {/* TAB 1: GỢI Ý KHUNG GIỜ CÒN TRỐNG */}
          {bookingMode === 'SUGGESTED' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <label className="text-xs font-bold text-white shrink-0">Chọn ngày:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-brand-primary cursor-pointer"
                  />
                  {loadingSlots && (
                    <span className="text-xs text-studio-muted animate-pulse">Đang nạp khung giờ trống...</span>
                  )}
                </div>
                <div className="text-[11px] text-studio-muted flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span>Tự động loại bỏ giờ đã duyệt và tính khoảng đệm 30 phút giữa các ca</span>
                </div>
              </div>

              {availableSlotsData && !availableSlotsData.isOpen && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{availableSlotsData.message || 'Studio không hoạt động vào ngày này.'}</span>
                </div>
              )}

              {availableSlotsData && availableSlotsData.shifts && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                  {availableSlotsData.shifts.map((shift: any) => (
                    <div
                      key={shift.id}
                      className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-white">{shift.name}</span>
                        <span className="text-[10px] text-studio-muted font-medium">
                          {shift.operatingHours}
                        </span>
                      </div>

                      {(() => {
                        const validAvailableSlots = (shift.availableSlots || []).filter((slot: any) => {
                          const s = new Date(slot.startIso);
                          const e = new Date(slot.endIso);
                          return !isOverlappingOrBufferViolation(s, e);
                        });

                        return validAvailableSlots.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {validAvailableSlots.map((slot: any) => {
                              const isSelected = selectedSlotId === slot.id;
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  onClick={() => handleSelectSuggestedSlot(slot)}
                                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left border cursor-pointer ${
                                    isSelected
                                      ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/30'
                                      : 'bg-white/5 text-white/90 border-white/10 hover:border-brand-primary/50 hover:bg-white/10'
                                  }`}
                                >
                                  <div className="flex items-center space-x-1.5">
                                    <Clock className="w-3 h-3 text-brand-primary" />
                                    <span>{slot.label}</span>
                                  </div>
                                  <span className="block text-[10px] text-studio-muted mt-0.5 font-normal">
                                    {slot.duration}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-studio-muted italic py-2">
                            Đã kín lịch hoặc không còn khung giờ trống
                          </p>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TỰ NHẬP KHUNG GIỜ */}
          {bookingMode === 'CUSTOM' && (
            <div className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-studio-muted mb-1 uppercase">
                    Ngày đặt phòng
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-brand-primary cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-studio-muted mb-1 uppercase">
                    Giờ bắt đầu
                  </label>
                  <input
                    type="time"
                    step="1800"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-studio-muted mb-1 uppercase">
                    Giờ kết thúc
                  </label>
                  <input
                    type="time"
                    step="1800"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
                <div className="text-[11px] text-studio-muted space-y-0.5">
                  <p>
                    {user?.role === 'ADMIN' ? (
                      <span className="text-amber-300 font-medium">
                        * Tài khoản ADMIN được phép chọn mọi khung giờ (bao gồm ngoài giờ hành chính &amp; Chủ nhật).
                      </span>
                    ) : (
                      <span>
                        * Quy tắc: Thứ Hai – Thứ Bảy (Sáng 07:30–11:30, Chiều 13:30–16:30). Không đặt xuyên trưa hoặc Chủ nhật.
                      </span>
                    )}
                  </p>
                  <p>* Hệ thống tự động kiểm tra đệm 30 phút giữa các lịch đặt đã xác nhận.</p>
                </div>

                <button
                  type="button"
                  onClick={handleApplyCustomTime}
                  className="px-5 py-2.5 rounded-xl bg-brand-primary text-white font-bold text-xs hover:bg-brand-primary/90 transition-all cursor-pointer shadow-lg shadow-brand-primary/20 shrink-0 flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Áp dụng khung giờ này</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mode Toggle Switch & Indicators */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 bg-white/5 px-5 py-3 rounded-2xl border border-white/5 w-fit">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isMultiRangeMode}
                onChange={(e) => {
                  setIsMultiRangeMode(e.target.checked);
                  setConfirmedRanges([]);
                  setCurrentSelection(null);
                  setFirstClickDate(null);
                }}
                className="sr-only peer animate-none"
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-studio-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white border border-white/5"></div>
              <span className="ml-3 text-sm text-white font-semibold">Chọn nhiều dải giờ cách quãng</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-xs bg-white/5 px-6 py-3 rounded-2xl border border-white/5 w-fit">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded bg-brand-primary/20 border border-brand-primary inline-block" />
              <span className="text-white font-medium">Đã Duyệt (Khóa lịch)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded bg-brand-accent/20 border border-brand-accent inline-block" />
              <span className="text-white font-medium">Yêu cầu của bạn (Chờ duyệt)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded bg-brand-error/15 border border-brand-error inline-block" />
              <span className="text-white font-medium">Yêu cầu bị từ chối</span>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="relative">
          <StudioCalendar 
            events={calendarEvents} 
            onSelectSlot={handleSelectSlot} 
          />
        </div>

        {/* Summary and Selection Actions */}
        {isMultiRangeMode ? (
          <div className="space-y-4">
            {/* List of Confirmed and Current Selections */}
            {(confirmedRanges.length > 0 || currentSelection) && (
              <div className="glass-panel p-6 rounded-3xl border border-studio-border bg-black/20 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center space-x-2 uppercase tracking-wide">
                  <Clock className="w-4 h-4 text-brand-accent" />
                  <span>Danh sách khung giờ đã chọn ({getRangesToSubmit().length})</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Confirmed Ranges */}
                  {confirmedRanges.map((range, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-white">
                          {format(range.start, 'HH:mm')} - {format(range.end, 'HH:mm')} ngày {format(range.start, 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const target = confirmedRanges[index];
                            setCurrentSelection(target);
                            setFirstClickDate(null);
                            setConfirmedRanges((prev) => prev.filter((_, i) => i !== index));
                          }}
                          className="p-1.5 rounded-lg text-studio-muted hover:text-white hover:bg-white/5 cursor-pointer transition-all"
                          title="Sửa khung giờ"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmedRanges((prev) => prev.filter((_, i) => i !== index))}
                          className="p-1.5 rounded-lg text-studio-muted hover:text-brand-error hover:bg-white/5 cursor-pointer transition-all"
                          title="Xóa khung giờ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Current Active Selection (Not yet added to list) */}
                  {currentSelection && (
                    <div className="flex items-center justify-between p-4 bg-brand-accent/10 border border-brand-accent/20 rounded-2xl animate-pulse">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full bg-brand-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                          *
                        </div>
                        <span className="text-sm font-semibold text-brand-accent">
                          {format(currentSelection.start, 'HH:mm')} - {format(currentSelection.end, 'HH:mm')} ({firstClickDate ? 'Đang chọn kết thúc' : 'Chưa thêm'})
                        </span>
                      </div>
                      {!firstClickDate && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmedRanges((prev) => [...prev, currentSelection]);
                            setCurrentSelection(null);
                            setFirstClickDate(null);
                          }}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-brand-accent text-studio-dark text-xs font-bold hover:opacity-90 cursor-pointer transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Row Actions for Multiple Mode */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-white/5 pt-4 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmedRanges([]);
                      setCurrentSelection(null);
                      setFirstClickDate(null);
                    }}
                    className="py-3 px-5 rounded-2xl border border-white/10 hover:bg-white/5 text-white text-xs font-semibold cursor-pointer transition-all w-fit"
                  >
                    Xóa toàn bộ
                  </button>
                  <button
                    type="button"
                    disabled={getRangesToSubmit().length === 0}
                    onClick={() => setModalOpen(true)}
                    className="py-3 px-6 rounded-2xl bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-semibold shadow-lg shadow-brand-primary/25 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Tiếp tục đặt phòng
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Single Mode Actions Bar */
          currentSelection && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-brand-primary/10 border border-brand-primary/20 rounded-3xl animate-in fade-in slide-in-from-bottom duration-250">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  Đang chọn: <span className="text-brand-accent font-bold">
                    {format(currentSelection.start, 'HH:mm')} - {format(currentSelection.end, 'HH:mm')} ngày {format(currentSelection.start, 'dd/MM/yyyy')}
                  </span>
                </p>
                <p className="text-xs text-studio-muted">
                  {firstClickDate ? 'Click vào ô tiếp theo để chọn thời gian kết thúc.' : 'Click vào thời gian khác để thay đổi lựa chọn.'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSelection(null);
                    setFirstClickDate(null);
                  }}
                  className="py-3 px-5 rounded-2xl border border-white/10 hover:bg-white/5 text-white text-xs font-semibold cursor-pointer transition-all"
                >
                  Xóa lựa chọn
                </button>
                <button
                  type="button"
                  disabled={!!firstClickDate}
                  onClick={() => setModalOpen(true)}
                  className="py-3 px-6 rounded-2xl bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-semibold shadow-lg shadow-brand-primary/25 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tiếp tục đặt phòng
                </button>
              </div>
            </div>
          )
        )}

        {/* Create Booking Modal */}
        {modalOpen && getRangesToSubmit().length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setModalOpen(false)} />

            <div className="glass-panel max-w-lg w-full rounded-[32px] border border-white/5 overflow-hidden shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-brand-primary" />
                  <span>Đăng ký Đặt phòng Studio</span>
                </h3>
                <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl text-studio-muted hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleBookingSubmit} className="p-6 space-y-5 text-left">
                <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl space-y-2">
                  <p className="text-[10px] font-bold text-brand-primary uppercase">Khung giờ đặt phòng ({getRangesToSubmit().length})</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {getRangesToSubmit().map((range, idx) => (
                      <div key={idx} className="flex items-center space-x-3 text-sm text-white">
                        <Clock className="w-4 h-4 text-studio-muted shrink-0" />
                        <span>
                          {format(range.start, 'HH:mm')} - {format(range.end, 'HH:mm')} ngày {format(range.start, 'dd/MM/yyyy')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-studio-muted uppercase">Họ và tên người đặt</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-black/35 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-primary/50"
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-studio-muted uppercase flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Số người tham gia</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={participants}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        if (val > 40) {
                          toast('Studio chỉ chứa tối đa 40 người!', 'warning');
                          setParticipants(40);
                        } else {
                          setParticipants(val);
                        }
                      }}
                      className="w-full bg-black/35 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-primary/50"
                      disabled={submitting}
                      required
                    />
                  </div>
                  
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="text-[11px] font-bold text-studio-muted uppercase flex items-center space-x-1 mb-2">
                      <SupportIcon className="w-3.5 h-3.5" />
                      <span>Hỗ trợ kỹ thuật</span>
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={technicalSupport}
                        onChange={(e) => setTechnicalSupport(e.target.checked)}
                        className="sr-only peer animate-none"
                        disabled={submitting}
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-studio-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white border border-white/5"></div>
                      <span className="ml-3 text-xs text-studio-muted font-medium">Cần hỗ trợ kỹ thuật</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-studio-muted uppercase">Mục đích sử dụng phòng</label>
                    <span className={`text-[10px] font-bold ${purpose.length > 450 ? 'text-brand-error' : 'text-studio-muted'}`}>
                      {purpose.length} / 500
                    </span>
                  </div>
                  <textarea
                    placeholder="Nhập chi tiết mục đích..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    maxLength={500}
                    className="w-full bg-black/35 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-primary/50 h-20 resize-none break-words"
                    disabled={submitting}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white font-semibold py-3.5 rounded-2xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Gửi yêu cầu đặt phòng</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
