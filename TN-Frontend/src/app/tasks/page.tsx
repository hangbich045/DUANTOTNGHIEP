'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import { format } from 'date-fns';
import {
  Loader2,
  CheckSquare,
  Clock,
  Play,
  Send,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
  ExternalLink,
  PlusCircle,
  FileText,
  Link as LinkIcon,
  X,
  Calendar,
  Sparkles,
  Tag,
  Eye,
  CalendarDays,
  Coins,
  Check,
  Trash2,
  Table as TableIcon,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { TASK_TYPES } from '@/app/admin/tasks/page';

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  assignedToUserId: string;
  createdByUserId: string;
  deadline?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'REVISION_REQUESTED' | 'COMPLETED';
  resultLink?: string;
  proofFile?: string;
  feedback?: string;
  isExternal: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  taskType?: string;
  otherTaskType?: string;
  executionDate?: string;
  actualHours?: number;
  shiftSession?: string;
  creator?: {
    fullName: string;
    role: string;
  };
}

interface TaskStats {
  total: number;
  notStarted: number;
  inProgress: number;
  pendingApproval: number;
  revisionRequested: number;
  completed: number;
  externalTasks: number;
}

interface ShiftItem {
  id: string;
  userId: string;
  date: string;
  shiftType: 'SANG' | 'CHIEU' | 'TOI';
  startTime: string;
  endTime: string;
  hours: number;
  status: 'REGISTERED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  attendanceSymbol: string;
  note?: string;
  collaborator?: {
    fullName: string;
    email: string;
    employeeCode?: string;
  };
}

interface TimesheetData {
  month: number;
  year: number;
  daysCount: number;
  daysMeta: Array<{ day: number; dayOfWeek: string; isSunday: boolean }>;
  rows: Array<{
    user: { id: string; fullName: string; email: string; employeeCode?: string };
    sessions: Array<{
      session: string;
      days: Record<number, string>;
      lvCount: number;
      svCount: number;
    }>;
    summary: {
      sumLv: number;
      gioLv: number;
      gioSv: number;
      gioOt: number;
      gioSunday: number;
      tongGio: number;
      tien: number;
    };
  }>;
  hourlyRate: number;
}

