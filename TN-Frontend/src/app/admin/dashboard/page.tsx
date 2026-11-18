'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import DatePickerVN from '@/components/common/DatePickerVN';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import {
  Camera,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Users,
  ClipboardList,
  Loader2,
  CalendarRange,
  Trophy,
  Percent,
  X,
  Briefcase,
  DollarSign,
  Clock,
  ChevronRight,
  ArrowUpRight,
  Flame,
  ShieldAlert,
} from 'lucide-react';

interface UrgentTaskItem {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  isOverdue: boolean;
  assignee: {
    id: string;
    fullName: string;
    email: string;
    avatar?: string | null;
  } | null;
}

interface DashboardStats {
  equipment: {
    total: number;
    available: number;
    borrowed: number;
    maintenance: number;
  };
  requests: {
    pendingBorrows: number;
    pendingBookings: number;
  };
  users: {
    total: number;
  };
  tasks?: {
    total: number;
    notStarted: number;
    inProgress: number;
    pendingApproval: number;
    revisionRequested: number;
    completed: number;
    overdue: number;
    urgentTasks: UrgentTaskItem[];
  };
  payroll?: {
    month: number;
    year: number;
    totalAmount: number;
    totalHours: number;
    collaboratorCount: number;
    statusBreakdown: {
      DRAFT: number;
      CONFIRMED: number;
      PAID: number;
    };
  };
}

interface TopUsedEquipment {
  id: string;
  count: number;
  name: string;
  code: string;
  category: string;
  image: string;
}

interface PayrollTrendItem {
  year: number;
  month: number;
  label: string;
  totalAmount: number;
  totalHours: number;
  collaboratorCount: number;
}

interface ChartItem {
  date: string;
  borrows: number;
  bookings: number;
  tasks?: number;
}

interface ReportData {
  borrowsCount: number;
  bookingsCount: number;
  tasksCount?: number;
  tasksCompletedCount?: number;
  tasksInProgressCount?: number;
  tasksPendingApprovalCount?: number;
  tasksOverdueCount?: number;
  topEquipment: TopUsedEquipment[];
  utilizationRate: number;
  chartData: ChartItem[];
  payrollTrend?: PayrollTrendItem[];
}

