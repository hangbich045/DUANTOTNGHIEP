'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  CalendarDays,
  Clock,
  Sparkles,
  User as UserIcon,
  Search,
  X,
  RefreshCw,
  Info,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  CheckSquare,
  Tag,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { TASK_TYPES, CAMPUSES, requiresLocation } from '@/lib/constants';

const HOURS_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export interface TaskDetail {
  id: string;
  title: string;
  description?: string;
  taskType?: string;
  otherTaskType?: string;
  actualHours?: number;
  status: string;
  startTime?: string;
  deadline?: string;
  executionDate?: string;
  shiftSession?: string;
  assignedToUserId?: string;
  note?: string;
  location?: string;
  campus?: string;
  room?: string;
  creatorName?: string;
  creatorAvatar?: string | null;
  createdAtFormatted?: string;
  executionTimeFormatted?: string;
  fullDisplay: string;
}

export interface DaySlot {
  symbol: string;
  isOfficial?: boolean;
  isWish?: boolean;
  shift?: {
    id: string;
    shiftType: string;
    status: string;
    startTime?: string;
    endTime?: string;
    note?: string;
  } | null;
  registration?: {
    id: string;
    session: string;
    note?: string;
  } | null;
  tasks: TaskDetail[];
  hasNote: boolean;
}

export interface UserScheduleRow {
  stt: number;
  user: {
    id: string;
    fullName: string;
    email: string;
    employeeCode?: string;
    avatarUrl?: string;
    role: string;
  };
  days: Record<
    string,
    {
      S: DaySlot;
      C: DaySlot;
      T: DaySlot;
      dayTasks: TaskDetail[];
    }
  >;
  summary: {
    totalShifts: number;
    sc: number;
    sv: number;
    d: number;
    dp: number;
    np: number;
    sx: number;
  };
}

export interface WeekDayMeta {
  dateStr: string;
  dayName: string;
  dayOfMonth: number;
  month: number;
  year: number;
  formattedDate: string;
  isSunday: boolean;
  isToday: boolean;
}

export interface WeeklyScheduleData {
  weekRange: {
    startDate: string;
    endDate: string;
    title: string;
  };
  weekDays: WeekDayMeta[];
  rows: UserScheduleRow[];
  columnTotals: {
    days: Record<string, { S: number; C: number; T: number }>;
    totalShifts: number;
    sc: number;
    sv: number;
    d: number;
    dp: number;
    np: number;
    sx: number;
    dk?: number;
  };
  todayStr: string;
  dutyPeriod?: {
    id: string;
    month: number;
    year: number;
    status: 'OPEN' | 'CLOSED' | 'ARRANGING' | 'CONFIRMED';
    registrationDeadline?: string;
  } | null;
}

export interface WeekChangeInfo {
  startDate: string;
  endDate: string;
  formattedRange: string;
  month: number;
  year: number;
  title: string;
}

interface WeeklyDutyScheduleTableProps {
  initialStartDate?: string;
  currentUserId?: string;
  className?: string;
  onOpenRegisterModal?: () => void;
  onWeekChange?: (weekInfo: WeekChangeInfo) => void;
}

