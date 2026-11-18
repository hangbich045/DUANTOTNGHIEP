'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import {
  FileSpreadsheet,
  Clock,
  CheckSquare,
  CheckCircle2,
  Coins,
  Sparkles,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Play,
  Info,
  X,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface TaskSummaryItem {
  stt: number;
  id: string;
  date: string;
  title: string;
  content: string;
  taskType: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'REVISION_REQUESTED' | 'COMPLETED';
  hours: number;
  normalHours: number;
  overtimeHours: number;
  sundayHours: number;
  multiplier: number;
  convertedHours: number;
  isHighlighted: boolean;
  multiplierNote: string;
  reason: string;
  note: string;
  resultLink?: string | null;
  proofFile?: string | null;
  feedback?: string | null;
  completedAt?: string | null;
}

interface CollaboratorSummaryData {
  month: number;
  year: number;
  ctv: {
    id: string;
    fullName: string;
    email: string;
    employeeCode?: string;
  };
  summary: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    revisionRequestedTasks: number;
    notStartedTasks: number;
    totalHoursWorked: number;
    confirmedHours: number;
    confirmedConvertedHours: number;
    estimatedSalary: number;
    hourlyRate: number;
  };
  tasks: TaskSummaryItem[];
}

export default function CollaboratorMonthlySummary() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Mặc định tháng/năm hiện tại
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const [data, setData] = useState<CollaboratorSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal Chi tiết nhiệm vụ (Read-only)
  const [selectedTask, setSelectedTask] = useState<TaskSummaryItem | null>(null);

  // Tải dữ liệu tổng công việc tháng của CTV từ Backend (Read-only, đồng bộ Single Source of Truth)
  const fetchMonthlySummary = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res: any = await api.get(`/payroll/collaborator-summary?month=${selectedMonth}&year=${selectedYear}`);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setData(null);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tải bảng tổng công việc tháng', 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, user, toast]);

  useEffect(() => {
    if (user && (user.role === 'COLLABORATOR' || user.role === 'ADMIN')) {
      fetchMonthlySummary();
    }
  }, [fetchMonthlySummary, user]);

  // Xử lý chuyển tháng trước / tháng sau
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    const curNow = new Date();
    setSelectedMonth(curNow.getMonth() + 1);
    setSelectedYear(curNow.getFullYear());
  };

  // Xuất file Excel bảng tổng công việc cá nhân (đồng bộ tháng/năm & trạng thái đang lọc)
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const mm = String(selectedMonth).padStart(2, '0');
      const params = new URLSearchParams({
        month: String(selectedMonth),
        year: String(selectedYear),
      });
      if (statusFilter && statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }
      await api.download(
        `/payroll/export-collaborator-summary?${params.toString()}`,
        `LHU_Media_Tong_Cong_Viec_Ca_Nhan_T${mm}_${selectedYear}.xlsx`
      );
      toast(`Đã xuất file Excel Tổng công việc Tháng ${mm}/${selectedYear}!`, 'success');
    } catch (err: any) {
      toast(err.message || 'Lỗi khi xuất file Excel tổng công việc tháng', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Lọc nhiệm vụ theo trạng thái duyệt nếu có
  const filteredTasks = (data?.tasks || []).filter((task) => {
    if (statusFilter === 'ALL') return true;
    return task.status === statusFilter;
  });

  // Render Badge Trạng thái duyệt
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center space-x-1 whitespace-nowrap shadow-sm">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Đã nghiệm thu</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 inline-flex items-center space-x-1 whitespace-nowrap shadow-sm">
            <Clock className="w-3 h-3 shrink-0" />
            <span>Chờ duyệt</span>
          </span>
        );
      case 'REVISION_REQUESTED':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30 inline-flex items-center space-x-1 whitespace-nowrap shadow-sm">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Cần sửa đổi</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30 inline-flex items-center space-x-1 whitespace-nowrap shadow-sm">
            <Play className="w-3 h-3 shrink-0" />
            <span>Đang thực hiện</span>
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-studio-muted border border-white/10 inline-flex items-center space-x-1 whitespace-nowrap">
            <span>Chưa bắt đầu</span>
          </span>
        );
    }
  };

  // Format ngày dd/mm/yyyy
  const formatDateVN = (dateStr: string) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* BỘ LỌC THÁNG / NĂM & ĐIỀU KHIỂN                                          */}
      {/* ========================================================================= */}
      <div className="glass-panel p-4 md:p-5 rounded-3xl border border-white/10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Chọn Tháng / Năm với nút chuyển nhanh */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={loading}
            className="p-2.5 rounded-xl border border-white/10 bg-black/40 hover:bg-white/10 text-white transition-all cursor-pointer disabled:opacity-50"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dropdown Tháng */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              disabled={loading}
              className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m} className="bg-studio-card text-white">
                  Tháng {m < 10 ? `0${m}` : m}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Năm */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              disabled={loading}
              className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-studio-card text-white">
                  Năm {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={loading}
            className="p-2.5 rounded-xl border border-white/10 bg-black/40 hover:bg-white/10 text-white transition-all cursor-pointer disabled:opacity-50"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {(selectedMonth !== now.getMonth() + 1 || selectedYear !== now.getFullYear()) && (
            <button
              type="button"
              onClick={handleResetToCurrentMonth}
              className="text-xs font-semibold text-brand-primary hover:underline px-2 py-1 cursor-pointer"
            >
              Về tháng hiện tại
            </button>
          )}
        </div>

        {/* Lọc theo trạng thái & Nút Làm mới */}
        <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end">
          <div className="flex items-center space-x-1.5 text-xs text-studio-muted">
            <span className="hidden sm:inline">Lọc trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="ALL" className="bg-studio-card text-white">Tất cả trạng thái</option>
              <option value="COMPLETED" className="bg-studio-card text-white">Đã nghiệm thu</option>
              <option value="PENDING_APPROVAL" className="bg-studio-card text-white">Chờ duyệt</option>
              <option value="REVISION_REQUESTED" className="bg-studio-card text-white">Cần sửa đổi</option>
              <option value="IN_PROGRESS" className="bg-studio-card text-white">Đang thực hiện</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={loading || exporting}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-300 transition-all cursor-pointer disabled:opacity-50"
            title="Xuất bảng tổng công việc cá nhân ra file Excel (.xlsx)"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={fetchMonthlySummary}
            disabled={loading}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu từ server"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 THẺ KPI TỔNG HỢP (SUMMARY STATS CARDS)                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Tổng số công việc */}
        <div className="bg-studio-card/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-studio-muted">Tổng số công việc</span>
            <span className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              <CheckSquare className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {data ? data.summary.totalTasks : 0} <span className="text-xs font-medium text-studio-muted">đầu việc</span>
          </div>
          <div className="text-[11px] text-studio-muted mt-1">
            {data ? `${data.summary.completedTasks} đã duyệt • ${data.summary.pendingTasks} chờ duyệt` : 'Đang tải...'}
          </div>
        </div>

        {/* Card 2: Tổng giờ đã thực hiện */}
        <div className="bg-studio-card/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-studio-muted">Tổng giờ đã thực hiện</span>
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {data ? `${data.summary.totalHoursWorked}` : '0'} <span className="text-xs font-medium text-cyan-400/80">giờ</span>
          </div>
          <div className="text-[11px] text-cyan-400/90 mt-1">
            Thời lượng thực tế dành cho các nhiệm vụ
          </div>
        </div>

        {/* Card 3: Tổng giờ được Nhân sự xác nhận */}
        <div className="bg-studio-card/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-studio-muted">Giờ được Nhân sự xác nhận</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {data ? `${data.summary.confirmedHours}` : '0'} <span className="text-xs font-medium text-emerald-400/80">giờ duyệt</span>
          </div>
          <div className="text-[11px] text-studio-muted mt-1">
            Đã được nghiệm thu hoàn thành
          </div>
        </div>

        {/* Card 4: Giờ quy đổi & Thù lao dự tính */}
        <div className="bg-studio-card/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-studio-muted">Giờ quy đổi &amp; Thù lao</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-300 mt-2">
            {data ? `${data.summary.confirmedConvertedHours}` : '0'} <span className="text-xs font-medium text-amber-400/80">giờ quy đổi</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-bold mt-1">
            {data ? `${data.summary.estimatedSalary.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}{' '}
            <span className="text-studio-muted font-normal text-[10px]">(20.000 đ/h)</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BẢNG THỐNG KÊ CHI TIẾT CÔNG VIỆC THÁNG (TƯƠNG TỰ BẢNG CỦA ADMIN)          */}
      {/* ========================================================================= */}
      <div className="bg-studio-card border border-white/10 rounded-3xl overflow-hidden shadow-2xl space-y-0">
        {/* Header Bảng */}
        <div className="p-4 md:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02]">
          <div className="flex items-center space-x-2 text-xs">
            <Info className="w-4 h-4 text-brand-primary shrink-0" />
            <span className="text-studio-muted">
              Bảng thống kê chi tiết công việc trong{' '}
              <strong className="text-white">
                Tháng {selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth}/{selectedYear}
              </strong>{' '}
              (đồng bộ trực tiếp với Nhân sự)
            </span>
          </div>

          <div className="text-xs text-studio-muted">
            Hiển thị <span className="text-white font-bold">{filteredTasks.length}</span> trên tổng số{' '}
            <span className="text-white font-bold">{data?.tasks.length || 0}</span> nhiệm vụ
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-black/60 text-studio-muted border-b border-white/10 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">STT</th>
                <th className="py-3.5 px-4 w-28 whitespace-nowrap">Ngày</th>
                <th className="py-3.5 px-4 min-w-[280px]">Nội dung công việc</th>
                <th className="py-3.5 px-4 w-36 whitespace-nowrap">Nhiệm vụ</th>
                <th className="py-3.5 px-4 w-32 text-center whitespace-nowrap">Thực hiện (giờ)</th>
                <th className="py-3.5 px-4 w-36 text-center whitespace-nowrap">Trạng thái duyệt</th>
                <th className="py-3.5 px-4 min-w-[220px]">Ghi chú &amp; Hệ số</th>
                <th className="py-3.5 px-4 w-20 text-center whitespace-nowrap">Chi tiết</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 text-xs text-white/90">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-studio-muted">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="w-7 h-7 animate-spin text-brand-primary" />
                      <span className="font-semibold text-white">Đang nạp dữ liệu thống kê công việc...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-studio-muted">
                    <div className="flex flex-col items-center justify-center space-y-2 max-w-md mx-auto">
                      <FileSpreadsheet className="w-10 h-10 text-studio-muted/40 mb-1" />
                      <span className="font-bold text-white text-sm">
                        {statusFilter === 'ALL'
                          ? `Bạn chưa có công việc nào trong Tháng ${selectedMonth}/${selectedYear}`
                          : 'Không có công việc nào khớp với bộ lọc trạng thái'}
                      </span>
                      <p className="text-xs text-studio-muted">
                        Các nhiệm vụ được Nhân sự giao hoặc do bạn tự khai báo trong tháng sẽ tự động hiển thị và đồng bộ tại đây.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isHighlighted = task.isHighlighted;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`transition-colors cursor-pointer group ${isHighlighted
                          ? 'bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-l-amber-400 shadow-sm'
                          : 'hover:bg-white/[0.03]'
                        }`}
                    >
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-bold text-studio-muted group-hover:text-white transition-colors">
                        {task.stt}
                      </td>

                      {/* Ngày thực hiện */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-white/90">
                        {formatDateVN(task.date)}
                      </td>

                      {/* Nội dung công việc */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="font-bold text-white text-xs group-hover:text-brand-primary transition-colors leading-snug">
                            {task.title}
                          </div>
                          {task.content && task.content !== task.title && (
                            <p className="text-[11px] text-studio-muted line-clamp-1 leading-relaxed">
                              {task.content}
                            </p>
                          )}
                          {task.resultLink && (
                            <a
                              href={task.resultLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center space-x-1 text-[10px] text-brand-primary hover:underline font-semibold"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Xem sản phẩm đã nộp</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Nhiệm vụ / Loại việc */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                            {task.taskType}
                          </span>
                          {isHighlighted && task.multiplier && task.multiplier > 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Hệ số ×{task.multiplier}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Số giờ thực hiện */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="font-bold text-white/95 text-xs">
                          {task.hours > 0 ? `${task.hours}h` : '0h'}
                        </div>
                        {isHighlighted && task.convertedHours !== undefined && task.convertedHours !== task.hours && (
                          <div className="text-[10px] text-amber-300 font-bold mt-0.5">
                            ➔ {task.convertedHours} giờ quy đổi
                          </div>
                        )}
                      </td>

                      {/* Trạng thái duyệt */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {renderStatusBadge(task.status)}
                      </td>

                      {/* Ghi chú & Hệ số */}
                      <td className="py-3.5 px-4">
                        {isHighlighted && task.multiplierNote ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-[11px]">
                              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{task.multiplierNote}</span>
                            </div>
                            {task.note && task.note !== task.multiplierNote && (
                              <div className="text-studio-muted text-[11px] mt-0.5 line-clamp-1">{task.note}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-studio-muted text-[11px]">{task.note || '—'}</span>
                        )}
                      </td>

                      {/* Nút Xem chi tiết */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-studio-muted hover:text-white transition-all cursor-pointer"
                          title="Xem chi tiết nhiệm vụ"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Hàng tổng kết chân bảng (Footer summary row) */}
            {data && data.tasks.length > 0 && (
              <tfoot>
                <tr className="bg-black/80 font-bold text-xs border-t-2 border-white/15">
                  <td colSpan={4} className="py-3 px-4 text-right text-studio-muted uppercase tracking-wider text-[11px]">
                    Tổng cộng tháng {selectedMonth}/{selectedYear}:
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="text-white font-extrabold">{data.summary.totalHoursWorked} giờ thực tế</div>
                    {data.summary.confirmedConvertedHours !== data.summary.confirmedHours && (
                      <div className="text-[10px] text-amber-300 font-bold">
                        {data.summary.confirmedConvertedHours} giờ quy đổi
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[11px] text-emerald-400 font-bold">
                      {data.summary.completedTasks} / {data.summary.totalTasks} đã duyệt
                    </span>
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-right">
                    <div className="text-emerald-400 font-black text-sm">
                      {data.summary.estimatedSalary.toLocaleString('vi-VN')} đ
                    </div>
                    <div className="text-[10px] text-studio-muted font-normal">
                      Thù lao đã được xác nhận
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Ghi chú chân trang tuân thủ quy chuẩn BPTT LHU Media */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-studio-muted space-y-1.5">
        <p className="font-semibold text-white/80 flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Quy chuẩn tính công và thù lao (Bộ phận Truyền thông ĐH Lạc Hồng):</span>
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-studio-muted/90">
          <li>Mức cơ bản: <strong>20.000 VNĐ / giờ</strong> thực tế được Nhân sự nghiệm thu hoàn thành.</li>
          <li>Làm việc kỹ thuật sự vụ sau 16:30 từ Thứ Hai đến Thứ Bảy: <strong>áp dụng hệ số ×1,5</strong>.</li>
          <li>Làm việc kỹ thuật sự vụ vào Chủ nhật: <strong>áp dụng hệ số ×2,0</strong> (nếu kéo dài qua 16:30 ưu tiên hệ số Chủ nhật, không cộng dồn).</li>
          <li>Công việc ở trạng thái <em>Chờ duyệt</em> hoặc <em>Cần sửa đổi</em> chưa được tính vào quỹ thù lao xác nhận cho đến khi Nhân sự hoàn tất nghiệm thu.</li>
        </ul>
      </div>

      {/* ========================================================================= */}
      {/* MODAL XEM CHI TIẾT NHIỆM VỤ (READ-ONLY)                                  */}
      {/* ========================================================================= */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-studio-card border border-white/15 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Chi tiết Công việc</h3>
                  <p className="text-xs text-studio-muted">Mã số: #{selectedTask.id.slice(0, 8)}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="p-2 rounded-full hover:bg-white/10 text-studio-muted hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="py-4 space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Tiêu đề & Loại việc */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                    {selectedTask.taskType}
                  </span>
                  {renderStatusBadge(selectedTask.status)}
                </div>
                <h4 className="text-sm font-bold text-white mt-1">{selectedTask.title}</h4>
                {selectedTask.content && (
                  <p className="text-studio-muted text-xs leading-relaxed mt-1">{selectedTask.content}</p>
                )}
              </div>

              {/* Thời gian & Giờ thực hiện */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-studio-muted block text-[11px]">Ngày thực hiện:</span>
                  <strong className="text-white mt-0.5 block">{formatDateVN(selectedTask.date)}</strong>
                </div>
                <div>
                  <span className="text-studio-muted block text-[11px]">Thời lượng thực tế:</span>
                  <strong className="text-white mt-0.5 block">{selectedTask.hours} giờ</strong>
                </div>
              </div>

              {/* Khối Thông tin Hệ số & Thù lao */}
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Thông tin Hệ số &amp; Thù lao</span>
                  </span>
                  {selectedTask.multiplier > 1 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] border border-amber-500/30">
                      Hệ số ×{selectedTask.multiplier}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-studio-muted text-[11px] block">Giờ quy đổi:</span>
                    <strong className="text-white font-mono text-xs">
                      {selectedTask.status === 'COMPLETED' ? `${selectedTask.convertedHours}h` : 'Chờ nghiệm thu'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-studio-muted text-[11px] block">Thù lao tạm tính:</span>
                    <strong className="text-emerald-400 font-mono text-xs">
                      {selectedTask.status === 'COMPLETED'
                        ? `${(selectedTask.convertedHours * 20000).toLocaleString('vi-VN')} đ`
                        : '0 đ'}
                    </strong>
                  </div>
                </div>

                {selectedTask.multiplierNote && (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-medium">
                    {selectedTask.multiplierNote}
                  </div>
                )}
              </div>

              {/* Link sản phẩm hoặc minh chứng */}
              {selectedTask.resultLink && (
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-studio-muted block text-[11px]">Liên kết sản phẩm:</span>
                  <a
                    href={selectedTask.resultLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-primary hover:underline font-semibold break-all inline-flex items-center space-x-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>{selectedTask.resultLink}</span>
                  </a>
                </div>
              )}

              {/* Ý kiến phản hồi từ Nhân sự */}
              {selectedTask.feedback && (
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <span className="text-studio-muted block text-[11px]">Nhận xét từ Nhân sự:</span>
                  <p className="text-white text-xs leading-relaxed italic">{selectedTask.feedback}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="py-2 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