export default function AdminDashboardPage() {
  const { toast } = useToast();

  // Total stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Time filter states
  const [range, setRange] = useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Excel Export Dialog states
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportRange, setExportRange] = useState<'week' | 'month' | 'year' | 'month-year' | 'custom'>('month');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);

  const openExportDialog = () => {
    setExportRange(range);
    if (range === 'custom') {
      setExportStartDate(startDate);
      setExportEndDate(endDate);
    }
    setExportDialogOpen(true);
  };

  // Report data states
  const [reports, setReports] = useState<ReportData | null>(null);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [range, startDate, endDate]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await api.get('/dashboard/stats');
      setStats(data);
    } catch (err: any) {
      toast(err.message || 'Lỗi tải thống kê tổng quát', 'error');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchReports = async () => {
    if (range === 'custom' && (!startDate || !endDate)) return;
    setReportsLoading(true);
    try {
      let query = `?range=${range}`;
      if (range === 'custom') {
        query += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const data = await api.get(`/dashboard/reports${query}`);
      setReports(data);
    } catch (err: any) {
      toast(err.message || 'Lỗi tải báo cáo thống kê', 'error');
    } finally {
      setReportsLoading(false);
    }
  };

  const handleExportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);
    try {
      let query = `?range=${exportRange}`;
      if (exportRange === 'custom') {
        if (!exportStartDate || !exportEndDate) {
          toast('Vui lòng chọn khoảng ngày bắt đầu và kết thúc', 'warning');
          setExporting(false);
          return;
        }
        query += `&startDate=${exportStartDate}&endDate=${exportEndDate}`;
      } else if (exportRange === 'month-year') {
        query += `&month=${exportMonth}&year=${exportYear}`;
      }

      await api.download(
        `/reports/export-excel${query}`,
        `LHU_Media_Bao_Cao_Tong_Hop_${exportRange}.xlsx`
      );

      toast('Xuất báo cáo Excel thành công!', 'success');
      setExportDialogOpen(false);
    } catch (err: any) {
      toast(err.message || 'Lỗi xuất báo cáo Excel', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleRangeChange = (newRange: 'week' | 'month' | 'year' | 'custom') => {
    setRange(newRange);
    if (newRange !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Helper to find the maximum value in chart data for drawing relative heights
  const getMaxChartValue = () => {
    if (!reports || reports.chartData.length === 0) return 1;
    const maxVal = Math.max(
      ...reports.chartData.map((d) => Math.max(d.borrows, d.bookings, d.tasks || 0))
    );
    return maxVal === 0 ? 1 : maxVal;
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Chưa đặt hạn';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getTaskStatusBadge = (s: string, isOverdue: boolean) => {
    if (isOverdue) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Quá hạn</span>
        </span>
      );
    }
    switch (s) {
      case 'PENDING_APPROVAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Chờ duyệt
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Đang làm
          </span>
        );
      case 'REVISION_REQUESTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
            Cần sửa
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Đã xong
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-studio-muted">
            Chưa làm
          </span>
        );
    }
  };

  const totalTasks = stats?.tasks?.total || 0;
  const completedTasks = stats?.tasks?.completed || 0;
  const overdueTasksCount = stats?.tasks?.overdue || 0;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  return (
    <AdminLayout>
      <div className="space-y-10 text-left">
        {/* Header & Export Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Thống Kê & Báo Cáo</h1>
            <p className="text-sm text-studio-muted mt-1">
              Tổng quan tình hình thiết bị, công việc CTV và thù lao.
            </p>
          </div>
          <button
            onClick={openExportDialog}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/10 transition-all transform hover:-translate-y-0.5 cursor-pointer self-start sm:self-auto text-sm"
          >
            <ClipboardList className="w-5 h-5" />
            <span>Xuất Báo Cáo Excel</span>
          </button>
        </div>

        {/* 1. SECTION: CÔNG VIỆC CTV & THÙ LAO (FR-08, FR-04, FR-05) */}
        {statsLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
          </div>
        ) : stats && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-studio-muted flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-brand-primary" />
                <span>Thống kê Công việc & Thù lao CTV</span>
              </h2>
              <div className="flex items-center space-x-3 text-xs">
                <Link
                  href="/admin/tasks"
                  className="text-brand-primary hover:text-white transition-colors flex items-center space-x-1"
                >
                  <span>Quản lý công việc</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-white/20">|</span>
                <Link
                  href="/admin/payroll"
                  className="text-amber-400 hover:text-white transition-colors flex items-center space-x-1"
                >
                  <span>Bảng chấm công</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Task Progress Summary */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between hover:border-brand-primary/30 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-studio-muted uppercase tracking-wider block">
                    Tiến độ công việc
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Briefcase className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-extrabold text-white">{totalTasks}</span>
                    <span className="text-xs text-studio-muted font-medium">nhiệm vụ</span>
                  </div>
                  <div className="mt-2 flex items-center space-x-3 text-[11px] text-studio-muted">
                    <span className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                      <span>Đang làm: <strong className="text-white">{stats.tasks?.inProgress || 0}</strong></span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                      <span>Chờ duyệt: <strong className="text-amber-300">{stats.tasks?.pendingApproval || 0}</strong></span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Overdue Alert Card */}
              <div
                className={`glass-panel p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                  overdueTasksCount > 0
                    ? 'border-rose-500/40 bg-gradient-to-br from-rose-500/10 to-transparent shadow-lg shadow-rose-500/5'
                    : 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-studio-muted">
                    Cảnh báo trễ hạn
                  </span>
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      overdueTasksCount > 0
                        ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {overdueTasksCount > 0 ? (
                      <Flame className="w-5 h-5 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline space-x-2">
                    <span
                      className={`text-3xl font-black ${
                        overdueTasksCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {overdueTasksCount}
                    </span>
                    <span className="text-xs font-semibold text-studio-muted">
                      {overdueTasksCount > 0 ? 'việc quá hạn' : 'việc trễ'}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-studio-muted">
                    {overdueTasksCount > 0 ? (
                      <span className="text-rose-400 font-semibold flex items-center space-x-1">
                        <ShieldAlert className="w-3.5 h-3.5 inline shrink-0" />
                        <span>Cần đôn đốc và kiểm tra ngay</span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium">
                        ✓ Tất cả công việc đúng hạn chót
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Monthly Payroll Card */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between hover:border-amber-400/30 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-studio-muted uppercase tracking-wider block">
                    Thù lao Tháng {stats.payroll?.month}/{stats.payroll?.year}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-amber-300 block truncate">
                    {formatCurrency(stats.payroll?.totalAmount || 0)}
                  </span>
                  <div className="mt-2 flex items-center space-x-3 text-[11px] text-studio-muted">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-studio-muted" />
                      <span>{stats.payroll?.totalHours || 0} giờ công</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3 text-studio-muted" />
                      <span>{stats.payroll?.collaboratorCount || 0} CTV</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Completion Rate Card */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-studio-muted uppercase tracking-wider block">
                    Tỷ lệ hoàn thành
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Percent className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-extrabold text-emerald-400">
                      {taskCompletionRate}%
                    </span>
                    <span className="text-xs text-studio-muted font-medium">nghiệm thu</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${taskCompletionRate}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      />
                    </div>
                    <span className="text-[10px] text-studio-muted block">
                      Đã xong: {completedTasks}/{totalTasks} nhiệm vụ
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. SECTION: TỔNG QUAN THIẾT BỊ */}
        {stats && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-studio-muted flex items-center space-x-2">
              <Camera className="w-4 h-4 text-brand-accent" />
              <span>Thống kê Thiết bị & Yêu cầu</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total equipment */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 flex items-center justify-between h-28">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-studio-muted uppercase tracking-wider block">
                    Tổng số thiết bị
                  </span>
                  <span className="text-3xl font-extrabold text-white block">
                    {stats.equipment.total}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-studio-muted">
                  <Camera className="w-5.5 h-5.5" />
                </div>
              </div>

              {/* Available */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 flex items-center justify-between h-28">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-studio-muted uppercase tracking-wider block">
                    Thiết bị khả dụng
                  </span>
                  <span className="text-3xl font-extrabold text-brand-success block">
                    {stats.equipment.available}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-brand-success/10 flex items-center justify-center text-brand-success">
                  <CheckCircle2 className="w-5.5 h-5.5" />
                </div>
              </div>

              {/* Borrowed */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 flex items-center justify-between h-28">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-studio-muted uppercase tracking-wider block">
                    Đang cho mượn
                  </span>
                  <span className="text-3xl font-extrabold text-brand-primary block">
                    {stats.equipment.borrowed}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <AlertCircle className="w-5.5 h-5.5" />
                </div>
              </div>

              {/* Maintenance */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 flex items-center justify-between h-28">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-studio-muted uppercase tracking-wider block">
                    Đang bảo trì
                  </span>
                  <span className="text-3xl font-extrabold text-brand-error block">
                    {stats.equipment.maintenance}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-brand-error/10 flex items-center justify-center text-brand-error">
                  <AlertTriangle className="w-5.5 h-5.5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. TIME FILTER TOOLBAR */}
        <div className="glass-panel p-5 rounded-3xl border border-white/5 bg-black/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleRangeChange('week')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                range === 'week'
                  ? 'bg-brand-primary text-white'
                  : 'bg-white/5 text-studio-muted hover:text-white'
              }`}
            >
              Tuần này
            </button>
            <button
              onClick={() => handleRangeChange('month')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                range === 'month'
                  ? 'bg-brand-primary text-white'
                  : 'bg-white/5 text-studio-muted hover:text-white'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => handleRangeChange('year')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                range === 'year'
                  ? 'bg-brand-primary text-white'
                  : 'bg-white/5 text-studio-muted hover:text-white'
              }`}
            >
              Năm này
            </button>
            <button
              onClick={() => handleRangeChange('custom')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                range === 'custom'
                  ? 'bg-brand-primary text-white'
                  : 'bg-white/5 text-studio-muted hover:text-white'
              }`}
            >
              Khoảng tự chọn
            </button>
          </div>

          {range === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              <DatePickerVN
                value={startDate}
                onChange={setStartDate}
              />
              <span className="text-xs text-studio-muted">đến</span>
              <DatePickerVN
                value={endDate}
                onChange={setEndDate}
              />
            </div>
          )}
        </div>

        {/* 4. REPORT DATA GRID */}
        {reportsLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : reports && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Numeric rates grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Borrows count */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-black/15 text-left space-y-2">
                  <div className="flex items-center justify-between text-brand-primary">
                    <span className="text-[10px] font-bold text-studio-muted uppercase tracking-wider">
                      Mượn thiết bị
                    </span>
                    <Camera className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-2xl font-black text-white block">
                    {reports.borrowsCount} <span className="text-xs font-semibold text-studio-muted">lượt</span>
                  </span>
                </div>

                {/* Bookings count */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-black/15 text-left space-y-2">
                  <div className="flex items-center justify-between text-brand-accent">
                    <span className="text-[10px] font-bold text-studio-muted uppercase tracking-wider">
                      Đặt Studio
                    </span>
                    <Calendar className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-2xl font-black text-white block">
                    {reports.bookingsCount} <span className="text-xs font-semibold text-studio-muted">lượt</span>
                  </span>
                </div>

                {/* Tasks count in period */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-black/15 text-left space-y-2">
                  <div className="flex items-center justify-between text-amber-400">
                    <span className="text-[10px] font-bold text-studio-muted uppercase tracking-wider">
                      Nhiệm vụ CTV
                    </span>
                    <Briefcase className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-2xl font-black text-white block">
                    {reports.tasksCount ?? 0} <span className="text-xs font-semibold text-studio-muted">việc</span>
                  </span>
                </div>
              </div>

              {/* Time Series Triple-Bar Visualizer */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-black/25 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <CalendarRange className="w-4 h-4 text-brand-primary" />
                    <span>Lượt hoạt động theo thời gian</span>
                  </h3>
                  {/* Legend */}
                  <div className="flex items-center space-x-3 text-[10px] font-bold uppercase">
                    <div className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-brand-primary inline-block" />
                      <span className="text-studio-muted">Mượn máy</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-brand-accent inline-block" />
                      <span className="text-studio-muted">Đặt phòng</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                      <span className="text-studio-muted">Công việc</span>
                    </div>
                  </div>
                </div>

                {reports.chartData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-xs text-studio-muted">
                    Không có số liệu biểu đồ trong khoảng thời gian này.
                  </div>
                ) : (
                  <div className="overflow-x-auto pt-4">
                    <div className="h-56 flex items-end space-x-4 min-w-[500px] pb-4 px-2">
                      {reports.chartData.map((d, idx) => {
                        const maxVal = getMaxChartValue();
                        const borrowHeight = (d.borrows / maxVal) * 100;
                        const bookingHeight = (d.bookings / maxVal) * 100;
                        const taskHeight = ((d.tasks || 0) / maxVal) * 100;

                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center h-full justify-end group space-y-2"
                          >
                            <div className="flex items-end space-x-1 h-full w-full justify-center">
                              {/* Borrows bar */}
                              <div
                                style={{ height: `${Math.max(4, borrowHeight)}%` }}
                                className="w-2.5 sm:w-3.5 rounded-t-md bg-brand-primary transition-all duration-300 group-hover:brightness-125 relative"
                                title={`Mượn thiết bị: ${d.borrows} lượt`}
                              >
                                {d.borrows > 0 && (
                                  <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-[9px] font-bold text-white bg-black px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {d.borrows}
                                  </span>
                                )}
                              </div>
                              {/* Bookings bar */}
                              <div
                                style={{ height: `${Math.max(4, bookingHeight)}%` }}
                                className="w-2.5 sm:w-3.5 rounded-t-md bg-brand-accent transition-all duration-300 group-hover:brightness-125 relative"
                                title={`Đặt Studio: ${d.bookings} lượt`}
                              >
                                {d.bookings > 0 && (
                                  <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-[9px] font-bold text-white bg-black px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {d.bookings}
                                  </span>
                                )}
                              </div>
                              {/* Tasks bar */}
                              <div
                                style={{ height: `${Math.max(4, taskHeight)}%` }}
                                className="w-2.5 sm:w-3.5 rounded-t-md bg-amber-400 transition-all duration-300 group-hover:brightness-125 relative"
                                title={`Nhiệm vụ CTV: ${d.tasks || 0} việc`}
                              >
                                {(d.tasks || 0) > 0 && (
                                  <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-[9px] font-bold text-white bg-black px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {d.tasks}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-studio-muted font-bold tracking-tight shrink-0">
                              {d.date}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Top 5 devices used */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-black/25 space-y-6 flex flex-col">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5 border-b border-white/5 pb-3 shrink-0">
                <Trophy className="w-4 h-4 text-brand-accent" />
                <span>Thiết bị mượn nhiều nhất</span>
              </h3>

              {reports.topEquipment.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-studio-muted py-12">
                  Chưa có số liệu mượn thiết bị.
                </div>
              ) : (
                <div className="space-y-5 flex-1 overflow-y-auto max-h-[380px] pr-1">
                  {reports.topEquipment.map((eq, index) => {
                    const maxUsage = reports.topEquipment[0]?.count || 1;
                    const percentWidth = (eq.count / maxUsage) * 100;

                    return (
                      <div key={eq.id} className="space-y-1.5 text-left">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-black text-brand-primary w-4">
                            #{index + 1}
                          </span>
                          {eq.image && (
                            <img
                              src={eq.image}
                              alt={eq.name}
                              className="w-8 h-8 rounded-lg object-cover border border-white/5"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate" title={eq.name}>
                              {eq.name}
                            </h4>
                            <span className="text-[9px] text-studio-muted font-semibold block mt-0.5">
                              {eq.category} • {eq.count} lượt mượn
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${percentWidth}%` }}
                            className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. BOTTOM SECTION: URGENT / OVERDUE TASKS & COLLABORATOR PAYROLL TREND */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Urgent & Overdue Tasks Widget */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-black/25 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Công việc cần chú ý & Trễ hạn</span>
              </h3>
              <Link
                href="/admin/tasks"
                className="text-xs font-semibold text-brand-primary hover:text-white transition-colors flex items-center space-x-1"
              >
                <span>Xem tất cả</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {(!stats?.tasks?.urgentTasks || stats.tasks.urgentTasks.length === 0) ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-80" />
                <p className="text-xs text-studio-muted">
                  Không có công việc nào bị quá hạn hoặc sắp tới hạn. Tiến độ rất tốt!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.tasks.urgentTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      t.isOverdue
                        ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40'
                        : 'bg-white/2 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {/* Avatar / Assignee Icon */}
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center font-bold text-xs text-brand-primary shrink-0">
                        {t.assignee?.fullName
                          ? t.assignee.fullName.charAt(0).toUpperCase()
                          : '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-white truncate" title={t.title}>
                            {t.title}
                          </h4>
                          {getTaskStatusBadge(t.status, t.isOverdue)}
                        </div>
                        <div className="mt-1 flex items-center space-x-3 text-[10px] text-studio-muted">
                          <span>
                            CTV: <strong className="text-white/80">{t.assignee?.fullName || 'Chưa gán'}</strong>
                          </span>
                          <span>•</span>
                          <span
                            className={
                              t.isOverdue ? 'text-rose-400 font-bold' : 'text-studio-muted'
                            }
                          >
                            Hạn: {formatDateTime(t.deadline)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/admin/tasks?id=${t.id}`}
                      className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/5 transition-all shrink-0"
                      title="Mở chi tiết công việc"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collaborator Payroll Monthly Trend Widget */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-black/25 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Xu hướng Thù lao CTV theo tháng</span>
              </h3>
              <Link
                href="/admin/payroll"
                className="text-xs font-semibold text-amber-400 hover:text-white transition-colors flex items-center space-x-1"
              >
                <span>Xem bảng chấm công</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {(!reports?.payrollTrend || reports.payrollTrend.length === 0) ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                <DollarSign className="w-8 h-8 text-amber-400 opacity-40" />
                <p className="text-xs text-studio-muted">
                  Chưa có lịch sử bảng lương các tháng trước. Số liệu sẽ tự động tích lũy khi chốt công hàng tháng.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {reports.payrollTrend.slice(-5).map((item, idx) => {
                    const maxAmt = Math.max(
                      ...reports.payrollTrend!.map((p) => p.totalAmount),
                      1
                    );
                    const percent = Math.max(5, (item.totalAmount / maxAmt) * 100);

                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white flex items-center space-x-2">
                            <span>{item.label}</span>
                            <span className="text-[10px] font-normal text-studio-muted">
                              ({item.collaboratorCount} CTV • {item.totalHours}h)
                            </span>
                          </span>
                          <span className="font-extrabold text-amber-300">
                            {formatCurrency(item.totalAmount)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${percent}%` }}
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-studio-muted">
                  <span>Mức chi trả cơ bản: <strong>20.000 đ/giờ</strong></span>
                  <span>Hệ số ngoài giờ: <strong>x1.5 (T2-T7) / x2.0 (CN)</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Export Excel Dialog */}
        {exportDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setExportDialogOpen(false)}
            />

            <div className="glass-panel max-w-md w-full rounded-[32px] border border-white/5 overflow-hidden shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <ClipboardList className="w-5 h-5 text-emerald-500" />
                  <span>Xuất Báo Cáo Excel</span>
                </h3>
                <button
                  onClick={() => setExportDialogOpen(false)}
                  className="p-2 rounded-xl text-studio-muted hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleExportExcel} className="p-6 space-y-4 text-left">
                {/* Range Selection */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-studio-muted uppercase">
                    Mốc thời gian báo cáo
                  </label>
                  <select
                    value={exportRange}
                    onChange={(e: any) => setExportRange(e.target.value)}
                    className="w-full bg-black/35 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                    disabled={exporting}
                  >
                    <option value="week">Tuần này</option>
                    <option value="month">Tháng này</option>
                    <option value="year">Năm này</option>
                    <option value="month-year">Chọn cụ thể Tháng/Năm</option>
                    <option value="custom">Khoảng thời gian tùy chọn</option>
                  </select>
                </div>

                {/* Danh sách 6 sheet có trong file xuất */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1.5 text-[11px] text-studio-muted">
                  <p className="font-bold text-white/90">Nội dung file Excel bao gồm 6 sheet đồng bộ:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 list-disc list-inside">
                    <li>Tổng quan chỉ số toàn hệ thống</li>
                    <li>Công việc trễ hạn &amp; Thù lao CTV</li>
                    <li>Lượt hoạt động &amp; Top thiết bị</li>
                    <li>Đơn mượn / trả thiết bị</li>
                    <li>Đặt phòng Studio (4 cấp độ)</li>
                    <li>Danh sách thiết bị &amp; tồn kho</li>
                  </ul>
                </div>

                {/* Specific Month/Year inputs */}
                {exportRange === 'month-year' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-studio-muted uppercase">Tháng</label>
                      <select
                        value={exportMonth}
                        onChange={(e) => setExportMonth(Number(e.target.value))}
                        className="w-full bg-black/35 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none"
                        disabled={exporting}
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Tháng {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-studio-muted uppercase">Năm</label>
                      <select
                        value={exportYear}
                        onChange={(e) => setExportYear(Number(e.target.value))}
                        className="w-full bg-black/35 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none"
                        disabled={exporting}
                      >
                        {Array.from({ length: 5 }, (_, i) => {
                          const yr = new Date().getFullYear() - 2 + i;
                          return (
                            <option key={yr} value={yr}>
                              {yr}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}

                {/* Custom date range inputs */}
                {exportRange === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-studio-muted uppercase block">Từ ngày</label>
                      <DatePickerVN
                        value={exportStartDate}
                        onChange={setExportStartDate}
                        disabled={exporting}
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-studio-muted uppercase block">Đến ngày</label>
                      <DatePickerVN
                        value={exportEndDate}
                        onChange={setExportEndDate}
                        disabled={exporting}
                        required
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setExportDialogOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-sm"
                    disabled={exporting}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={exporting}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white font-bold py-3 rounded-xl shadow-lg transition-all cursor-pointer text-sm"
                  >
                    {exporting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <span>Xuất Excel</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
