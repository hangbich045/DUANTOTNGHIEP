'use strict';
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  Calendar,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  X,
  Loader2,
  Sparkles,
  Info,
  ArrowRight,
  RefreshCcw,
  UserCheck,
  Check,
  AlertTriangle,
  Lock,
  Unlock,
  ShieldCheck,
  CalendarDays,
  Send,
  Eye,
  Trash2,
  Filter,
  Search,
  UserPlus,
  History,
  FileText,
  ExternalLink,
} from 'lucide-react';
import CollaboratorSelect from '@/components/common/CollaboratorSelect';
import WeeklyDutyScheduleTable from '@/components/WeeklyDutyScheduleTable';

interface DutyPeriodItem {
  id: string;
  month: number;
  year: number;
  status: 'OPEN' | 'CLOSED' | 'ARRANGING' | 'CONFIRMED';
  registrationDeadline?: string;
  isRegistrationExpired?: boolean;
  note?: string;
  registeredCtvCount?: number;
  assignedShiftCount?: number;
  creator?: { id: string; fullName: string; email: string };
  confirmer?: { id: string; fullName: string; email: string };
  createdAt: string;
}

interface CTVItem {
  id: string;
  fullName: string;
  email: string;
  employeeCode?: string;
  role?: string;
}

interface TaskSummaryItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  taskType?: string;
  actualHours?: number;
  isExternal?: boolean;
  assignedToUserId?: string;
  assigneeName?: string;
}

interface PeriodSummaryData {
  period: DutyPeriodItem;
  daysCount: number;
  daysMeta: Array<{ day: number; dayOfWeek: string; isSunday: boolean; dateStr: string }>;
  slots: Record<
    string,
    Record<
      'S' | 'C' | 'T',
      {
        registered: Array<{ id: string; user: CTVItem; note?: string; tasks?: TaskSummaryItem[]; hasTask?: boolean }>;
        assigned: Array<{ shiftId: string; user: CTVItem; status: string; note?: string; tasks?: TaskSummaryItem[]; hasTask?: boolean }>;
      }
    >
  >;
  tasksByUserAndDate?: Record<string, TaskSummaryItem[]>;
  tasksByDate?: Record<string, TaskSummaryItem[]>;
}

interface ScheduleHistoryItem {
  id: string;
  periodId?: string;
  shiftId?: string;
  action: 'ADD' | 'UPDATE' | 'DELETE';
  date: string;
  session: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  createdAt: string;
  changer?: { id: string; fullName: string; email: string };
  targetCollaborator?: { id: string; fullName: string; email: string; employeeCode?: string };
}