export default function WeeklyDutyScheduleTable({
  initialStartDate,
  currentUserId,
  className = '',
  onOpenRegisterModal,
  onWeekChange,
}: WeeklyDutyScheduleTableProps) {
  // Trạng thái ngày bắt đầu tuần (YYYY-MM-DD), mặc định tuần chứa ngày hiện tại theo giờ VN (UTC+7)
  const [currentDateStr, setCurrentDateStr] = useState<string>(() => {
    if (initialStartDate && initialStartDate.length === 10) return initialStartDate;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  });

  const prevInitialRef = useRef<string | undefined>(initialStartDate);
  // Đồng bộ khi initialStartDate từ component cha thực sự thay đổi do người dùng chọn đợt khác
  useEffect(() => {
    if (initialStartDate && initialStartDate !== prevInitialRef.current && initialStartDate.length === 10) {
      prevInitialRef.current = initialStartDate;
      setCurrentDateStr(initialStartDate);
    }
  }, [initialStartDate]);

  const [scheduleData, setScheduleData] = useState<WeeklyScheduleData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'COLLABORATOR' | 'ADMIN'>('ALL');

  // Tooltip popup popover state
  const [activeTooltip, setActiveTooltip] = useState<{
    key: string;
    tasks: TaskDetail[];
    dateStr: string;
    session: string;
    userName: string;
    symbol?: string;
    isWish?: boolean;
    note?: string;
  } | null>(null);

  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const datePickerInputRef = useRef<HTMLInputElement | null>(null);

  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';
  const { toast } = useToast();

  // Modal Giao việc trực tiếp từ ô lịch
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetUser, setAssignTargetUser] = useState<UserScheduleRow['user'] | null>(null);
  const [assignDateStr, setAssignDateStr] = useState('');
  const [assignSession, setAssignSession] = useState<'S' | 'C' | 'T'>('S');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDescription, setAssignDescription] = useState('');
  const [assignTaskType, setAssignTaskType] = useState('Viết content');
  const [assignOtherTaskType, setAssignOtherTaskType] = useState('');
  const [assignCampus, setAssignCampus] = useState('');
  const [assignRoom, setAssignRoom] = useState('');
  const [assignDeadlineDate, setAssignDeadlineDate] = useState('');
  const [assignDeadlineHour, setAssignDeadlineHour] = useState('17');
  const [assignDeadlineMinute, setAssignDeadlineMinute] = useState('00');
  const [assignLocationNote, setAssignLocationNote] = useState('');
  const assignDatePickerRef = useRef<HTMLInputElement>(null);
  const [creatingTask, setCreatingTask] = useState(false);

  // Modal Chỉnh sửa nhiệm vụ từ Lịch trực
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false);
  const [editingTaskData, setEditingTaskData] = useState<TaskDetail | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTaskType, setEditTaskType] = useState('Viết content');
  const [editOtherTaskType, setEditOtherTaskType] = useState('');
  const [editCampus, setEditCampus] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editDeadlineDate, setEditDeadlineDate] = useState('');
  const [editDeadlineHour, setEditDeadlineHour] = useState('17');
  const [editDeadlineMinute, setEditDeadlineMinute] = useState('00');
  const [editLocationNote, setEditLocationNote] = useState('');
  const editDatePickerRef = useRef<HTMLInputElement>(null);
  const [updatingTask, setUpdatingTask] = useState(false);

  // Modal Xác nhận xóa nhiệm vụ
  const [deleteTaskModalOpen, setDeleteTaskModalOpen] = useState(false);
  const [deletingTaskItem, setDeletingTaskItem] = useState<TaskDetail | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  const handleOpenAssignModal = (
    user: UserScheduleRow['user'],
    dateStr: string,
    session: 'S' | 'C' | 'T'
  ) => {
    if (!isAdmin) return;
    setAssignTargetUser(user);
    setAssignDateStr(dateStr);
    setAssignSession(session);
    setAssignTitle('');
    setAssignDescription('');
    setAssignTaskType('Viết content');
    setAssignOtherTaskType('');
    setAssignCampus('');
    setAssignRoom('');
    setAssignDeadlineDate(dateStr);
    setAssignDeadlineHour(session === 'S' ? '11' : session === 'C' ? '17' : '21');
    setAssignDeadlineMinute(session === 'S' || session === 'T' ? '30' : '00');
    setAssignLocationNote('');
    setAssignModalOpen(true);
  };

  const handleCreateTaskFromSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetUser) return;
    if (!assignTitle.trim()) {
      toast('Vui lòng nhập tiêu đề công việc', 'warning');
      return;
    }
    if (assignTaskType === 'Khác' && !assignOtherTaskType.trim()) {
      toast('Vui lòng nhập tên loại công việc tùy chỉnh khi chọn Khác', 'warning');
      return;
    }
    const isLocReq = requiresLocation(assignTaskType);
    if (!assignDeadlineDate || !assignDeadlineDate.trim()) {
      toast(isLocReq ? 'Vui lòng chọn ngày bắt đầu thực hiện' : 'Vui lòng chọn ngày hạn chót hoàn thành (Deadline)', 'warning');
      return;
    }
    if (!assignDeadlineHour || !assignDeadlineMinute) {
      toast(isLocReq ? 'Vui lòng chọn đầy đủ giờ và phút bắt đầu thực hiện' : 'Vui lòng chọn đầy đủ giờ và phút hạn chót hoàn thành', 'warning');
      return;
    }
    const targetIso = `${assignDeadlineDate}T${assignDeadlineHour.padStart(2, '0')}:${assignDeadlineMinute.padStart(2, '0')}:00`;
    const targetDateObj = new Date(targetIso);
    if (isNaN(targetDateObj.getTime())) {
      toast(isLocReq ? 'Thời gian bắt đầu không hợp lệ. Vui lòng kiểm tra lại' : 'Thời gian hạn chót hoàn thành không hợp lệ. Vui lòng kiểm tra lại', 'warning');
      return;
    }

    const finalCampus = isLocReq && assignCampus ? assignCampus.trim() : null;
    const finalRoom = isLocReq && assignRoom ? assignRoom.trim() : null;
    const finalLocation = isLocReq
      ? [finalCampus, finalRoom].filter(Boolean).join(' - ') || null
      : null;

    setCreatingTask(true);
    try {
      await api.post('/tasks', {
        title: assignTitle.trim(),
        description: assignDescription.trim() || undefined,
        assignedToUserId: assignTargetUser.id,
        taskType: assignTaskType,
        otherTaskType: assignTaskType === 'Khác' ? assignOtherTaskType.trim() : undefined,
        campus: finalCampus,
        room: finalRoom,
        location: finalLocation,
        startTime: isLocReq ? targetDateObj.toISOString() : undefined,
        deadline: !isLocReq ? targetDateObj.toISOString() : undefined,
        executionDate: assignDateStr,
        shiftSession: assignSession,
        note: finalLocation || assignLocationNote.trim() || undefined,
      });

      toast(`Đã giao nhiệm vụ cho ${assignTargetUser.fullName} và cập nhật ký hiệu SV lên Lịch trực!`, 'success');
      setAssignModalOpen(false);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('duty_schedule_updated'));
        window.dispatchEvent(new CustomEvent('task_updated'));
        try {
          const bc = new BroadcastChannel('lhu_media_duty_sync');
          bc.postMessage({ type: 'SCHEDULE_UPDATED' });
          bc.close();
        } catch (e) {}
      }

      fetchWeeklySchedule(currentDateStr, true);
    } catch (err: any) {
      toast(err.message || 'Lỗi khi giao nhiệm vụ', 'error');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleOpenEditTaskModal = (task: TaskDetail) => {
    if (!isAdmin) return;
    setEditingTaskData(task);
    setEditTitle(task.title || '');
    setEditDescription(task.description || '');
    setEditTaskType(task.taskType || 'Viết content');
    setEditOtherTaskType((task as any).otherTaskType || '');

    // Phân tích hoặc gán địa điểm thực hiện (Cơ sở & Phòng)
    let c = task.campus || '';
    let r = task.room || '';
    if (!c && !r && (task.location || task.note)) {
      const locText = task.location || task.note || '';
      for (const campus of CAMPUSES) {
        if (locText.startsWith(campus)) {
          c = campus;
          r = locText.replace(campus, '').replace(/^[\s\-–:]+/, '').trim();
          break;
        }
      }
      if (!c) r = locText;
    }
    setEditCampus(c);
    setEditRoom(r);
    setEditLocationNote(task.location || task.note || '');

    const rawTime = (task as any).startTime || (task as any).deadline;
    if (rawTime) {
      try {
        const d = new Date(rawTime);
        const pad = (n: number) => String(n).padStart(2, '0');
        setEditDeadlineDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        setEditDeadlineHour(pad(d.getHours()));
        setEditDeadlineMinute(pad(d.getMinutes()));
      } catch {
        setEditDeadlineDate('');
        setEditDeadlineHour('17');
        setEditDeadlineMinute('00');
      }
    } else {
      setEditDeadlineDate('');
      setEditDeadlineHour('17');
      setEditDeadlineMinute('00');
    }

    setEditTaskModalOpen(true);
  };

  const handleUpdateTaskFromSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskData) return;
    if (!editTitle.trim()) {
      toast('Vui lòng nhập tiêu đề công việc', 'warning');
      return;
    }
    if (editTaskType === 'Khác' && !editOtherTaskType.trim()) {
      toast('Vui lòng nhập tên loại công việc tùy chỉnh khi chọn Khác', 'warning');
      return;
    }
    const isLocReq = requiresLocation(editTaskType);
    if (!editDeadlineDate || !editDeadlineDate.trim()) {
      toast(isLocReq ? 'Vui lòng chọn ngày bắt đầu thực hiện' : 'Vui lòng chọn ngày hạn chót hoàn thành (Deadline)', 'warning');
      return;
    }
    if (!editDeadlineHour || !editDeadlineMinute) {
      toast(isLocReq ? 'Vui lòng chọn đầy đủ giờ và phút bắt đầu thực hiện' : 'Vui lòng chọn đầy đủ giờ và phút hạn chót hoàn thành', 'warning');
      return;
    }
    const targetIso = `${editDeadlineDate}T${editDeadlineHour.padStart(2, '0')}:${editDeadlineMinute.padStart(2, '0')}:00`;
    const targetDateObj = new Date(targetIso);
    if (isNaN(targetDateObj.getTime())) {
      toast(isLocReq ? 'Thời gian bắt đầu không hợp lệ. Vui lòng kiểm tra lại' : 'Thời gian hạn chót hoàn thành không hợp lệ. Vui lòng kiểm tra lại', 'warning');
      return;
    }

    const finalCampus = isLocReq && editCampus ? editCampus.trim() : null;
    const finalRoom = isLocReq && editRoom ? editRoom.trim() : null;
    const finalLocation = isLocReq
      ? [finalCampus, finalRoom].filter(Boolean).join(' - ') || null
      : null;

    setUpdatingTask(true);
    try {
      await api.put(`/tasks/${editingTaskData.id}`, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        taskType: editTaskType,
        otherTaskType: editTaskType === 'Khác' ? editOtherTaskType.trim() : undefined,
        campus: finalCampus,
        room: finalRoom,
        location: finalLocation,
        startTime: isLocReq ? targetDateObj.toISOString() : undefined,
        deadline: !isLocReq ? targetDateObj.toISOString() : undefined,
        note: finalLocation || editLocationNote.trim() || undefined,
      });

      toast('Đã cập nhật nhiệm vụ thành công!', 'success');
      setEditTaskModalOpen(false);
      setActiveTooltip(null);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('duty_schedule_updated'));
        window.dispatchEvent(new CustomEvent('task_updated'));
        try {
          const bc = new BroadcastChannel('lhu_media_duty_sync');
          bc.postMessage({ type: 'SCHEDULE_UPDATED' });
          bc.close();
        } catch (e) {}
      }

      fetchWeeklySchedule(currentDateStr, true);
    } catch (err: any) {
      toast(err.message || 'Lỗi khi cập nhật nhiệm vụ', 'error');
    } finally {
      setUpdatingTask(false);
    }
  };

  const handleDeleteTaskFromSchedule = async () => {
    if (!deletingTaskItem) return;
    setDeletingTask(true);
    try {
      await api.delete(`/tasks/${deletingTaskItem.id}`);
      toast('Đã xóa nhiệm vụ thành công!', 'success');
      setDeleteTaskModalOpen(false);
      setDeletingTaskItem(null);
      setActiveTooltip(null);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('duty_schedule_updated'));
        window.dispatchEvent(new CustomEvent('task_updated'));
        try {
          const bc = new BroadcastChannel('lhu_media_duty_sync');
          bc.postMessage({ type: 'SCHEDULE_UPDATED' });
          bc.close();
        } catch (e) {}
      }

      fetchWeeklySchedule(currentDateStr, true);
    } catch (err: any) {
      toast(err.message || 'Lỗi khi xóa nhiệm vụ', 'error');
    } finally {
      setDeletingTask(false);
    }
  };

  // Mở Date Picker khi nhấp vào phần hiển thị khoảng tuần
  const handleOpenDatePicker = () => {
    if (datePickerInputRef.current) {
      if (typeof datePickerInputRef.current.showPicker === 'function') {
        try {
          datePickerInputRef.current.showPicker();
        } catch (e) {
          datePickerInputRef.current.focus();
        }
      } else {
        datePickerInputRef.current.focus();
      }
    }
  };

  // Đóng tooltip khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Đồng bộ khi initialStartDate từ component cha thay đổi
  useEffect(() => {
    if (initialStartDate && initialStartDate.length === 10) {
      setCurrentDateStr(initialStartDate);
    }
  }, [initialStartDate]);

  // Fetch dữ liệu tuần từ backend
  const fetchWeeklySchedule = async (targetDateStr: string, isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res: any = await api.get(`/duty/weekly-schedule?startDate=${targetDateStr}`);
      const payload = res?.data || (res?.success ? res.data : null) || res;
      if (payload && (payload.rows || payload.weekDays)) {
        setScheduleData(payload);
      } else if (res?.data?.success && res.data?.data) {
        setScheduleData(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải bảng phân công lịch làm việc tuần:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklySchedule(currentDateStr);
  }, [currentDateStr]);

  // Đồng bộ thời gian thực: lắng nghe sự kiện custom event, BroadcastChannel và tự động làm mới theo chu kỳ
  useEffect(() => {
    const handleSync = () => {
      fetchWeeklySchedule(currentDateStr, true);
    };

    window.addEventListener('duty_schedule_updated', handleSync);
    window.addEventListener('task_updated', handleSync);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('lhu_media_duty_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'SCHEDULE_UPDATED') {
          handleSync();
        }
      };
    } catch (e) {
      // ignore BroadcastChannel if not available
    }

    // Polling tự động mỗi 15 giây
    const intervalId = setInterval(handleSync, 15000);

    return () => {
      window.removeEventListener('duty_schedule_updated', handleSync);
      window.removeEventListener('task_updated', handleSync);
      if (bc) bc.close();
      clearInterval(intervalId);
    };
  }, [currentDateStr]);

  // Helper tính thứ 2 (Monday) của một ngày bất kỳ theo chuẩn YYYY-MM-DD
  const getMondayStr = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 10) return dateStr;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    const dow = dt.getDay();
    const diff = (dow === 0 ? -6 : 1) - dow;
    const mon = new Date(dt);
    mon.setDate(dt.getDate() + diff);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`;
  };

  // Thứ 2 của tuần hiện tại đang xem
  const currentMondayStr = useMemo(() => {
    if (scheduleData?.weekDays?.[0]?.dateStr) {
      return scheduleData.weekDays[0].dateStr;
    }
    return getMondayStr(currentDateStr);
  }, [scheduleData?.weekDays, currentDateStr]);

  // Chuỗi hiển thị khoảng ngày tuần hiện tại (ví dụ: 16/11 – 22/11/2026)
  const formattedWeekRange = useMemo(() => {
    if (scheduleData?.weekDays && scheduleData.weekDays.length >= 7) {
      const first = scheduleData.weekDays[0];
      const last = scheduleData.weekDays[6];
      const pad = (n: number) => String(n).padStart(2, '0');
      if (first.year !== last.year) {
        return `${pad(first.dayOfMonth)}/${pad(first.month)}/${first.year} – ${pad(last.dayOfMonth)}/${pad(last.month)}/${last.year}`;
      }
      return `${pad(first.dayOfMonth)}/${pad(first.month)} – ${pad(last.dayOfMonth)}/${pad(last.month)}/${last.year}`;
    }
    if (currentMondayStr && currentMondayStr.length === 10) {
      const [y, m, d] = currentMondayStr.split('-').map(Number);
      const sun = new Date(y, m - 1, d + 6, 12, 0, 0);
      const pad = (n: number) => String(n).padStart(2, '0');
      if (y !== sun.getFullYear()) {
        return `${pad(d)}/${pad(m)}/${y} – ${pad(sun.getDate())}/${pad(sun.getMonth() + 1)}/${sun.getFullYear()}`;
      }
      return `${pad(d)}/${pad(m)} – ${pad(sun.getDate())}/${pad(sun.getMonth() + 1)}/${sun.getFullYear()}`;
    }
    return '';
  }, [scheduleData?.weekDays, currentMondayStr]);

  // Thông báo sự thay đổi tuần lên component cha (Single Source of Truth)
  useEffect(() => {
    if (scheduleData?.weekRange && scheduleData.weekDays && scheduleData.weekDays.length >= 7) {
      const startD = scheduleData.weekDays[0].dateStr;
      const endD = scheduleData.weekDays[scheduleData.weekDays.length - 1].dateStr;
      const midDay = scheduleData.weekDays[3] || scheduleData.weekDays[0];
      onWeekChange?.({
        startDate: startD,
        endDate: endD,
        formattedRange: formattedWeekRange,
        month: midDay.month,
        year: midDay.year,
        title: scheduleData.weekRange.title,
      });
    }
  }, [scheduleData, formattedWeekRange, onWeekChange]);

  // Điều hướng tuần (Lùi / Tiến 7 ngày an toàn)
  const handlePrevWeek = () => {
    const baseDateStr = scheduleData?.weekDays?.[0]?.dateStr || currentMondayStr;
    if (!baseDateStr) return;
    const [y, m, d] = baseDateStr.split('-').map(Number);
    const prevMon = new Date(y, m - 1, d - 7, 12, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    setCurrentDateStr(`${prevMon.getFullYear()}-${pad(prevMon.getMonth() + 1)}-${pad(prevMon.getDate())}`);
  };

  const handleNextWeek = () => {
    const baseDateStr = scheduleData?.weekDays?.[0]?.dateStr || currentMondayStr;
    if (!baseDateStr) return;
    const [y, m, d] = baseDateStr.split('-').map(Number);
    const nextMon = new Date(y, m - 1, d + 7, 12, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    setCurrentDateStr(`${nextMon.getFullYear()}-${pad(nextMon.getMonth() + 1)}-${pad(nextMon.getDate())}`);
  };

  // Ngày hiện tại thời gian thực (chuẩn múi giờ VN UTC+7)
  const clientTodayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }, []);

  const effectiveTodayStr = scheduleData?.todayStr || clientTodayStr;

  // Lọc danh sách nhân sự
  const filteredRows = useMemo(() => {
    if (!scheduleData?.rows) return [];
    return scheduleData.rows.filter((row) => {
      const matchRole = roleFilter === 'ALL' || row.user.role === roleFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        row.user.fullName.toLowerCase().includes(query) ||
        row.user.email.toLowerCase().includes(query) ||
        (row.user.employeeCode && row.user.employeeCode.toLowerCase().includes(query));
      return matchRole && matchSearch;
    });
  }, [scheduleData?.rows, roleFilter, searchQuery]);

  // Ký hiệu màu sắc badge
  const renderSymbolBadge = (
    sym: string,
    slot: DaySlot,
    dateStr: string,
    session: string,
    userName: string
  ) => {
    if (!sym) return null;

    const cellKey = `${userName}_${dateStr}_${session}`;
    const isWishSlot = Boolean(slot.isWish || sym === 'ĐK');
    const hasNote = slot.hasNote || (slot.tasks && slot.tasks.length > 0) || isWishSlot;

    let badgeClass = '';
    let text = sym;
    let hoverTitle = '';

    switch (sym) {
      case 'LV':
        badgeClass = 'bg-blue-600/20 text-blue-300 border-blue-500/30';
        hoverTitle = 'LV: Ca trực Studio chính thức (Đã xác nhận)';
        break;
      case 'SV':
        badgeClass = 'bg-purple-600/30 text-purple-200 border-purple-500/50 font-black';
        hoverTitle = slot.tasks && slot.tasks.length > 0
          ? `Sự vụ: ${slot.tasks.map((t) => t.title).join('; ')} (Nhấp để xem chi tiết)`
          : 'Sự vụ CTV được giao trong ngày (Nhấp để xem chi tiết)';
        break;
      case 'ĐK':
        badgeClass = 'bg-amber-500/15 text-amber-300 border border-dashed border-amber-400/60 font-semibold';
        hoverTitle = 'ĐK: Nguyện vọng có thể trực Studio (Chờ Nhân sự phân công)';
        break;
      case 'NL':
        badgeClass = 'bg-amber-600/25 text-amber-300 border-amber-500/40';
        hoverTitle = 'NL: Nghỉ lễ';
        break;
      case 'DP':
        badgeClass = 'bg-teal-600/25 text-teal-300 border-teal-500/40';
        hoverTitle = 'DP: Dự phòng';
        break;
      case 'NP':
        badgeClass = 'bg-rose-600/25 text-rose-300 border-rose-500/40';
        hoverTitle = 'NP: Nghỉ phép';
        break;
      case 'SX':
        badgeClass = 'bg-indigo-600/25 text-indigo-300 border-indigo-500/40';
        hoverTitle = 'SX: Sản xuất';
        break;
      default:
        badgeClass = 'bg-white/10 text-white/90 border-white/20';
        hoverTitle = `${sym}`;
    }

    return (
      <div
        className="relative group inline-flex items-center justify-center w-full h-full min-h-[32px] cursor-pointer"
        title={hoverTitle}
        onClick={(e) => {
          if (hasNote || isAdmin) {
            e.stopPropagation();
            setActiveTooltip(
              activeTooltip?.key === cellKey
                ? null
                : {
                    key: cellKey,
                    tasks: slot.tasks || [],
                    dateStr,
                    session,
                    userName,
                    symbol: sym,
                    isWish: isWishSlot,
                    note: slot.shift?.note || slot.registration?.note,
                  }
            );
          }
        }}
      >
        <span
          className={`px-1.5 py-0.5 rounded text-[11px] font-bold border transition-transform hover:scale-110 select-none ${badgeClass}`}
        >
          {text}
        </span>

        {/* Tam giác chỉ báo ghi chú góc trên phải (Marker tương tự Excel Note khi có Sự vụ SV) */}
        {hasNote && sym === 'SV' && (
          <span
            className="absolute top-0.5 right-0.5 w-0 h-0 border-t-[7px] border-l-[7px] border-t-amber-400 border-l-transparent drop-shadow"
            title="Nhấp hoặc rê chuột để xem chi tiết sự vụ"
          />
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Header Toolbar: Bộ lọc tuần, tháng, vai trò & Điều hướng */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 bg-black/40 space-y-3.5">
        {/* Hàng 1: Bộ điều hướng tuần (thay thế nút Hôm nay) & Chỉ báo đồng bộ thời gian thực */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Bộ điều hướng tuần: Nút lùi, Phần hiển thị & chọn tuần (16/11 – 22/11/2026), Nút tiến */}
          <div className="flex items-center space-x-1.5 bg-white/5 border border-white/10 rounded-2xl p-1 shadow-inner self-start">
            <button
              type="button"
              onClick={handlePrevWeek}
              disabled={loading}
              className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
              title="Tuần trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Vị trí nút Hôm nay trước đây: Chuyển thành phần hiển thị tuần hiện tại & Date Picker chọn ngày */}
            <div className="relative group flex items-center">
              <button
                type="button"
                onClick={handleOpenDatePicker}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-primary/20 hover:bg-brand-primary/30 border border-brand-primary/40 hover:border-brand-primary transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm select-none"
                title="Nhấp để mở lịch chọn ngày / tuần bất kỳ"
              >
                <Calendar className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                <span className="tracking-wide font-black">
                  {formattedWeekRange || 'Đang tải tuần...'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-brand-primary/70 group-hover:text-brand-primary transition-colors shrink-0" />
              </button>
              {/* Native Date picker mở khi click vào khoảng tuần */}
              <input
                ref={datePickerInputRef}
                type="date"
                value={currentDateStr}
                onChange={(e) => {
                  if (e.target.value) {
                    const pickedDate = e.target.value;
                    const mondayStr = getMondayStr(pickedDate);
                    setCurrentDateStr(mondayStr);
                  }
                }}
                aria-label="Chọn ngày trên lịch để chuyển sang tuần tương ứng"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-none"
                tabIndex={-1}
              />
            </div>

            <button
              type="button"
              onClick={handleNextWeek}
              disabled={loading}
              className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
              title="Tuần sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* CHỈ BÁO THỜI GIAN THỰC (Không dùng nhãn/nút Hôm nay) */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs shadow-sm self-start sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-bold tracking-wide">
              Đồng bộ thời gian thực
            </span>
          </div>
        </div>

        {/* Hàng 2: Bộ lọc vai trò nhân sự, Tìm kiếm, Đăng ký lịch rảnh & Nút làm mới */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Lọc theo Vai trò nhân sự */}
            <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 text-xs shadow-inner">
              <Filter className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="text-studio-muted font-medium whitespace-nowrap">Vai trò:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'ALL' | 'COLLABORATOR' | 'ADMIN')}
                aria-label="Lọc theo vai trò"
                className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#121624] text-white">Tất cả nhân sự ({scheduleData?.rows?.length || 0})</option>
                <option value="COLLABORATOR" className="bg-[#121624] text-white">Cộng tác viên (CTV)</option>
                <option value="ADMIN" className="bg-[#121624] text-white">Quản trị viên (Admin)</option>
              </select>
            </div>

            {/* Ô tìm kiếm nhân sự */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-studio-muted" />
              <input
                type="text"
                placeholder="Tìm tên, email CTV..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-studio-muted focus:outline-none focus:border-brand-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-studio-muted hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            {/* Nút Đăng ký lịch rảnh khi đợt trực mở */}
            {onOpenRegisterModal && (
              <button
                type="button"
                onClick={onOpenRegisterModal}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 shadow-md shadow-amber-500/10 transition-all cursor-pointer"
                title="Đăng ký hoặc chỉnh sửa thời gian có thể trực trong tháng"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Đăng ký lịch rảnh{scheduleData?.dutyPeriod ? ` (Tháng ${scheduleData.dutyPeriod.month}/${scheduleData.dutyPeriod.year})` : ''}</span>
              </button>
            )}

            {/* Nút Refresh */}
            <button
              type="button"
              onClick={() => fetchWeeklySchedule(currentDateStr)}
              disabled={loading}
              className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-studio-muted hover:text-white transition-all cursor-pointer disabled:opacity-40"
              title="Cập nhật dữ liệu mới nhất"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-primary' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tiêu đề Bảng chuẩn tham chiếu */}
      <div className="text-center py-2 px-4 rounded-2xl bg-gradient-to-r from-blue-900/20 via-brand-primary/15 to-purple-900/20 border border-brand-primary/30 shadow-lg">
        <h2 className="text-base sm:text-lg font-black tracking-wide text-white uppercase flex items-center justify-center space-x-2">
          <CalendarDays className="w-5 h-5 text-brand-primary" />
          <span>
            {scheduleData?.weekRange?.title || (formattedWeekRange ? `BẢNG PHÂN CÔNG LỊCH LÀM VIỆC NHÂN SỰ BPTT (Ngày ${formattedWeekRange})` : 'BẢNG PHÂN CÔNG LỊCH LÀM VIỆC NHÂN SỰ BPTT')}
          </span>
        </h2>
        <p className="text-[11px] text-studio-muted mt-0.5">
          Dữ liệu trực Studio và phân công sự vụ được cập nhật đồng bộ từ CSDL thời gian thực
        </p>
      </div>

      {/* 3. Chú thích ký hiệu & Quy ước chuẩn BPTT */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white/3 px-4 py-2.5 rounded-2xl border border-white/5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center space-x-1.5">
            <span className="px-1.5 py-0.2 rounded bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
              LV
            </span>
            <span className="text-studio-muted">Làm việc / Trực Studio (4h)</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <span className="relative px-1.5 py-0.2 rounded bg-purple-600/40 text-purple-200 border border-purple-500/60 text-[10px] font-black">
              SV
              <span className="absolute top-0 right-0 w-0 h-0 border-t-[5px] border-l-[5px] border-t-amber-400 border-l-transparent" />
            </span>
            <span className="text-studio-muted">Sự vụ (Rê/nhấp chuột xem chi tiết &amp; địa điểm)</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <span className="px-1.5 py-0.2 rounded bg-amber-600/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
              NL
            </span>
            <span className="text-studio-muted">Nghỉ lễ</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <span className="px-1.5 py-0.2 rounded bg-teal-600/30 text-teal-300 border border-teal-500/40 text-[10px] font-bold">
              DP
            </span>
            <span className="text-studio-muted">Dự phòng</span>
          </span>

          <span className="flex items-center space-x-1.5">
            <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-dashed border-amber-400/60 text-[10px] font-bold">
              ĐK
            </span>
            <span className="text-studio-muted">Nguyện vọng có thể trực (Lịch rảnh)</span>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-studio-muted">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
            <span className="text-yellow-300 font-semibold">Ngày hiện tại</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-500/30 border border-rose-500/50 inline-block"></span>
            <span>Chủ nhật</span>
          </span>
        </div>
      </div>

      {/* 4. Ma trận Bảng tuần Chuẩn tham chiếu */}
      <div className="relative rounded-3xl border border-white/10 bg-black/35 shadow-2xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-primary" />
            <p className="text-xs text-studio-muted font-medium">Đang tải lịch phân công BPTT...</p>
          </div>
        ) : !scheduleData || filteredRows.length === 0 ? (
          <div className="text-center py-20 px-4">
            <Info className="w-10 h-10 text-studio-muted mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold text-white">Không tìm thấy nhân sự phù hợp</p>
            <p className="text-xs text-studio-muted mt-1">
              {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Chưa có phân công lịch trực trong tuần này'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse text-[11px] min-w-[1100px]">
              {/* Header 2 tầng */}
              <thead>
                {/* Hàng 1: STT, Nhân sự, Số lượng, 7 ngày, Nhóm số lượng, Tình trạng */}
                <tr className="bg-[#181820] text-studio-muted border-b border-white/10 text-center font-bold">
                  <th
                    rowSpan={2}
                    className="p-2.5 border-r border-white/10 w-12 sticky left-0 bg-[#181820] z-20 text-center"
                  >
                    STT
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2.5 border-r border-white/10 min-w-[160px] max-w-[200px] sticky left-12 bg-[#181820] z-20 text-left"
                  >
                    NHÂN SỰ
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border-r border-white/10 w-16 text-center text-white"
                    title="Tổng số buổi phân công trong tuần"
                  >
                    Số lượng
                  </th>

                  {/* 7 Cột Ngày trong tuần */}
                  {scheduleData.weekDays.map((wd) => {
                    const isToday = wd.isToday || wd.dateStr === effectiveTodayStr;
                    const isSun = wd.isSunday;

                    let bgHeader = 'bg-[#181820]';
                    if (isToday) bgHeader = 'bg-amber-400/25 text-yellow-300 border-x border-amber-400/40 shadow-inner';
                    else if (isSun) bgHeader = 'bg-rose-500/15 text-rose-200';

                    return (
                      <th
                        key={wd.dateStr}
                        colSpan={3}
                        className={`p-2 border-r border-white/10 transition-colors ${bgHeader}`}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span className={`font-extrabold ${isToday ? 'text-yellow-300 drop-shadow' : 'text-white'}`}>
                            {wd.dayName}
                          </span>
                        </div>
                        <div className={`text-[10px] font-medium mt-0.5 ${isToday ? 'text-yellow-200 font-bold' : 'opacity-80'}`}>
                          {wd.formattedDate}
                        </div>
                      </th>
                    );
                  })}

                  {/* Nhóm cột: Số lượng buổi làm */}
                  <th
                    colSpan={3}
                    className="p-2 border-r border-white/10 bg-blue-900/25 text-blue-200 font-black text-center"
                  >
                    Số lượng buổi làm
                  </th>

                  {/* Nhóm cột: Tình trạng */}
                  <th
                    colSpan={3}
                    className="p-2 bg-purple-900/25 text-purple-200 font-black text-center"
                  >
                    Tình trạng
                  </th>
                </tr>

                {/* Hàng 2: S-C-T cho từng ngày + SC-SV-D + DP-NP-SX */}
                <tr className="bg-[#14141c] text-studio-muted border-b border-white/10 text-center font-semibold text-[10px]">
                  {/* S - C - T lặp lại cho 7 ngày */}
                  {scheduleData.weekDays.map((wd) => {
                    const isToday = wd.isToday || wd.dateStr === effectiveTodayStr;
                    const isSun = wd.isSunday;

                    let cellBg = '';
                    if (isToday) cellBg = 'bg-amber-400/15 text-yellow-300 font-bold';
                    else if (isSun) cellBg = 'bg-rose-500/10 text-rose-300';

                    return (
                      <React.Fragment key={wd.dateStr}>
                        <th className={`p-1.5 border-r border-white/5 w-9 ${cellBg}`}>S</th>
                        <th className={`p-1.5 border-r border-white/5 w-9 ${cellBg}`}>C</th>
                        <th className={`p-1.5 border-r border-white/10 w-9 ${cellBg}`}>T</th>
                      </React.Fragment>
                    );
                  })}

                  {/* Sub-columns: Số lượng buổi làm */}
                  <th className="p-1.5 border-r border-white/5 w-9 bg-blue-900/15 text-blue-300" title="Số ca trực Studio (LV)">
                    SC
                  </th>
                  <th className="p-1.5 border-r border-white/5 w-9 bg-blue-900/15 text-purple-300 font-bold" title="Số buổi sự vụ (SV)">
                    SV
                  </th>
                  <th className="p-1.5 border-r border-white/10 w-9 bg-blue-900/15 text-blue-300" title="Số buổi tối/đêm (T)">
                    D
                  </th>

                  {/* Sub-columns: Tình trạng */}
                  <th className="p-1.5 border-r border-white/5 w-9 bg-purple-900/15 text-teal-300" title="Dự phòng">
                    DP
                  </th>
                  <th className="p-1.5 border-r border-white/5 w-9 bg-purple-900/15 text-rose-300" title="Nghỉ phép">
                    NP
                  </th>
                  <th className="p-1.5 w-9 bg-purple-900/15 text-indigo-300" title="Sản xuất / Sắp xếp">
                    SX
                  </th>
                </tr>
              </thead>

              {/* Data Rows: Từng nhân sự */}
              <tbody>
                {filteredRows.map((row, idx) => {
                  const isCurrentLoggedUser = currentUserId === row.user.id;
                  const rowBg = isCurrentLoggedUser
                    ? 'bg-brand-primary/10 hover:bg-brand-primary/15'
                    : idx % 2 === 0
                    ? 'bg-transparent hover:bg-white/3'
                    : 'bg-white/[0.015] hover:bg-white/3';

                  const stickyBg = isCurrentLoggedUser ? 'bg-[#1a202c]' : 'bg-[#121216]';

                  return (
                    <tr
                      key={row.user.id}
                      className={`border-b border-white/5 transition-colors ${rowBg}`}
                    >
                      {/* STT */}
                      <td
                        className={`p-2 border-r border-white/10 sticky left-0 ${stickyBg} z-10 text-center font-bold text-studio-muted`}
                      >
                        {row.stt}
                      </td>

                      {/* Tên nhân sự */}
                      <td
                        className={`p-2.5 border-r border-white/10 sticky left-12 ${stickyBg} z-10 font-medium`}
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              row.user.role === 'ADMIN'
                                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                                : 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30'
                            }`}
                          >
                            {row.user.avatarUrl ? (
                              <img
                                src={row.user.avatarUrl}
                                alt={row.user.fullName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              row.user.fullName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="truncate">
                            <span
                              className={`truncate block text-xs font-semibold ${
                                isCurrentLoggedUser ? 'text-brand-primary font-bold' : 'text-white'
                              }`}
                              title={row.user.fullName}
                            >
                              {row.user.fullName}
                              {isCurrentLoggedUser && (
                                <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-brand-primary/20 text-brand-primary">
                                  Tôi
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-studio-muted truncate block">
                              {row.user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột Số lượng (Tổng số buổi trong tuần của người này) */}
                      <td className="p-2 border-r border-white/10 text-center font-bold text-white text-xs">
                        {row.summary.totalShifts > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white">
                            {row.summary.totalShifts}
                          </span>
                        ) : (
                          <span className="text-studio-muted font-normal">0</span>
                        )}
                      </td>

                      {/* 7 Ngày x 3 Buổi (S, C, T) */}
                      {scheduleData.weekDays.map((wd) => {
                        const daySlot = row.days[wd.dateStr] || {
                          S: { symbol: '', tasks: [], hasNote: false },
                          C: { symbol: '', tasks: [], hasNote: false },
                          T: { symbol: '', tasks: [], hasNote: false },
                          dayTasks: [],
                        };

                        const isToday = wd.isToday || wd.dateStr === effectiveTodayStr;
                        const isSun = wd.isSunday;

                        let cellBg = '';
                        if (isToday) cellBg = 'bg-amber-400/10';
                        else if (isSun) cellBg = 'bg-rose-500/5';

                        return (
                          <React.Fragment key={wd.dateStr}>
                            {/* Ca Sáng */}
                            <td
                              onClick={() => {
                                if (isAdmin && !daySlot.S.symbol) {
                                  handleOpenAssignModal(row.user, wd.dateStr, 'S');
                                }
                              }}
                              className={`p-1 border-r border-white/5 text-center align-middle relative group/cell ${cellBg} ${
                                isAdmin && !daySlot.S.symbol ? 'cursor-pointer hover:bg-brand-primary/10' : ''
                              }`}
                            >
                              {daySlot.S.symbol ? (
                                renderSymbolBadge(
                                  daySlot.S.symbol,
                                  daySlot.S,
                                  wd.dateStr,
                                  'S',
                                  row.user.fullName
                                )
                              ) : isAdmin ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAssignModal(row.user, wd.dateStr, 'S');
                                  }}
                                  className="w-full h-7 rounded-lg opacity-0 group-hover/cell:opacity-100 hover:bg-brand-primary/20 text-brand-primary border border-dashed border-brand-primary/40 flex items-center justify-center transition-all cursor-pointer text-[10px] font-bold"
                                  title={`Giao nhiệm vụ: ${row.user.fullName} - ${wd.formattedDate} (Sáng)`}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              ) : null}
                            </td>

                            {/* Ca Chiều */}
                            <td
                              onClick={() => {
                                if (isAdmin && !daySlot.C.symbol) {
                                  handleOpenAssignModal(row.user, wd.dateStr, 'C');
                                }
                              }}
                              className={`p-1 border-r border-white/5 text-center align-middle relative group/cell ${cellBg} ${
                                isAdmin && !daySlot.C.symbol ? 'cursor-pointer hover:bg-brand-primary/10' : ''
                              }`}
                            >
                              {daySlot.C.symbol ? (
                                renderSymbolBadge(
                                  daySlot.C.symbol,
                                  daySlot.C,
                                  wd.dateStr,
                                  'C',
                                  row.user.fullName
                                )
                              ) : isAdmin ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAssignModal(row.user, wd.dateStr, 'C');
                                  }}
                                  className="w-full h-7 rounded-lg opacity-0 group-hover/cell:opacity-100 hover:bg-brand-primary/20 text-brand-primary border border-dashed border-brand-primary/40 flex items-center justify-center transition-all cursor-pointer text-[10px] font-bold"
                                  title={`Giao nhiệm vụ: ${row.user.fullName} - ${wd.formattedDate} (Chiều)`}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              ) : null}
                            </td>

                            {/* Ca Tối */}
                            <td
                              onClick={() => {
                                if (isAdmin && !daySlot.T.symbol) {
                                  handleOpenAssignModal(row.user, wd.dateStr, 'T');
                                }
                              }}
                              className={`p-1 border-r border-white/10 text-center align-middle relative group/cell ${cellBg} ${
                                isAdmin && !daySlot.T.symbol ? 'cursor-pointer hover:bg-brand-primary/10' : ''
                              }`}
                            >
                              {daySlot.T.symbol ? (
                                renderSymbolBadge(
                                  daySlot.T.symbol,
                                  daySlot.T,
                                  wd.dateStr,
                                  'T',
                                  row.user.fullName
                                )
                              ) : isAdmin ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAssignModal(row.user, wd.dateStr, 'T');
                                  }}
                                  className="w-full h-7 rounded-lg opacity-0 group-hover/cell:opacity-100 hover:bg-brand-primary/20 text-brand-primary border border-dashed border-brand-primary/40 flex items-center justify-center transition-all cursor-pointer text-[10px] font-bold"
                                  title={`Giao nhiệm vụ: ${row.user.fullName} - ${wd.formattedDate} (Tối)`}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              ) : null}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* Thống kê: Số lượng buổi làm (SC, SV, D) */}
                      <td className="p-2 border-r border-white/5 text-center font-bold text-blue-300 bg-blue-900/5">
                        {row.summary.sc}
                      </td>
                      <td className="p-2 border-r border-white/5 text-center font-black text-purple-300 bg-purple-900/10">
                        {row.summary.sv}
                      </td>
                      <td className="p-2 border-r border-white/10 text-center font-semibold text-blue-300 bg-blue-900/5">
                        {row.summary.d}
                      </td>

                      {/* Thống kê: Tình trạng (DP, NP, SX) */}
                      <td className="p-2 border-r border-white/5 text-center font-medium text-teal-300 bg-teal-900/5">
                        {row.summary.dp}
                      </td>
                      <td className="p-2 border-r border-white/5 text-center font-medium text-rose-300 bg-rose-900/5">
                        {row.summary.np}
                      </td>
                      <td className="p-2 text-center font-medium text-indigo-300 bg-indigo-900/5">
                        {row.summary.sx}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Hàng TỔNG cộng ở đáy bảng */}
              <tfoot>
                <tr className="bg-[#161620] text-white border-t-2 border-white/20 font-black text-center text-xs">
                  <td
                    colSpan={2}
                    className="p-3 border-r border-white/10 sticky left-0 bg-[#161620] z-20 text-center tracking-wider uppercase text-amber-300"
                  >
                    TỔNG
                  </td>
                  <td className="p-2 border-r border-white/10 text-center text-amber-300 text-sm">
                    {scheduleData.columnTotals.totalShifts}
                  </td>

                  {/* Tổng S, C, T cho từng ngày */}
                  {scheduleData.weekDays.map((wd) => {
                    const dayTotal = scheduleData.columnTotals.days[wd.dateStr] || { S: 0, C: 0, T: 0 };
                    const isToday = wd.isToday || wd.dateStr === effectiveTodayStr;
                    const cellBg = isToday ? 'bg-amber-400/25 text-yellow-300 font-black' : '';

                    return (
                      <React.Fragment key={wd.dateStr}>
                        <td className={`p-2 border-r border-white/5 ${cellBg}`}>{dayTotal.S}</td>
                        <td className={`p-2 border-r border-white/5 ${cellBg}`}>{dayTotal.C}</td>
                        <td className={`p-2 border-r border-white/10 ${cellBg}`}>{dayTotal.T}</td>
                      </React.Fragment>
                    );
                  })}

                  {/* Tổng SC, SV, D */}
                  <td className="p-2 border-r border-white/5 text-blue-300 bg-blue-900/20">
                    {scheduleData.columnTotals.sc}
                  </td>
                  <td className="p-2 border-r border-white/5 text-purple-300 bg-purple-900/25">
                    {scheduleData.columnTotals.sv}
                  </td>
                  <td className="p-2 border-r border-white/10 text-blue-300 bg-blue-900/20">
                    {scheduleData.columnTotals.d}
                  </td>

                  {/* Tổng DP, NP, SX */}
                  <td className="p-2 border-r border-white/5 text-teal-300 bg-teal-900/20">
                    {scheduleData.columnTotals.dp}
                  </td>
                  <td className="p-2 border-r border-white/5 text-rose-300 bg-rose-900/20">
                    {scheduleData.columnTotals.np}
                  </td>
                  <td className="p-2 text-indigo-300 bg-indigo-900/20">
                    {scheduleData.columnTotals.sx}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 5. Tooltip / Note Card Popover khi nhấp hoặc rê chuột vào ô SV */}
      {activeTooltip && (
        <div
          ref={tooltipRef}
          className="fixed inset-0 sm:inset-auto z-50 flex items-center justify-center sm:block p-4 sm:p-0 pointer-events-auto"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Lớp phủ mờ trên màn hình nhỏ */}
          <div
            className="fixed inset-0 bg-black/60 sm:hidden"
            onClick={() => setActiveTooltip(null)}
          />

          {/* Hộp thoại thông tin chi tiết sự vụ / nguyện vọng theo mẫu chuẩn */}
          <div className={`relative w-full max-w-md bg-[#181822] text-white border-2 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            activeTooltip.isWish || activeTooltip.symbol === 'ĐK'
              ? 'border-amber-500/60'
              : 'border-purple-500/50'
          }`}>
            {/* Header Tooltip: Avatar, Người giao/CTV, Thời gian */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${
                  activeTooltip.isWish || activeTooltip.symbol === 'ĐK'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                    : 'bg-purple-600/30 text-purple-300 border-purple-500/40'
                }`}>
                  {activeTooltip.isWish || activeTooltip.symbol === 'ĐK' ? (
                    <CalendarDays className="w-5 h-5 text-amber-300" />
                  ) : activeTooltip.tasks[0]?.creatorAvatar ? (
                    <img
                      src={activeTooltip.tasks[0].creatorAvatar}
                      alt="Creator"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-5 h-5 text-purple-300" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">
                    {activeTooltip.isWish || activeTooltip.symbol === 'ĐK'
                      ? 'Đăng Ký Nguyện Vọng Ca Trực'
                      : activeTooltip.tasks[0]?.creatorName || 'Nhân sự BPTT'}
                  </h4>
                  <p className="text-[11px] text-studio-muted flex items-center space-x-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-brand-primary" />
                    <span>
                      {activeTooltip.isWish || activeTooltip.symbol === 'ĐK'
                        ? 'Lịch rảnh CTV đăng ký'
                        : activeTooltip.tasks[0]?.createdAtFormatted || 'Giao nhiệm vụ trong tháng'}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTooltip(null)}
                className="text-studio-muted hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chi tiết người nhận & ngày buổi */}
            <div className="text-xs bg-white/5 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-studio-muted">Nhân sự / CTV:</span>{' '}
                <span className="font-bold text-white">{activeTooltip.userName}</span>
              </div>
              <div className="text-right">
                <span className={activeTooltip.isWish || activeTooltip.symbol === 'ĐK' ? 'text-amber-300 font-bold' : 'text-purple-300 font-bold'}>
                  {activeTooltip.session === 'S'
                    ? 'Buổi Sáng'
                    : activeTooltip.session === 'C'
                    ? 'Buổi Chiều'
                    : 'Buổi Tối'}
                </span>
                <span className="text-studio-muted ml-1">({activeTooltip.dateStr})</span>
              </div>
            </div>

            {/* Nội dung chi tiết: Phân biệt ĐK vs SV */}
            {activeTooltip.isWish || activeTooltip.symbol === 'ĐK' ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Nguyện vọng có thể trực Studio (Lịch rảnh)</span>
                </div>
                <p className="text-xs text-white/90 leading-relaxed">
                  CTV <strong>{activeTooltip.userName}</strong> đã gửi đăng ký có thể trực vào buổi này trong đợt trực Studio.
                </p>
                {activeTooltip.note && (
                  <div className="text-[11px] text-amber-200 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    Ghi chú: {activeTooltip.note}
                  </div>
                )}
                <div className="flex items-center space-x-2 text-[11px] text-amber-200 bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Trạng thái: <strong>Chờ Nhân sự sắp xếp &amp; xác nhận chính thức</strong></span>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const u = filteredRows.find((r) => r.user.fullName === activeTooltip.userName)?.user;
                      if (u) {
                        setActiveTooltip(null);
                        handleOpenAssignModal(u, activeTooltip.dateStr, activeTooltip.session as 'S' | 'C' | 'T');
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Phân công nhiệm vụ cho CTV vào buổi này</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {activeTooltip.tasks.length === 0 ? (
                  <div className="text-xs text-studio-muted italic py-2">
                    {activeTooltip.note || 'Có sự vụ hoặc ca trực được ghi nhận trong buổi này.'}
                  </div>
                ) : (
                  activeTooltip.tasks.map((task, i) => (
                    <div
                      key={task.id || i}
                      className="p-3 rounded-2xl bg-white/5 border border-purple-500/20 hover:border-purple-500/40 transition-all space-y-2 text-left"
                    >
                      {/* Tiêu đề & Loại */}
                      <div className="font-semibold text-sm text-white leading-snug">
                        {task.fullDisplay || task.title}
                      </div>

                      {/* Thời gian thực hiện */}
                      <div className="flex items-center space-x-1.5 text-xs text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                        <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>
                          <strong className="text-blue-200">Thời gian:</strong>{' '}
                          {task.executionTimeFormatted ||
                            (task.startTime
                              ? format(new Date(task.startTime), 'HH:mm, dd/MM/yyyy')
                              : task.deadline
                              ? `Hạn chót: ${format(new Date(task.deadline), 'HH:mm, dd/MM/yyyy')}`
                              : 'Chưa xác định')}
                        </span>
                      </div>

                      {/* Địa điểm nếu có */}
                      {task.location && (
                        <div className="inline-flex items-center space-x-1.5 text-xs text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>Địa điểm: {task.location}</span>
                        </div>
                      )}

                      {/* Giờ làm thực tế & Trạng thái */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                        <span className="text-studio-muted">
                          Thời lượng: {task.actualHours ? `${task.actualHours} giờ` : 'Chưa ghi nhận'}
                        </span>
                        <span
                          className={`font-bold flex items-center space-x-1 ${
                            task.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {task.status === 'COMPLETED' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Đã nghiệm thu</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Chưa nghiệm thu</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Nút thao tác dành cho ADMIN */}
                      {isAdmin && (
                        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/5">
                          <Link
                            href={`/admin/tasks?search=${encodeURIComponent(task.title)}`}
                            target="_blank"
                            className="p-1 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-studio-muted hover:text-white text-[10px] font-semibold flex items-center space-x-1 transition-all"
                            title="Mở trong Quản lý Công việc"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Quản lý</span>
                          </Link>

                          {task.status !== 'COMPLETED' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditTaskModal(task)}
                                className="p-1 px-2 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[10px] font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                                title="Chỉnh sửa nhiệm vụ"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Sửa</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingTaskItem(task);
                                  setDeleteTaskModalOpen(true);
                                }}
                                className="p-1 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                                title="Hủy / Xóa nhiệm vụ"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Xóa</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const u = filteredRows.find((r) => r.user.fullName === activeTooltip.userName)?.user;
                      if (u) {
                        setActiveTooltip(null);
                        handleOpenAssignModal(u, activeTooltip.dateStr, activeTooltip.session as 'S' | 'C' | 'T');
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Giao thêm nhiệm vụ (sự vụ) cho ca này</span>
                  </button>
                )}
              </div>
            )}

            {/* Ghi chú bảo vệ nghiệp vụ */}
            <p className="text-[10px] text-studio-muted italic border-t border-white/5 pt-2">
              {activeTooltip.isWish || activeTooltip.symbol === 'ĐK'
                ? '* Buổi đăng ký nguyện vọng chưa phải ca trực chính thức; không tính thù lao trước khi Nhân sự phê duyệt.'
                : '* Ký hiệu SV trên lịch trực để thông báo phân công sự vụ; chỉ tính thù lao khi CTV nộp báo cáo và Nhân sự nghiệm thu thành công.'}
            </p>
          </div>
        </div>
      )}

      {/* Modal 1: Giao Nhiệm Vụ Trực Tiếp Trên Lịch Trực Studio */}
      {assignModalOpen && assignTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setAssignModalOpen(false)} />
          <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-lg w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-brand-primary">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Phân Công Nhiệm Vụ</h3>
                  <p className="text-xs text-studio-muted mt-0.5">Giao việc trực tiếp từ Lịch trực Studio BPTT</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin pre-fill CTV, Ngày và Buổi */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-studio-muted">CTV phụ trách:</span>
                <span className="font-bold text-brand-primary">
                  {assignTargetUser.fullName} ({assignTargetUser.employeeCode || assignTargetUser.email})
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-studio-muted">Thời gian thực hiện:</span>
                <span className="font-semibold text-white">
                  {assignDateStr} ({assignSession === 'S' ? 'Ca Sáng 07:30 - 11:30' : assignSession === 'C' ? 'Ca Chiều 13:00 - 17:00' : 'Ca Tối 17:30 - 21:30'})
                </span>
              </div>
            </div>

            <form onSubmit={handleCreateTaskFromSchedule} noValidate className="space-y-4 text-left">
              {/* Loại công việc */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-studio-muted uppercase block flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Loại công việc *</span>
                </label>
                <select
                  value={assignTaskType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setAssignTaskType(newType);
                    if (!requiresLocation(newType)) {
                      setAssignCampus('');
                      setAssignRoom('');
                    }
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-[#18181b]">
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tên loại việc tùy chỉnh nếu chọn 'Khác' */}
              {assignTaskType === 'Khác' && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 animate-in fade-in duration-200">
                  <label className="text-[11px] font-bold text-brand-primary uppercase block">
                    Tên loại công việc tùy chỉnh *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Biên kịch tài liệu, Lồng tiếng video..."
                    value={assignOtherTaskType}
                    onChange={(e) => setAssignOtherTaskType(e.target.value)}
                    className="w-full bg-black/40 border border-brand-primary/30 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary"
                  />
                </div>
              )}

              {/* Trường Địa điểm thực hiện (Chỉ hiển thị khi thuộc các nhóm: Chụp ảnh, Quay phim/video, Diễn viên, Khác) */}
              {requiresLocation(assignTaskType) && (
                <div className="space-y-2 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-400 uppercase flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Địa điểm thực hiện</span>
                    </label>
                    <span className="text-[10px] text-amber-300/70 font-normal">
                      (Cơ sở &amp; Phòng)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Chọn Cơ sở */}
                    <div className="sm:col-span-5">
                      <label className="text-[10px] text-studio-muted block mb-1">Cơ sở</label>
                      <select
                        value={assignCampus}
                        onChange={(e) => setAssignCampus(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-400/50 cursor-pointer"
                      >
                        <option value="" className="bg-[#18181b]">-- Chọn cơ sở --</option>
                        {CAMPUSES.map((c) => (
                          <option key={c} value={c} className="bg-[#18181b]">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Nhập Phòng / Địa điểm cụ thể */}
                    <div className="sm:col-span-7">
                      <label className="text-[10px] text-studio-muted block mb-1">Phòng / Địa điểm cụ thể</label>
                      <input
                        type="text"
                        placeholder="VD: Phòng B502, Hội trường T, Studio..."
                        value={assignRoom}
                        onChange={(e) => setAssignRoom(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-400/50"
                      />
                    </div>
                  </div>

                  {(assignCampus || assignRoom) && (
                    <p className="text-[11px] text-amber-300/90 font-medium pt-0.5 flex items-center space-x-1">
                      <span className="text-studio-muted">Địa điểm ghi nhận:</span>
                      <span className="font-semibold text-white">
                        {[assignCampus, assignRoom].filter(Boolean).join(' - ')}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Tiêu đề nhiệm vụ */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-studio-muted uppercase block">Tiêu đề nhiệm vụ *</label>
                <input
                  type="text"
                  placeholder="VD: Chụp ảnh khai giảng, Quay trailer sự kiện..."
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                />
              </div>

              {/* Mô tả chi tiết yêu cầu */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-studio-muted uppercase block">Mô tả chi tiết yêu cầu</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú cụ thể các yêu cầu, thiết bị cần chuẩn bị..."
                  value={assignDescription}
                  onChange={(e) => setAssignDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 resize-none"
                />
              </div>

              {/* Thời gian thực hiện: Thời gian bắt đầu (Chụp ảnh, Quay phim, Diễn viên, Khác) HOẶC Hạn chót (Deadline) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-studio-muted uppercase flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                    <span>{requiresLocation(assignTaskType) ? 'Thời gian bắt đầu *' : 'Thời hạn hoàn thành (Deadline) *'}</span>
                  </span>
                  <span className="text-[10px] text-brand-primary/80 normal-case font-normal">
                    (Chọn ngày &amp; giờ)
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6 relative">
                    <input
                      ref={assignDatePickerRef}
                      type="date"
                      value={assignDeadlineDate}
                      onChange={(e) => setAssignDeadlineDate(e.target.value)}
                      onClick={(e) => {
                        try {
                          (e.currentTarget as any).showPicker?.();
                        } catch {}
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer [color-scheme:dark]"
                      title="Nhấn để mở lịch chọn ngày"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        try {
                          assignDatePickerRef.current?.showPicker?.();
                        } catch {}
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-studio-muted hover:text-white transition-colors cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-brand-primary" />
                    </button>
                  </div>

                  <div className="sm:col-span-6 grid grid-cols-2 gap-2">
                    <select
                      value={assignDeadlineHour}
                      onChange={(e) => setAssignDeadlineHour(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                    >
                      <option value="" disabled className="bg-[#18181b]">Chọn giờ</option>
                      {HOURS_OPTIONS.map((h) => (
                        <option key={h} value={h} className="bg-[#18181b]">{h} giờ</option>
                      ))}
                    </select>

                    <select
                      value={assignDeadlineMinute}
                      onChange={(e) => setAssignDeadlineMinute(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                    >
                      <option value="" disabled className="bg-[#18181b]">Chọn phút</option>
                      {MINUTES_OPTIONS.map((m) => (
                        <option key={m} value={m} className="bg-[#18181b]">{m} phút</option>
                      ))}
                    </select>
                  </div>
                </div>

                {assignDeadlineDate && assignDeadlineHour && assignDeadlineMinute && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-brand-primary font-medium pt-1 px-1">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {requiresLocation(assignTaskType) ? 'Bắt đầu:' : 'Hạn chót:'} {format(new Date(`${assignDeadlineDate}T${assignDeadlineHour}:${assignDeadlineMinute}:00`), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all cursor-pointer text-xs disabled:opacity-40 flex items-center justify-center space-x-2 shadow-lg shadow-brand-primary/20"
                >
                  {creatingTask ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      <span>Xác nhận giao việc</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Chỉnh Sửa Nhiệm Vụ Từ Lịch Trực */}
      {editTaskModalOpen && editingTaskData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditTaskModalOpen(false)} />
          <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-lg w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Chỉnh Sửa Nhiệm Vụ</h3>
                  <p className="text-xs text-studio-muted mt-0.5">Cập nhật thông tin sự vụ trên Lịch trực Studio</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTaskModalOpen(false)}
                className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTaskFromSchedule} noValidate className="space-y-4 text-left">
              {/* Loại công việc */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-studio-muted uppercase block flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  <span>Loại công việc *</span>
                </label>
                <select
                  value={editTaskType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setEditTaskType(newType);
                    if (!requiresLocation(newType)) {
                      setEditCampus('');
                      setEditRoom('');
                    }
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-[#18181b]">
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tên loại việc tùy chỉnh nếu chọn 'Khác' */}
              {editTaskType === 'Khác' && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20 animate-in fade-in duration-200">
                  <label className="text-[11px] font-bold text-blue-400 uppercase block">
                    Tên loại công việc tùy chỉnh *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Biên kịch phóng sự, Lồng tiếng..."
                    value={editOtherTaskType}
                    onChange={(e) => setEditOtherTaskType(e.target.value)}
                    className="w-full bg-black/40 border border-blue-500/30 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Trường Địa điểm thực hiện (Chỉ hiển thị khi thuộc các nhóm: Chụp ảnh, Quay phim/video, Diễn viên, Khác) */}
              {requiresLocation(editTaskType) && (
                <div className="space-y-2 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-400 uppercase flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Địa điểm thực hiện</span>
                    </label>
                    <span className="text-[10px] text-amber-300/70 font-normal">
                      (Cơ sở &amp; Phòng)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Chọn Cơ sở */}
                    <div className="sm:col-span-5">
                      <label className="text-[10px] text-studio-muted block mb-1">Cơ sở</label>
                      <select
                        value={editCampus}
                        onChange={(e) => setEditCampus(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-400/50 cursor-pointer"
                      >
                        <option value="" className="bg-[#18181b]">-- Chọn cơ sở --</option>
                        {CAMPUSES.map((c) => (
                          <option key={c} value={c} className="bg-[#18181b]">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Nhập Phòng / Địa điểm cụ thể */}
                    <div className="sm:col-span-7">
                      <label className="text-[10px] text-studio-muted block mb-1">Phòng / Địa điểm cụ thể</label>
                      <input
                        type="text"
                        placeholder="VD: Phòng B502, Hội trường T, Studio..."
                        value={editRoom}
                        onChange={(e) => setEditRoom(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-400/50"
                      />
                    </div>
                  </div>

                  {(editCampus || editRoom) && (
                    <p className="text-[11px] text-amber-300/90 font-medium pt-0.5 flex items-center space-x-1">
                      <span className="text-studio-muted">Địa điểm ghi nhận:</span>
                      <span className="font-semibold text-white">
                        {[editCampus, editRoom].filter(Boolean).join(' - ')}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Tiêu đề nhiệm vụ */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-studio-muted uppercase block">Tiêu đề nhiệm vụ *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>

              {/* Mô tả chi tiết yêu cầu */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-studio-muted uppercase block">Mô tả chi tiết yêu cầu</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>

              {/* Thời gian thực hiện: Thời gian bắt đầu (Chụp ảnh, Quay phim, Diễn viên, Khác) HOẶC Hạn chót (Deadline) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-studio-muted uppercase flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>{requiresLocation(editTaskType) ? 'Thời gian bắt đầu *' : 'Thời hạn hoàn thành (Deadline) *'}</span>
                  </span>
                  <span className="text-[10px] text-blue-400/80 normal-case font-normal">
                    (Chọn ngày &amp; giờ)
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6 relative">
                    <input
                      ref={editDatePickerRef}
                      type="date"
                      value={editDeadlineDate}
                      onChange={(e) => setEditDeadlineDate(e.target.value)}
                      onClick={(e) => {
                        try {
                          (e.currentTarget as any).showPicker?.();
                        } catch {}
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer [color-scheme:dark]"
                      title="Nhấn để mở lịch chọn ngày"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        try {
                          editDatePickerRef.current?.showPicker?.();
                        } catch {}
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-studio-muted hover:text-white transition-colors cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>

                  <div className="sm:col-span-6 grid grid-cols-2 gap-2">
                    <select
                      value={editDeadlineHour}
                      onChange={(e) => setEditDeadlineHour(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                    >
                      <option value="" disabled className="bg-[#18181b]">Chọn giờ</option>
                      {HOURS_OPTIONS.map((h) => (
                        <option key={h} value={h} className="bg-[#18181b]">{h} giờ</option>
                      ))}
                    </select>

                    <select
                      value={editDeadlineMinute}
                      onChange={(e) => setEditDeadlineMinute(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                    >
                      <option value="" disabled className="bg-[#18181b]">Chọn phút</option>
                      {MINUTES_OPTIONS.map((m) => (
                        <option key={m} value={m} className="bg-[#18181b]">{m} phút</option>
                      ))}
                    </select>
                  </div>
                </div>

                {editDeadlineDate && editDeadlineHour && editDeadlineMinute && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-blue-400 font-medium pt-1 px-1">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {requiresLocation(editTaskType) ? 'Bắt đầu:' : 'Hạn chót:'} {format(new Date(`${editDeadlineDate}T${editDeadlineHour}:${editDeadlineMinute}:00`), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditTaskModalOpen(false)}
                  className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={updatingTask}
                  className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all cursor-pointer text-xs disabled:opacity-40 flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
                >
                  {updatingTask ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Pencil className="w-4 h-4" />
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Xác Nhận Hủy / Xóa Nhiệm Vụ */}
      {deleteTaskModalOpen && deletingTaskItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteTaskModalOpen(false)} />
          <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-sm w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Xác Nhận Xóa Nhiệm Vụ?</h3>
              <p className="text-xs text-studio-muted mt-1 leading-relaxed">
                Bạn có chắc chắn muốn xóa nhiệm vụ <strong className="text-white">&quot;{deletingTaskItem.title}&quot;</strong> không? Ký hiệu SV trên lịch trực sẽ tự động được dọn dẹp.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTaskModalOpen(false)}
                className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteTaskFromSchedule}
                disabled={deletingTask}
                className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer text-xs disabled:opacity-40 flex items-center justify-center space-x-2"
              >
                {deletingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Xác nhận xóa</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