export default function MyTasksPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Mode: TASKS (Nhiệm vụ) or DUTY (Lịch trực Studio & Thù lao)
  const [viewMode, setViewMode] = useState<'TASKS' | 'DUTY'>('TASKS');

  // Month & Year filter for Duty tab
  const currentDate = new Date();
  const [dutyMonth, setDutyMonth] = useState<number>(currentDate.getMonth() + 1);
  const [dutyYear, setDutyYear] = useState<number>(currentDate.getFullYear());

  // Tasks states
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Filters for tasks
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('ALL');

  // Submit Result Modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedTaskToSubmit, setSelectedTaskToSubmit] = useState<TaskItem | null>(null);
  const [resultLink, setResultLink] = useState('');
  const [proofFile, setProofFile] = useState('');
  const [submittingResult, setSubmittingResult] = useState(false);

  // External Task Declaration Modal
  const [externalModalOpen, setExternalModalOpen] = useState(false);
  const [externalTitle, setExternalTitle] = useState('');
  const [externalDescription, setExternalDescription] = useState('');
  const [externalTaskType, setExternalTaskType] = useState<string>('Viết content');
  const [externalOtherTaskType, setExternalOtherTaskType] = useState<string>('');
  const [externalResultLink, setExternalResultLink] = useState('');
  const [externalProofFile, setExternalProofFile] = useState('');
  const [externalExecutionDate, setExternalExecutionDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [externalActualHours, setExternalActualHours] = useState<number>(2);
  const [externalShiftSession, setExternalShiftSession] = useState<'S' | 'C' | 'T'>('S');
  const [externalIsOvertime, setExternalIsOvertime] = useState<boolean>(false);
  const [externalOvertimeHours, setExternalOvertimeHours] = useState<number>(0);
  const [externalIsSunday, setExternalIsSunday] = useState<boolean>(false);
  const [submittingExternal, setSubmittingExternal] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<TaskItem | null>(null);

  // Duty tab states
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [timesheet, setTimesheet] = useState<TimesheetData | null>(null);
  const [loadingDuty, setLoadingDuty] = useState(false);

  // Register Shift Modal
  const [registerShiftModalOpen, setRegisterShiftModalOpen] = useState(false);
  const [shiftDate, setShiftDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [shiftType, setShiftType] = useState<'SANG' | 'CHIEU' | 'TOI'>('SANG');
  const [shiftNote, setShiftNote] = useState<string>('');
  const [submittingShift, setSubmittingShift] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast('Vui lòng đăng nhập để xem danh sách nhiệm vụ', 'warning');
        router.push('/auth/login');
      } else if (user.role !== 'COLLABORATOR' && user.role !== 'ADMIN') {
        toast('Trang này dành riêng cho Cộng tác viên (CTV) và Nhân sự Studio', 'error');
        router.push('/');
      }
    }
  }, [user, authLoading, router, toast]);

  useEffect(() => {
    if (user && (user.role === 'COLLABORATOR' || user.role === 'ADMIN')) {
      if (viewMode === 'TASKS') {
        fetchTasksAndStats();
      } else {
        fetchDutyData();
      }
    }
  }, [user, activeTab, taskTypeFilter, viewMode, dutyMonth, dutyYear]);

  const fetchTasksAndStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch stats
      const statsRes = await api.get('/tasks/stats');
      if (statsRes.success) {
        setStats(statsRes.data);
      }

      // 2. Fetch tasks
      let query = '?limit=50';
      if (activeTab !== 'ALL') {
        query += `&status=${activeTab}`;
      }
      if (taskTypeFilter !== 'ALL') {
        query += `&taskType=${encodeURIComponent(taskTypeFilter)}`;
      }

      const res = await api.get(`/tasks${query}`);
      if (res.success && Array.isArray(res.data)) {
        setTasks(res.data);
      } else {
        setTasks([]);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tải danh sách nhiệm vụ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDutyData = async () => {
    setLoadingDuty(true);
    try {
      // 1. Lấy ca trực của bản thân
      const shiftRes = await api.get(`/duty/shifts?month=${dutyMonth}&year=${dutyYear}&userId=${user?.id}`);
      if (shiftRes.success && Array.isArray(shiftRes.data)) {
        setShifts(shiftRes.data);
      } else {
        setShifts([]);
      }

      // 2. Lấy dữ liệu timesheet
      const tsRes = await api.get(`/payroll/timesheet?month=${dutyMonth}&year=${dutyYear}`);
      if (tsRes.success && tsRes.data) {
        setTimesheet(tsRes.data);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tải dữ liệu ca trực & chấm công', 'error');
    } finally {
      setLoadingDuty(false);
    }
  };

  // CTV bắt đầu làm việc
  const handleStartTask = async (task: TaskItem) => {
    setActioningId(task.id);
    try {
      await api.put(`/tasks/${task.id}/progress`, {
        status: 'IN_PROGRESS',
      });
      toast(`Đã chuyển trạng thái nhiệm vụ "${task.title}" sang Đang thực hiện!`, 'success');
      fetchTasksAndStats();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi cập nhật trạng thái', 'error');
    } finally {
      setActioningId(null);
    }
  };

  // Mở modal nộp bài
  const openSubmitModal = (task: TaskItem) => {
    setSelectedTaskToSubmit(task);
    setResultLink(task.resultLink || '');
    setProofFile(task.proofFile || '');
    setSubmitModalOpen(true);
  };

  // CTV nộp kết quả duyệt
  const handleSubmitTaskResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskToSubmit) return;

    if (!resultLink.trim() && !proofFile.trim()) {
      toast('Vui lòng cung cấp link sản phẩm hoặc file minh chứng để nộp duyệt', 'warning');
      return;
    }

    setSubmittingResult(true);
    try {
      await api.put(`/tasks/${selectedTaskToSubmit.id}/progress`, {
        status: 'PENDING_APPROVAL',
        resultLink: resultLink.trim() || undefined,
        proofFile: proofFile.trim() || undefined,
      });

      toast('Đã nộp kết quả công việc thành công! Vui lòng chờ Nhân sự nghiệm thu.', 'success');
      setSubmitModalOpen(false);
      setSelectedTaskToSubmit(null);
      fetchTasksAndStats();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi nộp kết quả công việc', 'error');
    } finally {
      setSubmittingResult(false);
    }
  };

  // Mở modal khai báo việc ngoài hệ thống
  const openExternalModal = () => {
    setExternalTitle('');
    setExternalDescription('');
    setExternalTaskType('Viết content');
    setExternalOtherTaskType('');
    setExternalResultLink('');
    setExternalProofFile('');
    setExternalExecutionDate(new Date().toISOString().slice(0, 10));
    setExternalActualHours(2);
    setExternalShiftSession('S');
    setExternalIsOvertime(false);
    setExternalOvertimeHours(0);
    setExternalIsSunday(false);
    setExternalModalOpen(true);
  };

  // CTV gửi khai báo việc ngoài hệ thống
  const handleSubmitExternalTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalTitle.trim()) {
      toast('Vui lòng nhập tên công việc phát sinh', 'warning');
      return;
    }
    if (externalTaskType === 'Khác' && !externalOtherTaskType.trim()) {
      toast('Vui lòng nhập tên loại công việc khi chọn "Khác"', 'warning');
      return;
    }
    if (!externalResultLink.trim() && !externalProofFile.trim()) {
      toast('Vui lòng cung cấp link sản phẩm hoặc file minh chứng thực hiện', 'warning');
      return;
    }

    setSubmittingExternal(true);
    try {
      await api.post('/tasks/external', {
        title: externalTitle.trim(),
        description: externalDescription.trim() || undefined,
        taskType: externalTaskType || undefined,
        otherTaskType: externalTaskType === 'Khác' ? externalOtherTaskType.trim() : undefined,
        resultLink: externalResultLink.trim() || undefined,
        proofFile: externalProofFile.trim() || undefined,
        executionDate: externalExecutionDate,
        actualHours: Number(externalActualHours) || 0,
        shiftSession: externalShiftSession,
        isOvertime: externalIsOvertime,
        overtimeHours: externalIsOvertime ? Number(externalOvertimeHours) || 0 : 0,
        isSunday: externalIsSunday,
      });

      toast('Khai báo công việc ngoài hệ thống thành công! Nhân sự sẽ xác minh để tính công.', 'success');
      setExternalModalOpen(false);
      fetchTasksAndStats();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi khai báo công việc ngoài hệ thống', 'error');
    } finally {
      setSubmittingExternal(false);
    }
  };

  // CTV Đăng ký ca trực Studio
  const handleRegisterShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingShift(true);
    try {
      await api.post('/duty/register', {
        date: shiftDate,
        shiftType: shiftType,
        note: shiftNote.trim() || undefined,
      });

      toast('Đăng ký ca trực Studio thành công! Đang chờ Nhân sự duyệt xếp lịch.', 'success');
      setRegisterShiftModalOpen(false);
      setShiftNote('');
      fetchDutyData();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi đăng ký ca trực Studio', 'error');
    } finally {
      setSubmittingShift(false);
    }
  };

  // CTV xác nhận hoàn thành ca trực (nếu date <= today)
  const handleCompleteShift = async (shiftId: string) => {
    try {
      await api.put(`/duty/shifts/${shiftId}/complete`, {});
      toast('Đã xác nhận hoàn thành ca trực thành công!', 'success');
      fetchDutyData();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi xác nhận hoàn thành ca trực', 'error');
    }
  };

  // CTV hủy ca trực
  const handleCancelShift = async (shiftId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đăng ký ca trực này không?')) return;
    try {
      await api.delete(`/duty/shifts/${shiftId}`);
      toast('Đã hủy đăng ký ca trực thành công!', 'success');
      fetchDutyData();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi hủy ca trực', 'error');
    }
  };

  const getStatusBadge = (status: TaskItem['status']) => {
    switch (status) {
      case 'NOT_STARTED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-white/10 text-studio-muted border border-white/10 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-studio-muted" />
            <span>Chưa bắt đầu</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center space-x-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>Đang thực hiện</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/35 flex items-center space-x-1.5 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Chờ nghiệm thu</span>
          </span>
        );
      case 'REVISION_REQUESTED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Cần chỉnh sửa</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-brand-success/20 text-brand-success border border-brand-success/30 flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-success" />
            <span>Đã hoàn thành</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getShiftBadge = (status: ShiftItem['status']) => {
    switch (status) {
      case 'REGISTERED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Chờ duyệt
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Đã xếp lịch
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Đã trực xong
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Đã hủy
          </span>
        );
    }
  };

  // Lọc dữ liệu cá nhân trong Timesheet
  const myTimesheetRow = timesheet?.rows.find((r) => r.user.id === user?.id);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-studio-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-studio-dark text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Top Header & Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phân hệ CTV Studio (FR-04 & FR-05)</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Cổng Làm Việc Cộng Tác Viên</h1>
            <p className="text-sm text-studio-muted mt-1 max-w-2xl leading-relaxed">
              Theo dõi tiến độ công việc, nộp kết quả sản phẩm, đăng ký lịch trực Studio và tra cứu thù lao hàng tháng theo chuẩn Bộ phận Truyền thông ĐH Lạc Hồng.
            </p>
          </div>

          {/* Tab Navigation Button */}
          <div className="flex items-center bg-black/40 p-1.5 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => setViewMode('TASKS')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'TASKS'
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                  : 'text-studio-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Nhiệm vụ & Sự vụ</span>
            </button>
            <button
              onClick={() => setViewMode('DUTY')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'DUTY'
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                  : 'text-studio-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Lịch trực & Bảng chấm công</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW MODE 1: TASKS & EXTERNAL WORK                                       */}
        {/* ========================================================================= */}
        {viewMode === 'TASKS' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/2 p-4 rounded-3xl border border-white/5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-studio-muted">Danh mục:</span>
                <span className="text-xs font-bold text-white bg-white/5 px-3 py-1 rounded-xl border border-white/10">
                  Nhiệm vụ được giao & Việc tự khai báo
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchTasksAndStats}
                  className="p-2.5 rounded-2xl border border-white/5 hover:bg-white/5 text-studio-muted hover:text-white transition-all cursor-pointer"
                  title="Làm mới"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={openExternalModal}
                  className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-purple-600/20 transition-all cursor-pointer text-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Khai báo việc ngoài hệ thống</span>
                </button>
              </div>
            </div>

            {/* Stats Summary */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-black/25">
                  <span className="text-[11px] font-bold text-studio-muted uppercase block">Tổng việc của tôi</span>
                  <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-black/25">
                  <span className="text-[11px] font-bold text-studio-muted uppercase block">Chưa làm</span>
                  <p className="text-2xl font-black text-white/70 mt-1">{stats.notStarted}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-blue-500/10 bg-blue-500/5">
                  <span className="text-[11px] font-bold text-blue-400 uppercase block">Đang thực hiện</span>
                  <p className="text-2xl font-black text-blue-400 mt-1">{stats.inProgress}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10">
                  <span className="text-[11px] font-bold text-amber-300 uppercase block">Chờ nghiệm thu</span>
                  <p className="text-2xl font-black text-amber-300 mt-1">{stats.pendingApproval}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10">
                  <span className="text-[11px] font-bold text-rose-400 uppercase block">Cần chỉnh sửa</span>
                  <p className="text-2xl font-black text-rose-400 mt-1">{stats.revisionRequested}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-brand-success/20 bg-brand-success/10">
                  <span className="text-[11px] font-bold text-brand-success uppercase block">Đã hoàn thành</span>
                  <p className="text-2xl font-black text-brand-success mt-1">{stats.completed}</p>
                </div>
              </div>
            )}

            {/* Tab & Task Type Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
              {/* Status Tabs */}
              <div className="flex space-x-2 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'ALL', label: 'Tất cả nhiệm vụ' },
                  { id: 'NOT_STARTED', label: 'Chưa bắt đầu' },
                  { id: 'IN_PROGRESS', label: 'Đang làm' },
                  { id: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
                  { id: 'REVISION_REQUESTED', label: 'Cần sửa đổi' },
                  { id: 'COMPLETED', label: 'Đã hoàn thành' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                        : 'text-studio-muted hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Task Type Filter */}
              <div className="flex items-center space-x-2 shrink-0">
                <Tag className="w-4 h-4 text-studio-muted" />
                <select
                  value={taskTypeFilter}
                  onChange={(e) => setTaskTypeFilter(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                >
                  <option value="ALL">Tất cả loại công việc</option>
                  {TASK_TYPES.map((type) => (
                    <option key={type} value={type} className="bg-[#121216] text-white">
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tasks List */}
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                <CheckSquare className="w-12 h-12 text-studio-muted mx-auto mb-3 opacity-30" />
                <p className="text-white font-bold">Không có nhiệm vụ nào trong mục này</p>
                <p className="text-xs text-studio-muted mt-1">Khi Nhân sự phân công công việc, bạn sẽ thấy danh sách hiển thị tại đây.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {tasks.map((task) => {
                  const isOverdue =
                    task.deadline &&
                    new Date(task.deadline) < new Date() &&
                    task.status !== 'COMPLETED';

                  return (
                    <div
                      key={task.id}
                      className={`glass-panel p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                        task.status === 'REVISION_REQUESTED'
                          ? 'border-rose-500/40 bg-rose-500/5 shadow-lg shadow-rose-500/5'
                          : task.status === 'PENDING_APPROVAL'
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : task.status === 'COMPLETED'
                          ? 'border-brand-success/20 bg-brand-success/5'
                          : 'border-white/5 bg-black/25 hover:border-white/10'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Top Row: Type & Status Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {task.isExternal ? (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/35">
                                Việc ngoài hệ thống
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/10 text-studio-muted border border-white/10">
                                Nhiệm vụ giao
                              </span>
                            )}

                            {task.taskType && (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-brand-primary/15 text-brand-primary border border-brand-primary/30 flex items-center space-x-1">
                                <Tag className="w-3 h-3" />
                                <span>
                                  {task.taskType === 'Khác' && task.otherTaskType
                                    ? `Khác: ${task.otherTaskType}`
                                    : task.taskType}
                                </span>
                              </span>
                            )}
                          </div>

                          {getStatusBadge(task.status)}
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-base font-bold text-white line-clamp-2 leading-snug">
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-xs text-studio-muted line-clamp-2 mt-1 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Info details */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px] text-studio-muted">
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 shrink-0 text-studio-muted" />
                            <span className={isOverdue ? 'text-rose-400 font-semibold' : ''}>
                              {task.deadline
                                ? `Hạn: ${format(new Date(task.deadline), 'dd/MM/yyyy HH:mm')}`
                                : 'Không giới hạn hạn chót'}
                            </span>
                          </div>

                          <div className="text-right">
                            {task.isExternal ? (
                              <span className="text-purple-300">Tự khai báo</span>
                            ) : (
                              <span>Giao bởi: <strong className="text-white/80">{task.creator?.fullName || 'Admin'}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Revision feedback alert */}
                        {task.status === 'REVISION_REQUESTED' && task.feedback && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs space-y-1">
                            <span className="font-bold text-rose-300 flex items-center space-x-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Yêu cầu chỉnh sửa từ Quản trị viên:</span>
                            </span>
                            <p className="text-rose-200/90 leading-relaxed font-medium pl-4">
                              {task.feedback}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Bottom Actions */}
                      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setSelectedTaskForDetail(task);
                            setDetailModalOpen(true);
                          }}
                          className="flex items-center space-x-1 text-xs text-studio-muted hover:text-white transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Chi tiết</span>
                        </button>

                        <div className="flex items-center space-x-2">
                          {task.status === 'NOT_STARTED' && (
                            <button
                              onClick={() => handleStartTask(task)}
                              disabled={actioningId === task.id}
                              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                            >
                              {actioningId === task.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                              <span>Bắt đầu làm</span>
                            </button>
                          )}

                          {(task.status === 'IN_PROGRESS' || task.status === 'REVISION_REQUESTED') && (
                            <button
                              onClick={() => openSubmitModal(task)}
                              className="flex items-center space-x-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-brand-primary/20 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{task.status === 'REVISION_REQUESTED' ? 'Nộp lại sản phẩm' : 'Nộp kết quả'}</span>
                            </button>
                          )}

                          {task.status === 'PENDING_APPROVAL' && (
                            <span className="text-[11px] font-medium text-amber-300 italic flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Đang chờ Admin duyệt</span>
                            </span>
                          )}

                          {task.status === 'COMPLETED' && (
                            <span className="text-[11px] font-bold text-brand-success flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Đã nghiệm thu</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 2: DUTY SHIFTS & ATTENDANCE TIMESHEET (FR-05)                  */}
        {/* ========================================================================= */}
        {viewMode === 'DUTY' && (
          <div className="space-y-6">
            {/* Duty Header & Month Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/2 p-4 rounded-3xl border border-white/5">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-studio-muted">Thời gian đối soát:</span>
                <select
                  value={dutyMonth}
                  onChange={(e) => setDutyMonth(Number(e.target.value))}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m} className="bg-[#121216]">
                      Tháng {m}
                    </option>
                  ))}
                </select>

                <select
                  value={dutyYear}
                  onChange={(e) => setDutyYear(Number(e.target.value))}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold cursor-pointer"
                >
                  {[2025, 2026, 2027].map((y) => (
                    <option key={y} value={y} className="bg-[#121216]">
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchDutyData}
                  className="p-2.5 rounded-2xl border border-white/5 hover:bg-white/5 text-studio-muted hover:text-white transition-all cursor-pointer"
                  title="Làm mới dữ liệu"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setRegisterShiftModalOpen(true)}
                  className="flex items-center space-x-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-brand-primary/20 transition-all cursor-pointer text-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Đăng ký ca trực Studio</span>
                </button>
              </div>
            </div>

            {/* Thống kê thù lao tháng của CTV */}
            {myTimesheetRow && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-gradient-to-br from-black/40 to-white/5">
                  <div className="flex items-center space-x-2 text-studio-muted text-xs font-semibold uppercase">
                    <Clock className="w-4 h-4 text-brand-primary" />
                    <span>Trực Studio (LV)</span>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-3xl font-black text-white">{myTimesheetRow.summary.sumLv}</span>
                    <span className="text-xs text-studio-muted">ca ({myTimesheetRow.summary.gioLv} giờ)</span>
                  </div>
                  <p className="text-[11px] text-studio-muted mt-1">4 giờ / ca tiêu chuẩn (80.000 đ)</p>
                </div>

                <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-gradient-to-br from-black/40 to-white/5">
                  <div className="flex items-center space-x-2 text-studio-muted text-xs font-semibold uppercase">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Làm sự vụ (SV)</span>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-3xl font-black text-purple-300">{myTimesheetRow.summary.gioSv}</span>
                    <span className="text-xs text-studio-muted">giờ thực tế</span>
                  </div>
                  <p className="text-[11px] text-studio-muted mt-1">Ghi nhận từ công việc COMPLETED</p>
                </div>

                <div className="glass-panel p-5 rounded-3xl border border-white/10 bg-gradient-to-br from-black/40 to-white/5">
                  <div className="flex items-center space-x-2 text-studio-muted text-xs font-semibold uppercase">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Phụ trội & Chủ nhật</span>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-3xl font-black text-amber-300">
                      {((myTimesheetRow.summary.gioOt * 0.5) + (myTimesheetRow.summary.gioSunday * 1.0)).toFixed(1)}
                    </span>
                    <span className="text-xs text-studio-muted">giờ quy đổi thêm</span>
                  </div>
                  <p className="text-[11px] text-studio-muted mt-1">OT: 1.5x | Chủ nhật: 2.0x</p>
                </div>

                <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 shadow-lg shadow-emerald-500/5">
                  <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    <span>Thù lao tạm tính tháng {dutyMonth}</span>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-1.5">
                    <span className="text-3xl font-black text-emerald-300">
                      {myTimesheetRow.summary.tien.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">VNĐ</span>
                  </div>
                  <p className="text-[11px] text-emerald-400/80 mt-1">
                    Tổng {myTimesheetRow.summary.tongGio} giờ x 20.000 đ/giờ
                  </p>
                </div>
              </div>
            )}

            {/* Bảng ma trận chấm công cá nhân của CTV theo ngày (S-C-T) */}
            {timesheet && myTimesheetRow && (
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-black/25 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center space-x-2">
                      <TableIcon className="w-4 h-4 text-brand-primary" />
                      <span>Bảng Chấm Công Cá Nhân Tháng {dutyMonth}/{dutyYear}</span>
                    </h3>
                    <p className="text-xs text-studio-muted mt-0.5">
                      Theo dõi ký hiệu chấm công: <span className="text-blue-400 font-bold">LV</span> (Trực Studio) |{' '}
                      <span className="text-purple-400 font-bold">SV</span> (Sự vụ) |{' '}
                      <span className="text-amber-400 font-bold">NL</span> (Nghỉ lễ)
                    </p>
                  </div>
                </div>

                {/* Grid ma trận chấm công */}
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-studio-muted font-bold">
                        <th className="p-2 border border-white/10 sticky left-0 bg-[#141418] z-10 w-20 text-left">Buổi</th>
                        {timesheet.daysMeta.map((dm) => (
                          <th
                            key={dm.day}
                            className={`p-1.5 border border-white/10 min-w-[28px] ${
                              dm.isSunday ? 'bg-rose-500/20 text-rose-300' : ''
                            }`}
                          >
                            <div>{dm.day}</div>
                            <div className="text-[9px] font-normal opacity-70">{dm.dayOfWeek}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {myTimesheetRow.sessions.map((sess) => (
                        <tr key={sess.session} className="hover:bg-white/2 transition-colors">
                          <td className="p-2 border border-white/10 sticky left-0 bg-[#141418] z-10 font-bold text-left">
                            <span className="px-2 py-0.5 rounded bg-white/5 text-white/90">
                              {sess.session === 'S' ? 'Sáng' : sess.session === 'C' ? 'Chiều' : 'Tối'}
                            </span>
                          </td>
                          {timesheet.daysMeta.map((dm) => {
                            const val = sess.days[dm.day];
                            return (
                              <td
                                key={dm.day}
                                className={`p-1 border border-white/10 font-bold text-center ${
                                  dm.isSunday ? 'bg-rose-500/5' : ''
                                }`}
                              >
                                {val === 'LV' && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px]">
                                    LV
                                  </span>
                                )}
                                {val === 'SV' && (
                                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px]">
                                    SV
                                  </span>
                                )}
                                {val === 'NL' && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px]">
                                    NL
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Danh sách các ca trực Studio của CTV */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-black/25 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <CalendarDays className="w-4 h-4 text-brand-primary" />
                    <span>Lịch Trực Studio Của Tôi (Tháng {dutyMonth}/{dutyYear})</span>
                  </h3>
                  <p className="text-xs text-studio-muted mt-0.5">
                    Quản lý danh sách ca trực đăng ký, trạng thái duyệt và xác nhận hoàn thành thực tế.
                  </p>
                </div>
              </div>

              {loadingDuty ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
                </div>
              ) : shifts.length === 0 ? (
                <div className="text-center py-12 bg-white/2 rounded-2xl border border-white/5 border-dashed">
                  <Calendar className="w-10 h-10 text-studio-muted mx-auto mb-2 opacity-30" />
                  <p className="text-white font-bold text-sm">Chưa có ca trực nào trong tháng {dutyMonth}/{dutyYear}</p>
                  <p className="text-xs text-studio-muted mt-1">
                    Hãy bấm &quot;Đăng ký ca trực Studio&quot; để đăng ký lịch trực với Bộ phận Truyền thông.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-studio-muted font-bold">
                        <th className="py-3 px-3">Ngày trực</th>
                        <th className="py-3 px-3">Ca trực</th>
                        <th className="py-3 px-3">Thời gian</th>
                        <th className="py-3 px-3">Thời lượng</th>
                        <th className="py-3 px-3">Ghi chú</th>
                        <th className="py-3 px-3">Trạng thái</th>
                        <th className="py-3 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {shifts.map((shift) => {
                        const shiftDateObj = new Date(shift.date);
                        const todayObj = new Date();
                        todayObj.setHours(23, 59, 59, 999);
                        const isPastOrToday = shiftDateObj <= todayObj;

                        return (
                          <tr key={shift.id} className="hover:bg-white/2 transition-colors">
                            <td className="py-3 px-3 font-semibold text-white">
                              {format(new Date(shift.date), 'dd/MM/yyyy')}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-white">
                                {shift.shiftType === 'SANG' ? 'Sáng' : shift.shiftType === 'CHIEU' ? 'Chiều' : 'Tối'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-studio-muted">
                              {shift.startTime} - {shift.endTime}
                            </td>
                            <td className="py-3 px-3 text-white font-medium">
                              {shift.hours} giờ
                            </td>
                            <td className="py-3 px-3 text-studio-muted max-w-[200px] truncate">
                              {shift.note || '—'}
                            </td>
                            <td className="py-3 px-3">
                              {getShiftBadge(shift.status)}
                            </td>
                            <td className="py-3 px-3 text-right space-x-2">
                              {shift.status === 'REGISTERED' && (
                                <button
                                  onClick={() => handleCancelShift(shift.id)}
                                  className="text-rose-400 hover:text-rose-300 font-bold p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Hủy đăng ký"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}

                              {shift.status === 'CONFIRMED' && isPastOrToday && (
                                <button
                                  onClick={() => handleCompleteShift(shift.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold transition-colors cursor-pointer"
                                >
                                  Xác nhận đã trực xong
                                </button>
                              )}

                              {shift.status === 'COMPLETED' && (
                                <span className="text-emerald-400 text-[11px] font-semibold flex items-center justify-end space-x-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã tính công</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: CTV NỘP KẾT QUẢ DUYỆT                                           */}
        {/* ========================================================================= */}
        {submitModalOpen && selectedTaskToSubmit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/10 bg-[#121216] shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2">
                  <Send className="w-5 h-5 text-brand-primary" />
                  <h3 className="font-bold text-white text-base">Nộp Kết Quả Nhiệm Vụ</h3>
                </div>
                <button
                  onClick={() => setSubmitModalOpen(false)}
                  className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-white/2 rounded-2xl border border-white/5">
                <span className="text-[10px] uppercase font-bold text-studio-muted block">Nhiệm vụ:</span>
                <p className="text-sm font-bold text-white mt-0.5">{selectedTaskToSubmit.title}</p>
              </div>

              <form onSubmit={handleSubmitTaskResult} className="space-y-4 text-xs">
                <div>
                  <label className="block text-studio-muted mb-1 font-medium">
                    Link sản phẩm (Google Drive, YouTube, Figma, Canva, OneDrive, TikTok...)
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 text-studio-muted absolute left-3 top-3" />
                    <input
                      type="url"
                      value={resultLink}
                      onChange={(e) => setResultLink(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-studio-muted focus:outline-none focus:border-brand-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-studio-muted mb-1 font-medium">
                    File minh chứng / Tên file đính kèm
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-studio-muted absolute left-3 top-3" />
                    <input
                      type="text"
                      value={proofFile}
                      onChange={(e) => setProofFile(e.target.value)}
                      placeholder="minh_chung_su_kien_10_10.zip hoặc link ảnh"
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-studio-muted focus:outline-none focus:border-brand-primary/50"
                    />
                  </div>
                  <p className="text-[11px] text-studio-muted mt-1">
                    * Yêu cầu cung cấp ít nhất một trong hai thông tin: Link sản phẩm hoặc File minh chứng.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setSubmitModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-studio-muted hover:text-white font-medium transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submittingResult}
                    className="py-2.5 px-6 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all shadow-lg shadow-brand-primary/20 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingResult && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Nộp duyệt ngay</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: KHAI BÁO CÔNG VIỆC NGOÀI HỆ THỐNG                              */}
        {/* ========================================================================= */}
        {externalModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/10 bg-[#121216] shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2">
                  <PlusCircle className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-white text-base">Khai Báo Công Việc Ngoài Hệ Thống</h3>
                </div>
                <button
                  onClick={() => setExternalModalOpen(false)}
                  className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-xs text-purple-300 leading-relaxed">
                Dành cho các sự vụ phát sinh thực tế do bạn tự thực hiện. Sau khi gửi, Quản trị viên sẽ xác minh và nghiệm thu để tự động đưa vào Bảng thống kê công việc và Bảng chấm công tháng.
              </div>

              <form onSubmit={handleSubmitExternalTask} className="space-y-4 text-xs">
                <div>
                  <label className="block text-studio-muted mb-1 font-medium">
                    Tên công việc phát sinh <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={externalTitle}
                    onChange={(e) => setExternalTitle(e.target.value)}
                    placeholder="VD: Hỗ trợ chụp ảnh Lễ bế giảng Khóa 2022..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-studio-muted focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                {/* Loại công việc */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-studio-muted mb-1 font-medium">
                      Loại công việc <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={externalTaskType}
                      onChange={(e) => setExternalTaskType(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                    >
                      {TASK_TYPES.map((type) => (
                        <option key={type} value={type} className="bg-[#121216] text-white">
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {externalTaskType === 'Khác' && (
                    <div>
                      <label className="block text-studio-muted mb-1 font-medium">
                        Tên loại công việc <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={externalOtherTaskType}
                        onChange={(e) => setExternalOtherTaskType(e.target.value)}
                        placeholder="VD: Phiên dịch viên..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-studio-muted focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  )}
                </div>

                {/* Ngày thực hiện, Buổi & Số giờ */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-studio-muted mb-1 font-medium">Ngày thực hiện</label>
                    <input
                      type="date"
                      value={externalExecutionDate}
                      onChange={(e) => setExternalExecutionDate(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-studio-muted mb-1 font-medium">Buổi làm</label>
                    <select
                      value={externalShiftSession}
                      onChange={(e) => setExternalShiftSession(e.target.value as 'S' | 'C' | 'T')}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                    >
                      <option value="S" className="bg-[#121216]">Sáng</option>
                      <option value="C" className="bg-[#121216]">Chiều</option>
                      <option value="T" className="bg-[#121216]">Tối</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-studio-muted mb-1 font-medium">Số giờ thực tế</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      value={externalActualHours}
                      onChange={(e) => setExternalActualHours(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                {/* Overtime & Sunday checkboxes */}
                <div className="p-3 bg-white/2 rounded-2xl border border-white/5 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-studio-muted block">Hệ số thù lao theo quy định:</span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={externalIsOvertime}
                        onChange={(e) => setExternalIsOvertime(e.target.checked)}
                        className="rounded border-white/20 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-white font-medium">Làm sau 16:30 (Hệ số 1.5)</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={externalIsSunday}
                        onChange={(e) => setExternalIsSunday(e.target.checked)}
                        className="rounded border-white/20 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-white font-medium">Làm vào Chủ nhật (Hệ số 2.0)</span>
                    </label>
                  </div>

                  {externalIsOvertime && (
                    <div className="pt-2">
                      <label className="block text-studio-muted mb-1 font-medium">Số giờ làm sau 16:30:</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={externalActualHours}
                        value={externalOvertimeHours}
                        onChange={(e) => setExternalOvertimeHours(Number(e.target.value))}
                        className="w-32 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-white"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-studio-muted mb-1 font-medium">Mô tả chi tiết nội dung sự vụ</label>
                  <textarea
                    rows={2}
                    value={externalDescription}
                    onChange={(e) => setExternalDescription(e.target.value)}
                    placeholder="Mô tả cụ thể nhiệm vụ bạn đã thực hiện..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-studio-muted focus:outline-none focus:border-purple-500/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-studio-muted mb-1 font-medium">Link sản phẩm</label>
                  <input
                    type="url"
                    value={externalResultLink}
                    onChange={(e) => setExternalResultLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-studio-muted focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div>
                  <label className="block text-studio-muted mb-1 font-medium">File minh chứng</label>
                  <input
                    type="text"
                    value={externalProofFile}
                    onChange={(e) => setExternalProofFile(e.target.value)}
                    placeholder="file_anh_kiem_tra.jpg"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-studio-muted focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setExternalModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-studio-muted hover:text-white font-medium transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submittingExternal}
                    className="py-2.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-600/20 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingExternal && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Gửi khai báo</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: ĐĂNG KÝ CA TRỰC STUDIO                                         */}
        {/* ========================================================================= */}
        {registerShiftModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 bg-[#121216] shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2">
                  <CalendarDays className="w-5 h-5 text-brand-primary" />
                  <h3 className="font-bold text-white text-base">Đăng Ký Ca Trực Studio</h3>
                </div>
                <button
                  onClick={() => setRegisterShiftModalOpen(false)}
                  className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-300 leading-relaxed">
                Ca trực tiêu chuẩn là <strong>4 giờ</strong> (tương đương <strong>80.000 VNĐ</strong>). Khi trực xong và được xác nhận, ca trực sẽ tự động ghi ký hiệu <strong>LV</strong> vào Bảng chấm công tháng.
              </div>

              <form onSubmit={handleRegisterShift} className="space-y-4 text-xs">
                <div>
                  <label className="block text-studio-muted mb-1 font-medium">
                    Ngày trực <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={shiftDate}
                    onChange={(e) => setShiftDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                  />
                  <p className="text-[11px] text-studio-muted mt-1">* Chỉ có thể đăng ký ca trực từ ngày hôm nay trở đi.</p>
                </div>

                <div>
                  <label className="block text-studio-muted mb-1 font-medium">
                    Buổi trực <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value as 'SANG' | 'CHIEU' | 'TOI')}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                  >
                    <option value="SANG" className="bg-[#121216]">Ca Sáng (07:30 - 11:30 | 4.0 giờ)</option>
                    <option value="CHIEU" className="bg-[#121216]">Ca Chiều (13:00 - 17:00 | 4.0 giờ)</option>
                    <option value="TOI" className="bg-[#121216]">Ca Tối (17:30 - 21:30 | 4.0 giờ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-studio-muted mb-1 font-medium">Ghi chú (Tùy chọn)</label>
                  <textarea
                    rows={2}
                    value={shiftNote}
                    onChange={(e) => setShiftNote(e.target.value)}
                    placeholder="VD: Trực hỗ trợ kỹ thuật phòng Studio A, chuẩn bị đèn..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-studio-muted focus:outline-none focus:border-brand-primary/50 resize-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setRegisterShiftModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-studio-muted hover:text-white font-medium transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submittingShift}
                    className="py-2.5 px-6 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all shadow-lg shadow-brand-primary/20 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingShift && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Đăng ký ca</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: CHI TIẾT NHIỆM VỤ                                              */}
        {/* ========================================================================= */}
        {detailModalOpen && selectedTaskForDetail && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/10 bg-[#121216] shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-brand-primary" />
                  <h3 className="font-bold text-white text-base">Chi Tiết Công Việc</h3>
                </div>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Title */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedTaskForDetail.isExternal ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/35">
                        Việc ngoài hệ thống
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/10 text-studio-muted border border-white/10">
                        Nhiệm vụ giao
                      </span>
                    )}

                    {selectedTaskForDetail.taskType && (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-brand-primary/15 text-brand-primary border border-brand-primary/30 flex items-center space-x-1">
                        <Tag className="w-3 h-3" />
                        <span>
                          {selectedTaskForDetail.taskType === 'Khác' && selectedTaskForDetail.otherTaskType
                            ? `Khác: ${selectedTaskForDetail.otherTaskType}`
                            : selectedTaskForDetail.taskType}
                        </span>
                      </span>
                    )}

                    {getStatusBadge(selectedTaskForDetail.status)}
                  </div>

                  <h2 className="text-base font-bold text-white leading-snug pt-1">
                    {selectedTaskForDetail.title}
                  </h2>
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/2 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-studio-muted block">Hạn hoàn thành</span>
                    <span className="text-white font-medium flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-studio-muted" />
                      <span>
                        {selectedTaskForDetail.deadline
                          ? format(new Date(selectedTaskForDetail.deadline), 'dd/MM/yyyy HH:mm')
                          : 'Không giới hạn'}
                      </span>
                    </span>
                  </div>

                  <div className="p-3 bg-white/2 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-studio-muted block">Người giao việc</span>
                    <span className="text-white font-medium">
                      {selectedTaskForDetail.creator?.fullName || 'Quản trị viên Studio'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-studio-muted block">Mô tả công việc & Yêu cầu</span>
                  <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 text-white/80 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {selectedTaskForDetail.description || 'Không có mô tả chi tiết kèm theo.'}
                  </div>
                </div>

                {/* Feedback if any */}
                {selectedTaskForDetail.feedback && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-rose-300 flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Ý kiến phản hồi / Yêu cầu chỉnh sửa</span>
                    </span>
                    <div className="p-3.5 bg-rose-500/10 rounded-2xl border border-rose-500/25 text-rose-200 leading-relaxed font-medium">
                      {selectedTaskForDetail.feedback}
                    </div>
                  </div>
                )}

                {/* Submitted Results */}
                {(selectedTaskForDetail.resultLink || selectedTaskForDetail.proofFile) && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] uppercase font-bold text-studio-muted block">Kết quả / Minh chứng đã nộp</span>
                    {selectedTaskForDetail.resultLink && (
                      <div className="flex items-center space-x-2 text-brand-primary bg-brand-primary/5 p-2.5 rounded-xl border border-brand-primary/15">
                        <LinkIcon className="w-4 h-4 shrink-0" />
                        <a
                          href={selectedTaskForDetail.resultLink}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline font-semibold flex items-center space-x-1 break-all"
                        >
                          <span>{selectedTaskForDetail.resultLink}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    )}
                    {selectedTaskForDetail.proofFile && (
                      <div className="flex items-center space-x-2 text-blue-400 bg-blue-500/5 p-2.5 rounded-xl border border-blue-500/15">
                        <FileText className="w-4 h-4 shrink-0" />
                        <a
                          href={selectedTaskForDetail.proofFile}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline font-semibold flex items-center space-x-1 break-all"
                        >
                          <span>{selectedTaskForDetail.proofFile}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="py-2.5 px-6 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-all cursor-pointer text-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