export default function AdminDutyManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [periods, setPeriods] = useState<DutyPeriodItem[]>([]);
  const [collaborators, setCollaborators] = useState<CTVItem[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummaryData | null>(null);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [confirmingSchedule, setConfirmingSchedule] = useState(false);

  // State cho Modal Xóa / Lưu trữ đợt đăng ký ca trực
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingPeriod, setDeletingPeriod] = useState<DutyPeriodItem | null>(null);
  const [deletionSafety, setDeletionSafety] = useState<any | null>(null);
  const [checkingSafety, setCheckingSafety] = useState(false);
  const [deletingPeriodLoading, setDeletingPeriodLoading] = useState(false);

  // Single Source of Truth cho ngày/tuần đang xem
  const [targetScheduleDate, setTargetScheduleDate] = useState<string | undefined>(undefined);
  const [activeWeekInfo, setActiveWeekInfo] = useState<{
    startDate: string;
    endDate: string;
    formattedRange: string;
    month: number;
    year: number;
    title: string;
  } | null>(null);

  // Lắng nghe thay đổi tuần từ Bảng tuần BPTT để đồng bộ tiêu đề và đợt tháng tương ứng
  const handleWeekChange = useCallback((weekInfo: any) => {
    setActiveWeekInfo(weekInfo);

    // Tự động đồng bộ selectedPeriodId nếu tuần đang xem thuộc tháng/năm khác
    setPeriods((currPeriods) => {
      const match = currPeriods.find((p) => p.month === weekInfo.month && p.year === weekInfo.year);
      if (match) {
        setSelectedPeriodId((prevId) => (prevId !== match.id ? match.id : prevId));
      }
      return currPeriods;
    });
  }, []);

  // Modal tạo đợt đăng ký mới (Giai đoạn 1)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newMonth, setNewMonth] = useState<number>(() => {
    const d = new Date();
    return d.getMonth() === 11 ? 1 : d.getMonth() + 2;
  });
  const [newYear, setNewYear] = useState<number>(() => {
    const d = new Date();
    return d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear();
  });
  const [newDeadline, setNewDeadline] = useState<string>('');
  const [isDeadlineUserModified, setIsDeadlineUserModified] = useState(false);
  const [newNote, setNewNote] = useState<string>('');
  const [creatingPeriod, setCreatingPeriod] = useState(false);

  // State cục bộ lưu phân công ca trực: localAssignments[dateStr][session] = [userId1, userId2]
  const [localAssignments, setLocalAssignments] = useState<Record<string, Record<'S' | 'C' | 'T', string[]>>>({});

  // Lý do chỉnh sửa lịch trực (khi sửa lịch đã CONFIRMED)
  const [editReason, setEditReason] = useState<string>('');

  // Bộ lọc CTV & Tìm kiếm nhanh trên Bảng tổng hợp ca trực
  const [filterCtvId, setFilterCtvId] = useState<string>('ALL');
  const [searchCtvTerm, setSearchCtvTerm] = useState<string>('');
  const [adminDutyViewMode, setAdminDutyViewMode] = useState<'WEEKLY_TABLE' | 'MONTHLY_MATRIX'>('WEEKLY_TABLE');

  // Modal phân công ca trực nhanh (Giai đoạn 3)
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetDate, setAssignTargetDate] = useState<string>('');
  const [assignTargetSession, setAssignTargetSession] = useState<'S' | 'C' | 'T'>('S');
  const [assignSelectedUserId, setAssignSelectedUserId] = useState<string>('');

  // Modal xem Lịch sử chỉnh sửa
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [histories, setHistories] = useState<ScheduleHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Popover sự vụ SV: lưu ID task hoặc key đang mở tooltip/popover
  const [activeTaskTooltipKey, setActiveTaskTooltipKey] = useState<string | null>(null);

  useEffect(() => {
    fetchPeriods();
    fetchCollaborators();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      fetchPeriodSummary(selectedPeriodId);
    } else {
      setPeriodSummary(null);
    }
  }, [selectedPeriodId]);

  const fetchCollaborators = async () => {
    try {
      const res: any = await api.get('/admin/collaborators?purpose=assign');
      let items: CTVItem[] = [];
      if (res && res.success && Array.isArray(res.data)) {
        items = res.data;
      } else if (Array.isArray(res)) {
        items = res;
      } else if (res && Array.isArray(res.data)) {
        items = res.data;
      } else if (res && res.data && Array.isArray(res.data.users)) {
        items = res.data.users;
      }
      setCollaborators(items.filter((u: any) => u.role === 'COLLABORATOR'));
    } catch (err) {
      console.error('Lỗi khi tải danh sách CTV:', err);
    }
  };

  const fetchPeriods = async () => {
    setLoadingList(true);
    try {
      const res = await api.get('/duty/periods');
      if (res.success && Array.isArray(res.data)) {
        setPeriods(res.data);
        if (res.data.length > 0 && !selectedPeriodId) {
          // Lấy tháng và năm hiện tại theo giờ VN (UTC+7)
          const nowVN = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date());
          const [curYear, curMonth] = nowVN.split('-').map(Number);

          // Ưu tiên chọn đợt của tháng hiện tại (Tháng 11/2026)
          const currentPeriod = res.data.find((p: any) => p.month === curMonth && p.year === curYear);
          if (currentPeriod) {
            setSelectedPeriodId(currentPeriod.id);
          } else {
            setSelectedPeriodId(res.data[0].id);
          }
        }
      } else {
        setPeriods([]);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tải danh sách đợt đăng ký', 'error');
    } finally {
      setLoadingList(false);
    }
  };

  const fetchPeriodSummary = async (periodId: string) => {
    setLoadingSummary(true);
    try {
      const res = await api.get(`/duty/periods/${periodId}/summary`);
      if (res.success && res.data) {
        setPeriodSummary(res.data);

        // Khởi tạo localAssignments từ dữ liệu assigned hiện có
        const initial: Record<string, Record<'S' | 'C' | 'T', string[]>> = {};
        for (const dm of res.data.daysMeta) {
          initial[dm.dateStr] = {
            S: (res.data.slots[dm.dateStr]?.S?.assigned || []).map((a: any) => a.user?.id).filter(Boolean),
            C: (res.data.slots[dm.dateStr]?.C?.assigned || []).map((a: any) => a.user?.id).filter(Boolean),
            T: (res.data.slots[dm.dateStr]?.T?.assigned || []).map((a: any) => a.user?.id).filter(Boolean),
          };
        }
        setLocalAssignments(initial);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tải bảng tổng hợp đăng ký', 'error');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Tính hạn chót mặc định theo quy tắc:
  // - Ngày hạn chót = ngày tạo + 2 ngày
  // - Tháng/năm hạn chót = tháng/năm của lịch trực được chọn
  const computeDefaultDeadline = (m: number, y: number): string => {
    const today = new Date();
    const targetDay = today.getDate() + 2;
    const maxDays = new Date(y, m, 0).getDate();
    const clampedDay = Math.min(targetDay, maxDays);
    return `${y}-${String(m).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
  };

  // Mở modal tạo đợt đăng ký mới với hạn chót tự động
  const handleOpenCreateModal = () => {
    const today = new Date();
    const nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const m = nextDate.getMonth() + 1;
    const y = nextDate.getFullYear();
    setNewMonth(m);
    setNewYear(y);
    setNewDeadline(computeDefaultDeadline(m, y));
    setIsDeadlineUserModified(false);
    setNewNote('');
    setCreateModalOpen(true);
  };

  // Xử lý khi Admin thay đổi tháng/năm tạo đợt
  const handleMonthYearChange = (m: number, y: number) => {
    setNewMonth(m);
    setNewYear(y);
    if (!isDeadlineUserModified) {
      setNewDeadline(computeDefaultDeadline(m, y));
    } else if (newDeadline) {
      // Đảm bảo ngày không vượt quá số ngày của tháng mới
      const parts = newDeadline.split('-');
      if (parts.length === 3) {
        const d = parseInt(parts[2], 10);
        const maxDays = new Date(y, m, 0).getDate();
        if (d > maxDays) {
          setNewDeadline(`${parts[0]}-${parts[1]}-${String(maxDays).padStart(2, '0')}`);
        }
      }
    }
  };

  // Tạo đợt đăng ký ca trực tháng mới (Giai đoạn 1)
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPeriod(true);
    try {
      const res = await api.post('/duty/periods', {
        month: newMonth,
        year: newYear,
        registrationDeadline: newDeadline ? new Date(newDeadline).toISOString() : undefined,
        note: newNote.trim() || undefined,
      });

      toast(`Đã tạo đợt đăng ký ca trực Tháng ${newMonth}/${newYear} thành công! Dữ liệu đã được làm mới và để trống.`, 'success');
      setCreateModalOpen(false);
      setNewNote('');
      setNewDeadline('');
      setIsDeadlineUserModified(false);
      await fetchPeriods();
      if (res.data?.id) {
        setSelectedPeriodId(res.data.id);
        setTargetScheduleDate(`${newYear}-${String(newMonth).padStart(2, '0')}-01`);
        fetchPeriodSummary(res.data.id);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('duty_schedule_updated'));
        try {
          const bc = new BroadcastChannel('lhu_media_duty_sync');
          bc.postMessage({ type: 'SCHEDULE_UPDATED' });
          bc.close();
        } catch (e) {}
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tạo đợt đăng ký', 'error');
    } finally {
      setCreatingPeriod(false);
    }
  };

  // Cập nhật trạng thái đợt đăng ký (Đóng / Mở lại)
  const handleUpdateStatus = async (status: 'OPEN' | 'CLOSED' | 'ARRANGING') => {
    if (!selectedPeriodId) return;
    try {
      await api.put(`/duty/periods/${selectedPeriodId}/status`, { status });
      toast(`Đã chuyển trạng thái đợt đăng ký sang: ${status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}`, 'success');
      fetchPeriods();
      fetchPeriodSummary(selectedPeriodId);
    } catch (err: any) {
      toast(err.message || 'Lỗi khi cập nhật trạng thái', 'error');
    }
  };

  // Mở modal xác nhận xóa và kiểm tra an toàn dữ liệu liên quan
  const handleOpenDeleteModal = async (period: DutyPeriodItem) => {
    setDeletingPeriod(period);
    setDeletionSafety(null);
    setDeleteModalOpen(true);
    setCheckingSafety(true);
    try {
      const res: any = await api.get(`/duty/periods/${period.id}/deletion-check`);
      if (res.success && res.data) {
        setDeletionSafety(res.data);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi kiểm tra dữ liệu đợt', 'error');
    } finally {
      setCheckingSafety(false);
    }
  };

  // Xác nhận xóa toàn bộ dữ liệu đợt đăng ký ca trực
  const handleConfirmDeletePeriod = async () => {
    if (!deletingPeriod) return;
    setDeletingPeriodLoading(true);
    try {
      const res: any = await api.delete(`/duty/periods/${deletingPeriod.id}`);

      toast(res.message || `Đã xóa toàn bộ dữ liệu đợt đăng ký ca trực Tháng ${deletingPeriod.month}/${deletingPeriod.year}!`, 'success');
      setDeleteModalOpen(false);

      const targetId = deletingPeriod.id;
      setPeriods((currPeriods) => {
        const remaining = currPeriods.filter((p) => p.id !== targetId);
        if (selectedPeriodId === targetId) {
          if (remaining.length > 0) {
            setSelectedPeriodId(remaining[0].id);
            setTargetScheduleDate(`${remaining[0].year}-${String(remaining[0].month).padStart(2, '0')}-01`);
          } else {
            setSelectedPeriodId(null);
            setPeriodSummary(null);
          }
        }
        return remaining;
      });

      await fetchPeriods();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('duty_schedule_updated'));
        try {
          const bc = new BroadcastChannel('lhu_media_duty_sync');
          bc.postMessage({ type: 'SCHEDULE_UPDATED' });
          bc.close();
        } catch (e) {}
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi xóa đợt đăng ký', 'error');
    } finally {
      setDeletingPeriodLoading(false);
    }
  };

  // Toggle phân công CTV vào một slot (ngày, session)
  // Admin được quyền thao tác cả khi đợt đã CONFIRMED
  const toggleAssignment = (dateStr: string, session: 'S' | 'C' | 'T', userId: string) => {
    setLocalAssignments((prev) => {
      const currentSlot = prev[dateStr]?.[session] || [];
      const isAssigned = currentSlot.includes(userId);
      const updatedSlot = isAssigned
        ? currentSlot.filter((id) => id !== userId)
        : [...currentSlot, userId];

      return {
        ...prev,
        [dateStr]: {
          ...(prev[dateStr] || { S: [], C: [], T: [] }),
          [session]: updatedSlot,
        },
      };
    });
  };

  // Lưu phân công ca trực (Hỗ trợ cả khi đợt đã CONFIRMED)
  const handleSaveAssignments = async () => {
    if (!selectedPeriodId || !periodSummary) return;

    const isConfirmed = periodSummary.period.status === 'CONFIRMED';
    const assignments: Array<{ date: string; session: 'S' | 'C' | 'T'; userId: string }> = [];
    for (const dateStr of Object.keys(localAssignments)) {
      for (const session of ['S', 'C', 'T'] as const) {
        const userIds = localAssignments[dateStr]?.[session] || [];
        for (const uid of userIds) {
          assignments.push({ date: dateStr, session, userId: uid });
        }
      }
    }

    setSavingAssignments(true);
    try {
      const res = await api.post(`/duty/periods/${selectedPeriodId}/assign`, {
        assignments,
        reason: editReason || (isConfirmed ? 'Nhân sự điều chỉnh lịch trực đã xác nhận' : undefined),
      });

      toast(
        res.message || (isConfirmed
          ? 'Đã cập nhật lịch trực đã xác nhận và gửi thông báo đến các CTV liên quan!'
          : `Đã lưu phân công ${assignments.length} ca trực thành công!`),
        'success'
      );
      setEditReason('');
      fetchPeriods();
      fetchPeriodSummary(selectedPeriodId);

      // Đồng bộ thời gian thực cho Lịch trực Studio
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('duty_schedule_updated'));
        try {
          const bc = new BroadcastChannel('lhu_media_duty_sync');
          bc.postMessage({ type: 'SCHEDULE_UPDATED' });
          bc.close();
        } catch (e) {}
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi lưu phân công ca trực', 'error');
    } finally {
      setSavingAssignments(false);
    }
  };

  // Xóa trực tiếp một ca trực đơn lẻ
  const handleDeleteSingleShift = async (shiftId: string, dateStr: string, session: 'S' | 'C' | 'T', userId: string, ctvName: string) => {
    const isConfirmed = periodSummary?.period.status === 'CONFIRMED';
    const confirmMsg = isConfirmed
      ? `Bạn có chắc chắn muốn XÓA ca trực ngày ${dateStr} (Buổi ${session}) của CTV ${ctvName}? Hệ thống sẽ tự động cập nhật chấm công và gửi thông báo hủy đến CTV.`
      : `Bạn có muốn xóa CTV ${ctvName} khỏi ca trực ngày ${dateStr} (Buổi ${session})?`;

    if (!confirm(confirmMsg)) return;

    try {
      if (shiftId) {
        await api.delete(`/duty/shifts/${shiftId}?reason=${encodeURIComponent('Nhân sự xóa ca trực khỏi lịch')}`);
        toast(`Đã xóa ca trực ngày ${dateStr} của CTV ${ctvName}!`, 'success');
      }
      // Đồng thời cập nhật state local
      toggleAssignment(dateStr, session, userId);
      if (selectedPeriodId) {
        fetchPeriodSummary(selectedPeriodId);
      }

      // Đồng bộ thời gian thực cho Lịch trực Studio
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('duty_schedule_updated'));
        try {
          const bc = new BroadcastChannel('lhu_media_duty_sync');
          bc.postMessage({ type: 'SCHEDULE_UPDATED' });
          bc.close();
        } catch (e) {}
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi xóa ca trực', 'error');
    }
  };

  // Xác nhận lịch trực tháng chính thức (CONFIRMED)
  const handleConfirmSchedule = async () => {
    if (!selectedPeriodId || !periodSummary) return;
    if (!confirm(`Bạn có chắc chắn muốn XÁC NHẬN CHÍNH THỨC lịch trực Tháng ${periodSummary.period.month}/${periodSummary.period.year}? Sau khi xác nhận, lịch trực sẽ được chốt và tự động đồng bộ vào Bảng chấm công.`)) {
      return;
    }

    setConfirmingSchedule(true);
    try {
      const assignments: Array<{ date: string; session: 'S' | 'C' | 'T'; userId: string }> = [];
      for (const dateStr of Object.keys(localAssignments)) {
        for (const session of ['S', 'C', 'T'] as const) {
          const userIds = localAssignments[dateStr]?.[session] || [];
          for (const uid of userIds) {
            assignments.push({ date: dateStr, session, userId: uid });
          }
        }
      }
      await api.post(`/duty/periods/${selectedPeriodId}/assign`, { assignments });

      const res = await api.post(`/duty/periods/${selectedPeriodId}/confirm-schedule`, {});
      toast(res.message || 'Đã xác nhận lịch trực tháng thành công!', 'success');
      fetchPeriods();
      fetchPeriodSummary(selectedPeriodId);

      // Đồng bộ thời gian thực cho Lịch trực Studio
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('duty_schedule_updated'));
        try {
          const bc = new BroadcastChannel('lhu_media_duty_sync');
          bc.postMessage({ type: 'SCHEDULE_UPDATED' });
          bc.close();
        } catch (e) {}
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi xác nhận lịch trực', 'error');
    } finally {
      setConfirmingSchedule(false);
    }
  };

  // Lấy lịch sử chỉnh sửa
  const handleOpenHistoryModal = async () => {
    if (!selectedPeriodId) return;
    setLoadingHistory(true);
    setHistoryModalOpen(true);
    try {
      const res = await api.get(`/duty/periods/${selectedPeriodId}/history`);
      if (res.success && Array.isArray(res.data)) {
        setHistories(res.data);
      } else {
        setHistories([]);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tải lịch sử chỉnh sửa', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusBadge = (status: DutyPeriodItem['status']) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Đang mở đăng ký</span>
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
            <Lock className="w-3 h-3" />
            <span>Đã đóng đăng ký</span>
          </span>
        );
      case 'ARRANGING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Đang sắp xếp</span>
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Đã xác nhận lịch</span>
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold mb-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Quy trình Quản lý Ca trực Studio CTV (FR-05)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Quản lý ca trực</h1>
            <p className="text-xs sm:text-sm text-studio-muted mt-1 max-w-2xl leading-relaxed">
              Khởi tạo đợt đăng ký ca trực tháng mới, tiếp nhận thời gian có thể trực của CTV, sắp xếp phân công, điều chỉnh và chốt lịch trực chính thức.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/payroll"
              className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-2.5 rounded-2xl border border-white/10 text-xs transition-all"
            >
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Xem Bảng chấm công</span>
            </Link>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center space-x-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-brand-primary/20 text-xs cursor-pointer transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo ca trực mới</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GIAI ĐOẠN 1: DANH SÁCH CÁC ĐỢT ĐĂNG KÝ THEO THÁNG                        */}
        {/* ========================================================================= */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-black/25 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-4 h-4 text-brand-primary" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Các đợt đăng ký ca trực theo tháng
              </h2>
            </div>
            <button
              onClick={fetchPeriods}
              className="p-1.5 rounded-xl border border-white/10 text-studio-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              title="Làm mới danh sách đợt"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingList ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
            </div>
          ) : periods.length === 0 ? (
            <div className="text-center py-8 bg-white/2 rounded-2xl border border-white/5 border-dashed">
              <Calendar className="w-8 h-8 text-studio-muted mx-auto mb-2 opacity-30" />
              <p className="text-xs text-white font-bold">Chưa có đợt đăng ký ca trực nào</p>
              <p className="text-[11px] text-studio-muted mt-0.5">
                Hãy nhấn &quot;Tạo ca trực mới&quot; để mở đợt đăng ký cho tháng tới.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {periods.map((p) => {
                const isSelected = selectedPeriodId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPeriodId(p.id);
                      setTargetScheduleDate(`${p.year}-${String(p.month).padStart(2, '0')}-01`);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary/10 shadow-lg shadow-brand-primary/10'
                        : 'border-white/5 bg-white/2 hover:border-white/15 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-white">
                        Tháng {p.month}/{p.year}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        {getStatusBadge(p.status)}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteModal(p);
                            }}
                            className="p-1 rounded-lg text-studio-muted hover:text-rose-400 hover:bg-rose-500/15 transition-all cursor-pointer"
                            title={`Xóa đợt đăng ký Tháng ${p.month}/${p.year}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-white/5">
                      <div>
                        <span className="text-studio-muted block">CTV đăng ký:</span>
                        <strong className="text-white text-xs">{p.registeredCtvCount || 0} CTV</strong>
                      </div>
                      <div>
                        <span className="text-studio-muted block">Ca phân công:</span>
                        <strong className="text-white text-xs">{p.assignedShiftCount || 0} ca</strong>
                      </div>
                    </div>

                    {p.registrationDeadline && (
                      <div className="flex items-center justify-between text-[10px] text-studio-muted pt-1 border-t border-white/5">
                        <span className="truncate">Hạn: {new Date(p.registrationDeadline).toLocaleDateString('vi-VN')}</span>
                        {p.isRegistrationExpired && (
                          <span className="text-rose-400 font-bold px-1.5 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">
                            Hết hạn
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* GIAI ĐOẠN 2 & 3: BẢNG SẮP XẾP, ĐIỀU CHỈNH & XÁC NHẬN LỊCH TRỰC THÁNG     */}
        {/* ========================================================================= */}
        {selectedPeriodId && periodSummary && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-black/25 space-y-5">
            {/* Thanh điều khiển đợt */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-black text-white">
                    {adminDutyViewMode === 'MONTHLY_MATRIX' ? (
                      <>
                        Sắp Xếp &amp; Phân Công Lịch Trực Tháng {periodSummary.period.month}/{periodSummary.period.year}
                      </>
                    ) : (
                      <>
                        Sắp Xếp &amp; Phân Công Lịch Trực Tháng {activeWeekInfo?.month || periodSummary.period.month}/{activeWeekInfo?.year || periodSummary.period.year}
                        {activeWeekInfo?.formattedRange && (
                          <span className="text-xs font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-lg border border-brand-primary/20 ml-2">
                            Tuần: {activeWeekInfo.formattedRange}
                          </span>
                        )}
                      </>
                    )}
                  </h2>
                  {getStatusBadge(periodSummary.period.status)}
                </div>
                <p className="text-xs text-studio-muted mt-0.5">
                  Xem danh sách CTV đăng ký có thể trực, phân công ca trực, đồng bộ sự vụ SV và quản lý lịch trực.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {periodSummary.period.status === 'OPEN' && (
                  <button
                    onClick={() => handleUpdateStatus('CLOSED')}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Đóng đăng ký</span>
                  </button>
                )}

                {periodSummary.period.status === 'CLOSED' && (
                  <button
                    onClick={() => handleUpdateStatus('OPEN')}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition-all cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Mở lại đăng ký</span>
                  </button>
                )}

                {/* Nút Xem Lịch Sử Chỉnh Sửa */}
                <button
                  onClick={handleOpenHistoryModal}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                  title="Xem lịch sử các lần chỉnh sửa ca trực"
                >
                  <History className="w-3.5 h-3.5 text-studio-muted" />
                  <span>Lịch sử chỉnh sửa</span>
                </button>

                {/* Khi chưa CONFIRMED: Nút Lưu phân công và Xác nhận chốt */}
                {periodSummary.period.status !== 'CONFIRMED' && (
                  <>
                    <button
                      onClick={handleSaveAssignments}
                      disabled={savingAssignments}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {savingAssignments ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Lưu phân công</span>
                    </button>

                    <button
                      onClick={handleConfirmSchedule}
                      disabled={confirmingSchedule}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-success hover:bg-brand-success/90 text-black text-xs font-bold shadow-md shadow-brand-success/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {confirmingSchedule ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>Xác nhận lịch trực tháng</span>
                    </button>
                  </>
                )}

                {/* Khi đã CONFIRMED: Admin ĐƯỢC PHÉP chỉnh sửa và lưu lại thay đổi */}
                {periodSummary.period.status === 'CONFIRMED' && (
                  <>
                    <button
                      onClick={handleSaveAssignments}
                      disabled={savingAssignments}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
                      title="Lưu các thay đổi trên lịch trực đã xác nhận và gửi thông báo đến các CTV bị ảnh hưởng"
                    >
                      {savingAssignments ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Lưu điều chỉnh lịch đã chốt</span>
                    </button>

                    <span className="text-xs text-purple-300 font-bold bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/20 flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      <span>Lịch đã chốt (Có thể sửa/xóa)</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Chuyển đổi giữa Bảng tuần BPTT (Mẫu chuẩn) và Ma trận tháng */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/3 p-3.5 rounded-2xl border border-white/5">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Chế độ xem lịch trực:</span>
                </h3>
              </div>

              <div className="flex items-center space-x-1.5 p-1 bg-white/5 rounded-2xl border border-white/10 self-start sm:self-auto shadow-inner">
                <button
                  type="button"
                  onClick={() => setAdminDutyViewMode('WEEKLY_TABLE')}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    adminDutyViewMode === 'WEEKLY_TABLE'
                      ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/30'
                      : 'text-studio-muted hover:text-white'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Bảng tuần BPTT (Mẫu chuẩn)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdminDutyViewMode('MONTHLY_MATRIX')}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    adminDutyViewMode === 'MONTHLY_MATRIX'
                      ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/30'
                      : 'text-studio-muted hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Ma trận phân công tháng</span>
                </button>
              </div>
            </div>

            {/* 1. Hiển thị BẢNG TUẦN BPTT CHUẨN THAM CHIẾU */}
            {adminDutyViewMode === 'WEEKLY_TABLE' && (
              <WeeklyDutyScheduleTable
                initialStartDate={targetScheduleDate}
                onWeekChange={handleWeekChange}
              />
            )}

            {/* 2. Hiển thị MA TRẬN PHÂN CÔNG THÁNG */}
            {adminDutyViewMode === 'MONTHLY_MATRIX' && (
              <>
                {/* Thanh Bộ lọc CTV và Tìm kiếm trên Ma trận ca trực */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-black/40 rounded-2xl border border-white/5">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Bộ chọn Tháng / Đợt trực trực tiếp trên Ma trận phân công */}
                <div className="flex items-center space-x-2 bg-black/60 border border-brand-primary/40 rounded-xl px-3 py-1.5 min-w-[200px] shadow-sm">
                  <Calendar className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span className="text-xs text-studio-muted whitespace-nowrap">Đợt tháng:</span>
                  <select
                    value={selectedPeriodId || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedPeriodId(e.target.value);
                      }
                    }}
                    className="bg-transparent text-xs text-brand-primary font-bold focus:outline-none cursor-pointer w-full"
                    title="Chọn tháng để xem ma trận phân công chi tiết"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#121216] text-white">
                        Tháng {p.month}/{p.year} {p.status === 'CONFIRMED' ? '✓ Đã chốt' : p.status === 'OPEN' ? '(Đang mở)' : '(Đang sắp xếp)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2 bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 min-w-[180px] max-w-xs">
                  <Filter className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  <span className="text-xs text-studio-muted whitespace-nowrap">Lọc CTV:</span>
                  <select
                    value={filterCtvId}
                    onChange={(e) => setFilterCtvId(e.target.value)}
                    className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer w-full truncate"
                  >
                    <option value="ALL" className="bg-[#121216]">Tất cả CTV</option>
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#121216]">
                        {c.fullName} ({c.employeeCode || c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2 bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 flex-1 min-w-[180px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-studio-muted shrink-0" />
                  <input
                    type="text"
                    placeholder="Tìm tên, email CTV..."
                    value={searchCtvTerm}
                    onChange={(e) => setSearchCtvTerm(e.target.value)}
                    className="bg-transparent text-xs text-white placeholder-studio-muted focus:outline-none w-full"
                  />
                  {searchCtvTerm && (
                    <button onClick={() => setSearchCtvTerm('')} className="text-studio-muted hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {(filterCtvId !== 'ALL' || searchCtvTerm) && (
                  <button
                    onClick={() => {
                      setFilterCtvId('ALL');
                      setSearchCtvTerm('');
                    }}
                    className="text-xs text-brand-primary hover:text-brand-primary/80 underline underline-offset-2 transition-all cursor-pointer font-medium"
                  >
                    Đặt lại bộ lọc
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setAssignTargetDate(periodSummary.daysMeta[0]?.dateStr || '');
                  setAssignTargetSession('S');
                  setAssignSelectedUserId(collaborators[0]?.id || '');
                  setAssignModalOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-brand-primary/20 hover:bg-brand-primary/30 border border-brand-primary/30 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5 text-brand-primary" />
                <span>Phân công nhanh</span>
              </button>
            </div>

            {/* Chú thích màu sắc & Quy tắc nghiệp vụ SV */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-studio-muted bg-white/2 p-3 rounded-2xl border border-white/5">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded bg-blue-500/40 border border-blue-500 inline-block"></span>
                <span>CTV đăng ký rảnh (Có thể trực)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
                <span>Đã phân công trực Studio</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="px-1.5 py-0.2 rounded bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[9px] font-black inline-block">
                  SV
                </span>
                <span>Sự vụ được giao trong ngày (Rê chuột xem danh sách nhiệm vụ)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500/40 inline-block"></span>
                <span>Chủ nhật</span>
              </span>
            </div>

            {/* Ma trận Lịch tháng 1..daysCount */}
            {loadingSummary ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-white/10 shadow-xl max-w-full">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-black/60 text-studio-muted border-b border-white/10 text-center font-bold">
                      <th className="p-2.5 border-r border-white/10 w-28 sticky left-0 bg-[#121216] z-10 text-left">
                        Buổi trực
                      </th>
                      {periodSummary.daysMeta.map((dm) => {
                        const dayTasks = periodSummary.tasksByDate?.[dm.dateStr] || [];
                        return (
                          <th
                            key={dm.day}
                            className={`p-2 border-r border-white/5 min-w-[130px] max-w-[160px] ${
                              dm.isSunday ? 'bg-rose-500/15 text-rose-300' : ''
                            }`}
                          >
                            <div className="text-xs font-bold text-white">{dm.day}</div>
                            <div className="text-[10px] font-normal opacity-70">{dm.dayOfWeek}</div>
                            {dayTasks.length > 0 && (
                              <div className="mt-0.5">
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-200 border border-purple-500/40 text-[9px] font-bold"
                                  title={`${dayTasks.length} nhiệm vụ được giao trong ngày này`}
                                >
                                  SV: {dayTasks.length}
                                </span>
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {(['S', 'C', 'T'] as const).map((session) => {
                      return (
                        <tr key={session} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="p-2.5 border-r border-white/10 sticky left-0 bg-[#121216] z-10 align-top">
                            <span className="font-bold text-white block">
                              {session === 'S' ? 'Ca Sáng' : session === 'C' ? 'Ca Chiều' : 'Ca Tối'}
                            </span>
                            <span className="text-[9px] text-studio-muted block">
                              {session === 'S' ? '07:30 - 11:30' : session === 'C' ? '13:00 - 17:00' : '17:30 - 21:30'}
                            </span>
                          </td>

                          {periodSummary.daysMeta.map((dm) => {
                            const slot = periodSummary.slots[dm.dateStr]?.[session] || { registered: [], assigned: [] };
                            const assignedUserIds = localAssignments[dm.dateStr]?.[session] || [];

                            const isFilterActive = filterCtvId !== 'ALL' || searchCtvTerm.trim() !== '';
                            const hasMatchingCollaborator =
                              !isFilterActive ||
                              slot.registered.some((r) => {
                                const matchId = filterCtvId === 'ALL' || r.user?.id === filterCtvId;
                                const matchSearch =
                                  !searchCtvTerm.trim() ||
                                  r.user?.fullName.toLowerCase().includes(searchCtvTerm.toLowerCase()) ||
                                  r.user?.email.toLowerCase().includes(searchCtvTerm.toLowerCase()) ||
                                  (r.user?.employeeCode && r.user.employeeCode.toLowerCase().includes(searchCtvTerm.toLowerCase()));
                                return matchId && matchSearch;
                              }) ||
                              assignedUserIds.some((uid) => {
                                const matchId = filterCtvId === 'ALL' || uid === filterCtvId;
                                const u = collaborators.find((c) => c.id === uid);
                                const matchSearch =
                                  !searchCtvTerm.trim() ||
                                  (u &&
                                    (u.fullName.toLowerCase().includes(searchCtvTerm.toLowerCase()) ||
                                      u.email.toLowerCase().includes(searchCtvTerm.toLowerCase()) ||
                                      (u.employeeCode && u.employeeCode.toLowerCase().includes(searchCtvTerm.toLowerCase()))));
                                return matchId && (matchSearch !== undefined ? matchSearch : true);
                              });

                            return (
                              <td
                                key={`${dm.dateStr}_${session}`}
                                className={`p-2 border-r border-white/5 align-top space-y-2 transition-all ${
                                  dm.isSunday ? 'bg-rose-500/5' : ''
                                } ${isFilterActive && !hasMatchingCollaborator ? 'opacity-30' : ''} ${
                                  isFilterActive && hasMatchingCollaborator ? 'ring-1 ring-brand-primary/50 bg-brand-primary/5 rounded-xl' : ''
                                }`}
                              >
                                {/* 1. DANH SÁCH CTV ĐÃ PHÂN CÔNG (ASSIGNED SHIFTS) */}
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-emerald-400 block mb-1">
                                    Phân công ({assignedUserIds.length}):
                                  </span>
                                  {assignedUserIds.length === 0 ? (
                                    <span className="text-[10px] text-white/30 italic block">Chưa phân công</span>
                                  ) : (
                                    <div className="space-y-1">
                                      {assignedUserIds.map((uid) => {
                                        const ctv = collaborators.find((c) => c.id === uid) ||
                                          slot.assigned.find((a) => a.user?.id === uid)?.user ||
                                          slot.registered.find((r) => r.user?.id === uid)?.user;
                                        const fullName = ctv?.fullName || 'CTV';
                                        const assignedItem = slot.assigned.find((a) => a.user?.id === uid);
                                        const shiftId = assignedItem?.shiftId || '';

                                        // Kiểm tra sự vụ SV của CTV trong ngày
                                        const ctvTasks = periodSummary.tasksByUserAndDate?.[`${dm.dateStr}_${uid}`] || [];
                                        const hasSv = ctvTasks.length > 0;
                                        const tooltipKey = `${dm.dateStr}_${session}_${uid}`;

                                        return (
                                          <div
                                            key={uid}
                                            className="p-1.5 rounded-lg border bg-emerald-500/20 border-emerald-500/40 text-[10px] flex items-center justify-between transition-all group relative"
                                          >
                                            <div className="flex items-center space-x-1 truncate max-w-[95px]">
                                              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                              <span className="truncate text-white font-bold" title={fullName}>
                                                {fullName}
                                              </span>
                                            </div>

                                            <div className="flex items-center space-x-1 shrink-0">
                                              {/* Ký hiệu SV hiển thị trực quan */}
                                              {hasSv && (
                                                <div className="relative">
                                                  <span
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setActiveTaskTooltipKey(activeTaskTooltipKey === tooltipKey ? null : tooltipKey);
                                                    }}
                                                    className="px-1 py-0.2 rounded bg-purple-600/40 text-purple-300 border border-purple-400/50 text-[9px] font-black cursor-pointer hover:bg-purple-600/70"
                                                    title={`Có ${ctvTasks.length} nhiệm vụ sự vụ được giao trong ngày`}
                                                  >
                                                    SV
                                                  </span>

                                                  {/* Tooltip / Popover danh sách nhiệm vụ */}
                                                  {activeTaskTooltipKey === tooltipKey && (
                                                    <div className="absolute right-0 bottom-full mb-1 z-50 w-64 p-3 rounded-2xl bg-[#141726] border border-[#2B3553] shadow-2xl text-[10px] text-white">
                                                      <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
                                                        <span className="font-bold text-purple-300 flex items-center space-x-1">
                                                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                                          <span>Nhiệm vụ sự vụ ({ctvTasks.length})</span>
                                                        </span>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveTaskTooltipKey(null);
                                                          }}
                                                          className="text-studio-muted hover:text-white"
                                                        >
                                                          <X className="w-3 h-3" />
                                                        </button>
                                                      </div>

                                                      <p className="text-[9px] text-studio-muted mb-2">
                                                        CTV: <strong className="text-white">{fullName}</strong> | Ngày: {dm.dateStr}
                                                      </p>

                                                      <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                                        {ctvTasks.map((t, idx) => (
                                                          <li key={t.id || idx} className="p-2 rounded-xl bg-white/5 border border-white/5 space-y-1">
                                                            <div className="flex items-center justify-between gap-1">
                                                              <span className="font-bold text-white text-[10px] leading-tight line-clamp-1">
                                                                {idx + 1}. {t.title}
                                                              </span>
                                                              <Link
                                                                href={`/admin/tasks?search=${encodeURIComponent(t.title)}`}
                                                                target="_blank"
                                                                className="text-purple-300 hover:text-white shrink-0 p-0.5 rounded hover:bg-white/10"
                                                                title="Xem chi tiết tại Quản lý Công việc"
                                                              >
                                                                <ExternalLink className="w-3 h-3" />
                                                              </Link>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[9px] text-studio-muted">
                                                              <span>{t.actualHours ? `${t.actualHours}h thực tế` : (t.taskType || 'Sự vụ')}</span>
                                                              <span className={t.status === 'COMPLETED' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                                                                {t.status === 'COMPLETED' ? 'Đã nghiệm thu' : 'Chưa nghiệm thu'}
                                                              </span>
                                                            </div>
                                                          </li>
                                                        ))}
                                                      </ul>

                                                      <p className="text-[8px] text-studio-muted/70 italic mt-2 pt-1 border-t border-white/5">
                                                        * Ký hiệu SV trên lịch chỉ để nhận biết có sự vụ. Chỉ tính công khi nghiệm thu thành công.
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              {/* Nút Xóa ca trực */}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteSingleShift(shiftId, dm.dateStr, session, uid, fullName);
                                                }}
                                                className="text-white/40 hover:text-rose-400 p-0.5 rounded transition-colors"
                                                title={`Xóa ca trực của ${fullName}`}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* 2. DANH SÁCH CTV ĐĂNG KÝ RẢNH (AVAILABILITY) */}
                                <div className="pt-1 border-t border-white/5">
                                  <span className="text-[9px] uppercase font-bold text-blue-400 block mb-1">
                                    Đăng ký rảnh ({slot.registered.length}):
                                  </span>
                                  {slot.registered.length === 0 ? (
                                    <span className="text-[10px] text-white/30 italic block">Không ai rảnh</span>
                                  ) : (
                                    <div className="space-y-1">
                                      {slot.registered.map((r) => {
                                        const isSelected = assignedUserIds.includes(r.user?.id);
                                        const ctvTasks = periodSummary.tasksByUserAndDate?.[`${dm.dateStr}_${r.user?.id}`] || [];
                                        const hasSv = ctvTasks.length > 0;

                                        return (
                                          <div
                                            key={r.id}
                                            onClick={() => toggleAssignment(dm.dateStr, session, r.user.id)}
                                            className={`p-1.5 rounded-lg border text-[10px] flex items-center justify-between transition-all cursor-pointer ${
                                              isSelected
                                                ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                                                : 'bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/20'
                                            }`}
                                            title={`Click để ${isSelected ? 'bỏ' : 'chọn'} phân công. ${r.user?.fullName}`}
                                          >
                                            <span className="truncate max-w-[85px]">{r.user?.fullName}</span>
                                            <div className="flex items-center space-x-1">
                                              {hasSv && (
                                                <span className="px-1 py-0.2 rounded bg-purple-600/30 text-purple-300 text-[8px] font-black">
                                                  SV
                                                </span>
                                              )}
                                              {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* 3. Phân công thêm CTV khác ngoài danh sách rảnh */}
                                <div className="pt-1 border-t border-white/5">
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        toggleAssignment(dm.dateStr, session, e.target.value);
                                      }
                                    }}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-1 text-[9px] text-studio-muted focus:outline-none focus:border-brand-primary cursor-pointer"
                                  >
                                    <option value="">+ Phân công CTV...</option>
                                    {collaborators.map((c) => (
                                      <option key={c.id} value={c.id} className="bg-[#121216] text-white">
                                        {c.fullName} ({c.employeeCode || c.email})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL TẠO ĐỢT ĐĂNG KÝ CA TRỰC MỚI (GIAI ĐOẠN 1)                           */}
        {/* ========================================================================= */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCreateModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-md w-full border border-[#2B3553] shadow-2xl bg-[#0e0e11] z-10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2.5">
                  <PlusCircle className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-base font-bold text-white">Tạo Đợt Đăng Ký Ca Trực Tháng</h3>
                </div>
                <button onClick={() => setCreateModalOpen(false)} className="text-studio-muted hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-300 leading-relaxed">
                Khởi tạo đợt đăng ký mới cho một tháng. Hệ thống sẽ tự động gửi thông báo đến toàn bộ CTV để CTV vào chọn những ngày/buổi có thể tham gia trực.
              </div>

              <form onSubmit={handleCreatePeriod} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-studio-muted uppercase block mb-1">Tháng *</label>
                    <select
                      value={newMonth}
                      onChange={(e) => handleMonthYearChange(parseInt(e.target.value, 10), newYear)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m} className="bg-[#121216]">
                          Tháng {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-studio-muted uppercase block mb-1">Năm *</label>
                    <select
                      value={newYear}
                      onChange={(e) => handleMonthYearChange(newMonth, parseInt(e.target.value, 10))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                    >
                      {[2025, 2026, 2027].map((y) => (
                        <option key={y} value={y} className="bg-[#121216]">
                          Năm {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-studio-muted uppercase">
                      Hạn chót đăng ký (Tự động thiết lập) *
                    </label>
                    <span className="text-[10px] text-brand-primary font-medium">
                      Mặc định: Ngày tạo + 2 ngày
                    </span>
                  </div>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => {
                      setNewDeadline(e.target.value);
                      setIsDeadlineUserModified(true);
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                  />
                  <p className="text-[10px] text-studio-muted mt-1 leading-normal">
                    Mặc định hạn chót: ngày {new Date().getDate() + 2}/{newMonth}/{newYear} (2 ngày sau ngày tạo bảng theo tháng/năm lịch trực). Bạn có thể chủ động chỉnh sửa ngày khác.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-studio-muted uppercase block mb-1">
                    Ghi chú / Hướng dẫn đăng ký
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Yêu cầu mỗi CTV đăng ký tối thiểu 3 ca trong tháng..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={creatingPeriod}
                    className="py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {creatingPeriod ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Tạo &amp; Gửi thông báo</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL PHÂN CÔNG NHANH (GIAI ĐOẠN 3)                                       */}
        {/* ========================================================================= */}
        {assignModalOpen && periodSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setAssignModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-md w-full border border-[#2B3553] shadow-2xl bg-[#0e0e11] z-10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2.5">
                  <UserPlus className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-base font-bold text-white">Phân Công Ca Trực Cho CTV</h3>
                </div>
                <button onClick={() => setAssignModalOpen(false)} className="text-studio-muted hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl text-xs text-brand-primary/90 leading-relaxed">
                Chọn ngày, buổi trực và Cộng tác viên. Bạn có thể phân công mới hoặc điều chỉnh lịch trực.
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!assignTargetDate || !assignSelectedUserId) {
                    toast('Vui lòng chọn ngày và CTV để phân công', 'warning');
                    return;
                  }
                  const currentSlot = localAssignments[assignTargetDate]?.[assignTargetSession] || [];
                  if (!currentSlot.includes(assignSelectedUserId)) {
                    toggleAssignment(assignTargetDate, assignTargetSession, assignSelectedUserId);
                    toast('Đã thêm CTV vào ca trực. Hãy nhấn "Lưu phân công" sau khi hoàn tất.', 'success');
                  } else {
                    toast('CTV này đã được phân công trong ca trực này rồi.', 'info');
                  }
                  setAssignModalOpen(false);
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="text-[11px] font-bold text-studio-muted uppercase block mb-1">
                    Ngày trực *
                  </label>
                  <select
                    value={assignTargetDate}
                    onChange={(e) => setAssignTargetDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                  >
                    {periodSummary.daysMeta.map((dm) => (
                      <option key={dm.dateStr} value={dm.dateStr} className="bg-[#121216]">
                        Ngày {dm.day} ({dm.dayOfWeek}) - {dm.dateStr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-studio-muted uppercase block mb-1">
                    Buổi trực *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { session: 'S', label: 'Ca Sáng', time: '07:30 - 11:30' },
                      { session: 'C', label: 'Ca Chiều', time: '13:00 - 17:00' },
                      { session: 'T', label: 'Ca Tối', time: '17:30 - 21:30' },
                    ].map((item) => (
                      <button
                        key={item.session}
                        type="button"
                        onClick={() => setAssignTargetSession(item.session as any)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          assignTargetSession === item.session
                            ? 'border-brand-primary bg-brand-primary/20 text-white font-bold'
                            : 'border-white/10 bg-black/40 text-studio-muted hover:text-white'
                        }`}
                      >
                        <span className="block text-xs">{item.label}</span>
                        <span className="text-[9px] opacity-75">{item.time}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-studio-muted uppercase block mb-1">
                    Chọn Cộng tác viên *
                  </label>
                  <CollaboratorSelect
                    purpose="assign"
                    value={assignSelectedUserId}
                    onChange={(val) => setAssignSelectedUserId(val)}
                    placeholder="-- Chọn CTV phân công --"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Phân công vào ca</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL XEM LỊCH SỬ CHỈNH SỬA CA TRỰC                                      */}
        {/* ========================================================================= */}
        {historyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setHistoryModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-[#2B3553] shadow-2xl bg-[#0e0e11] z-10 space-y-5 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2.5">
                  <History className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white">Lịch Sử Chỉnh Sửa Lịch Trực Studio</h3>
                </div>
                <button onClick={() => setHistoryModalOpen(false)} className="text-studio-muted hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                  </div>
                ) : histories.length === 0 ? (
                  <div className="text-center py-12 text-xs text-studio-muted">
                    Chưa có lịch sử chỉnh sửa nào được ghi nhận cho đợt trực này.
                  </div>
                ) : (
                  histories.map((h) => {
                    const sessLabel = h.session === 'S' ? 'Sáng' : h.session === 'C' ? 'Chiều' : 'Tối';
                    return (
                      <div key={h.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              h.action === 'ADD'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : h.action === 'DELETE'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {h.action === 'ADD' ? 'THÊM CA TRỰC' : h.action === 'DELETE' ? 'XÓA CA TRỰC' : 'ĐỔI CA TRỰC'}
                          </span>
                          <span className="text-[10px] text-studio-muted">
                            {new Date(h.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <div className="text-white font-medium">
                          Ngày trực: <strong className="text-brand-primary">{h.date}</strong> (Buổi {sessLabel})
                          {h.targetCollaborator && (
                            <span> — CTV: <strong className="text-purple-300">{h.targetCollaborator.fullName}</strong></span>
                          )}
                        </div>

                        <div className="text-[11px] text-studio-muted flex items-center justify-between">
                          <span>Người thực hiện: <strong className="text-white">{h.changer?.fullName || 'Admin'}</strong></span>
                          {h.reason && <span className="italic truncate max-w-xs">&quot;{h.reason}&quot;</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-white/5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(false)}
                  className="py-2 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL XÁC NHẬN XÓA / LƯU TRỮ ĐỢT ĐĂNG KÝ CA TRỰC THEO THÁNG             */}
        {/* ========================================================================= */}
        {deleteModalOpen && deletingPeriod && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !deletingPeriodLoading && setDeleteModalOpen(false)}
            />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-lg w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                      deletionSafety?.hasHistoricalData
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {deletionSafety?.hasHistoricalData ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {deletionSafety?.hasHistoricalData
                        ? 'Lưu Trữ / Hủy Đợt Đăng Ký'
                        : 'Xác Nhận Xóa Đợt Đăng Ký'}
                    </h3>
                    <p className="text-xs text-studio-muted mt-0.5">
                      Tháng {deletingPeriod.month}/{deletingPeriod.year} &bull; Phân hệ Quản lý ca trực
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deletingPeriodLoading}
                  className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer disabled:opacity-40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              {checkingSafety ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-7 h-7 animate-spin text-brand-primary" />
                  <p className="text-xs text-studio-muted">
                    Đang kiểm tra dữ liệu nguyện vọng CTV, ca phân công và bảng chấm công...
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Thông tin đợt đăng ký */}
                  <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-studio-muted">Đợt đăng ký:</span>
                      <span className="font-bold text-white text-sm">
                        Tháng {deletingPeriod.month}/{deletingPeriod.year}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-studio-muted">Trạng thái:</span>
                      <div>{getStatusBadge(deletingPeriod.status)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[11px]">
                      <div>
                        <span className="text-studio-muted block">CTV đăng ký:</span>
                        <strong className="text-white">
                          {deletionSafety?.regCount ?? deletingPeriod.registeredCtvCount ?? 0} lượt
                        </strong>
                      </div>
                      <div>
                        <span className="text-studio-muted block">Ca phân công:</span>
                        <strong className="text-white">
                          {deletionSafety?.shiftCount ?? deletingPeriod.assignedShiftCount ?? 0} ca
                          {deletionSafety?.confirmedShiftCount ? ` (${deletionSafety.confirmedShiftCount} ca đã chốt)` : ''}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Cảnh báo xóa toàn bộ dữ liệu */}
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-200 space-y-2">
                    <div className="font-bold flex items-center space-x-1.5 text-rose-300">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Xác nhận xóa toàn bộ dữ liệu đợt này</span>
                    </div>
                    <p className="leading-relaxed text-xs text-rose-200/90">
                      Bạn có chắc chắn muốn xóa đợt đăng ký ca trực <strong>Tháng {deletingPeriod.month}/{deletingPeriod.year}</strong>?
                    </p>
                    <p className="text-[11px] text-rose-300/80 leading-relaxed">
                      Toàn bộ dữ liệu của đợt này bao gồm nguyện vọng đăng ký của CTV ({deletionSafety?.regCount ?? deletingPeriod.registeredCtvCount ?? 0} lượt), các ca trực đã phân công ({deletionSafety?.shiftCount ?? deletingPeriod.assignedShiftCount ?? 0} ca) và dữ liệu chấm công liên quan sẽ bị xóa hoàn toàn khỏi hệ thống. Khi tạo lại đợt mới, dữ liệu sẽ hoàn toàn được làm mới và để trống.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteModalOpen(false)}
                      disabled={deletingPeriodLoading}
                      className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-xs disabled:opacity-40"
                    >
                      Hủy bỏ
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmDeletePeriod}
                      disabled={deletingPeriodLoading}
                      className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer text-xs disabled:opacity-40 flex items-center justify-center space-x-1.5 shadow-lg shadow-rose-600/20"
                    >
                      {deletingPeriodLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Xác nhận xóa toàn bộ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
