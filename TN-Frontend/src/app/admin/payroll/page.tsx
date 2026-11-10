'use strict';
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import {
  Calculator,
  Calendar,
  FileSpreadsheet,
  Download,
  RefreshCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Edit,
  X,
  Loader2,
  Sparkles,
  Info,
  ArrowRight,
  Search,
  Filter,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface CTVItem {
  id: string;
  fullName: string;
  email: string;
  employeeCode?: string;
  status?: 'Active' | 'Locked' | 'Disabled';
}

interface TimesheetSession {
  session: 'S' | 'C' | 'T';
  days: Record<number, string>;
  lv: number;
  sv: number;
  sumLV: number;
  gioLV: number;
  gioSV: number;
  tongGio: number;
  tien: number;
}

interface TimesheetRow {
  stt: number;
  ctv: CTVItem;
  sessions: TimesheetSession[];
  summary: {
    sumLV: number;
    gioLV: number;
    gioSV: number;
    tongGio: number;
    tien: number;
  };
}

interface TaskSummaryItem {
  id: string;
  date: string;
  content: string;
  taskType: string;
  hours: number;
  note: string;
}

interface CTVTaskGroup {
  stt: number;
  ctv: CTVItem;
  totalHours: number;
  tasks: TaskSummaryItem[];
}

export default function AdminPayrollPage() {
  const { toast } = useToast();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  // Hạng mục 1: 2 tab chính Bảng chấm công tháng & Bảng thống kê công việc
  const [activeTab, setActiveTab] = useState<'TIMESHEET' | 'TASKS_SUMMARY'>('TIMESHEET');
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Bộ lọc CTV & Tìm kiếm (Hạng mục 3)
  const [searchCtvTerm, setSearchCtvTerm] = useState('');
  const [selectedCtvFilter, setSelectedCtvFilter] = useState<string>('ALL');

  // Dữ liệu Bảng chấm công
  const [timesheetData, setTimesheetData] = useState<{
    daysCount: number;
    daysHeader: { day: number; dow: string; dateStr: string }[];
    rows: TimesheetRow[];
    grandTotalAmount: number;
  } | null>(null);

  // Dữ liệu Bảng thống kê công việc
  const [tasksSummaryData, setTasksSummaryData] = useState<CTVTaskGroup[]>([]);
  const [collaborators, setCollaborators] = useState<CTVItem[]>([]);

  // Modal chỉnh sửa ô chấm công
  const [cellModalOpen, setCellModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    userId: string;
    userName: string;
    date: string;
    session: 'S' | 'C' | 'T';
    currentSymbol: string;
    hasTaskOnDate: boolean;
  } | null>(null);
  const [cellSymbol, setCellSymbol] = useState<string>('');
  const [cellNote, setCellNote] = useState<string>('');
  const [savingCell, setSavingCell] = useState(false);

  useEffect(() => {
    fetchData();
    fetchCollaborators();
  }, [selectedMonth, selectedYear]);

  const fetchCollaborators = async () => {
    try {
      const res: any = await api.get('/admin/collaborators?purpose=filter&status=ALL');
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
    } catch {
      // fallback
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch timesheet
      const tsRes = await api.get(`/payroll/timesheet?month=${selectedMonth}&year=${selectedYear}`);
      if (tsRes.success && tsRes.data) {
        setTimesheetData(tsRes.data);
      }

      // 2. Fetch tasks summary
      const sumRes = await api.get(`/payroll/tasks-summary?month=${selectedMonth}&year=${selectedYear}`);
      if (sumRes.success && sumRes.data && Array.isArray(sumRes.data.ctvGroups)) {
        setTasksSummaryData(sumRes.data.ctvGroups);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tải dữ liệu chấm công & thù lao', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Tính toán lại tiền công
  const handleCalculatePayroll = async () => {
    setCalculating(true);
    try {
      const res = await api.post('/payroll/calculate', {
        month: selectedMonth,
        year: selectedYear,
      });
      toast(res.message || 'Đồng bộ và tính toán thù lao thành công!', 'success');
      fetchData();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tính toán thù lao', 'error');
    } finally {
      setCalculating(false);
    }
  };

  // Tải file Excel Bảng chấm công
  const handleExportTimesheet = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/payroll/export-timesheet?month=${selectedMonth}&year=${selectedYear}`, '_blank');
  };

  // Tải file Excel Bảng thống kê công việc
  const handleExportTasksSummary = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/payroll/export-tasks-summary?month=${selectedMonth}&year=${selectedYear}`, '_blank');
  };

  // Mở modal sửa ô chấm công (Hạng mục 2: kiểm tra công việc tương ứng)
  const handleCellClick = (userId: string, userName: string, date: string, session: 'S' | 'C' | 'T', currentSymbol: string) => {
    // Kiểm tra xem CTV này có công việc hợp lệ trong Bảng thống kê công việc vào đúng ngày date này không
    const ctvGroup = tasksSummaryData.find((g) => g.ctv.id === userId);
    const hasTaskOnDate = ctvGroup
      ? ctvGroup.tasks.some((t) => t.date === date)
      : false;

    setSelectedCell({
      userId,
      userName,
      date,
      session,
      currentSymbol,
      hasTaskOnDate,
    });
    setCellSymbol(currentSymbol || '');
    setCellNote('');
    setCellModalOpen(true);
  };

  // Lưu ô chấm công
  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;

    // Hạng mục 2: Chặn lưu SV nếu không có công việc tương ứng
    if (cellSymbol === 'SV' && !selectedCell.hasTaskOnDate) {
      toast('Không hợp lệ vì không có công việc tương ứng trong Bảng thống kê công việc.', 'error');
      return;
    }

    setSavingCell(true);
    try {
      await api.put('/payroll/timesheet/cell', {
        userId: selectedCell.userId,
        date: selectedCell.date,
        session: selectedCell.session,
        symbol: cellSymbol,
        note: cellNote || undefined,
      });
      toast('Đã cập nhật ô chấm công thành công!', 'success');
      setCellModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi cập nhật ô chấm công', 'error');
    } finally {
      setSavingCell(false);
    }
  };

  // Lọc dữ liệu hiển thị theo CTV
  const filteredTimesheetRows = useMemo(() => {
    if (!timesheetData) return [];
    return timesheetData.rows.filter((row) => {
      const matchCtv = selectedCtvFilter === 'ALL' || row.ctv.id === selectedCtvFilter;
      const matchSearch =
        !searchCtvTerm.trim() ||
        row.ctv.fullName.toLowerCase().includes(searchCtvTerm.toLowerCase()) ||
        row.ctv.email.toLowerCase().includes(searchCtvTerm.toLowerCase()) ||
        (row.ctv.employeeCode && row.ctv.employeeCode.toLowerCase().includes(searchCtvTerm.toLowerCase()));
      return matchCtv && matchSearch;
    });
  }, [timesheetData, selectedCtvFilter, searchCtvTerm]);

  const filteredTasksSummaryGroups = useMemo(() => {
    return tasksSummaryData.filter((group) => {
      const matchCtv = selectedCtvFilter === 'ALL' || group.ctv.id === selectedCtvFilter;
      const matchSearch =
        !searchCtvTerm.trim() ||
        group.ctv.fullName.toLowerCase().includes(searchCtvTerm.toLowerCase()) ||
        group.ctv.email.toLowerCase().includes(searchCtvTerm.toLowerCase()) ||
        (group.ctv.employeeCode && group.ctv.employeeCode.toLowerCase().includes(searchCtvTerm.toLowerCase()));
      return matchCtv && matchSearch;
    });
  }, [tasksSummaryData, selectedCtvFilter, searchCtvTerm]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phân hệ Chấm công & Thù lao CTV (FR-05)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Chấm Công &amp; Thống Kê Công Việc
            </h1>
            <p className="text-xs sm:text-sm text-studio-muted mt-1 max-w-2xl leading-relaxed">
              Quản lý Bảng chấm công 3 ca (Sáng – Chiều – Tối), Bảng thống kê công việc chi tiết và tính toán thù lao theo chuẩn Bộ phận Truyền thông ĐH Lạc Hồng.
            </p>
          </div>

          {/* Quick link sang Quản lý Ca trực */}
          <Link
            href="/admin/duty"
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-purple-600/20 text-xs shrink-0 self-start lg:self-auto transition-all"
          >
            <Calendar className="w-4 h-4" />
            <span>Đi đến Quản lý ca trực</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* HẠNG MỤC 3: KHU VỰC BỘ LỌC ĐƯỢC THIẾT KẾ LẠI GỌN GÀNG, LOGIC */}
        <div className="glass-panel p-4 rounded-3xl border border-white/10 bg-black/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Nhóm 1: Chọn Tháng / Năm */}
            <div className="flex items-center space-x-2 bg-black/50 border border-white/10 rounded-2xl p-1.5 px-3">
              <Calendar className="w-4 h-4 text-brand-primary" />
              <span className="text-xs text-studio-muted font-medium">Kỳ chấm công:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m} className="bg-[#121216] text-white">
                    Tháng {m}
                  </option>
                ))}
              </select>

              <span className="text-studio-muted">/</span>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y} className="bg-[#121216] text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Nhóm 2: Lọc theo CTV */}
            <div className="flex items-center space-x-2 bg-black/50 border border-white/10 rounded-2xl p-1.5 px-3 min-w-[200px] max-w-xs">
              <Filter className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="text-xs text-studio-muted font-medium whitespace-nowrap">Lọc CTV:</span>
              <select
                value={selectedCtvFilter}
                onChange={(e) => setSelectedCtvFilter(e.target.value)}
                className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer w-full truncate"
              >
                <option value="ALL" className="bg-[#121216] text-white font-bold">Tất cả CTV</option>
                {collaborators.map((c) => {
                  let label = `${c.fullName} (${c.employeeCode || c.email})`;
                  if (c.status === 'Disabled') label += ' - [Đã nghỉ việc]';
                  else if (c.status === 'Locked') label += ' - [Tạm khóa]';
                  return (
                    <option
                      key={c.id}
                      value={c.id}
                      className={`bg-[#121216] ${c.status === 'Disabled' ? 'text-zinc-500' : 'text-white'}`}
                    >
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Nhóm 3: Tìm kiếm nhanh */}
            <div className="flex items-center space-x-2 bg-black/50 border border-white/10 rounded-2xl px-3 py-1.5 flex-1 min-w-[180px] max-w-xs">
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

            {(selectedCtvFilter !== 'ALL' || searchCtvTerm) && (
              <button
                onClick={() => {
                  setSelectedCtvFilter('ALL');
                  setSearchCtvTerm('');
                }}
                className="text-xs text-brand-primary hover:text-brand-primary/80 underline underline-offset-2 transition-all cursor-pointer font-medium whitespace-nowrap"
              >
                Đặt lại bộ lọc
              </button>
            )}

            {/* Nhóm 4: Các nút thao tác dữ liệu */}
            <div className="flex items-center space-x-2 ml-auto">
              <button
                onClick={fetchData}
                className="p-2.5 rounded-2xl border border-white/10 hover:bg-white/5 text-studio-muted hover:text-white transition-all cursor-pointer"
                title="Làm mới dữ liệu"
              >
                <RefreshCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleCalculatePayroll}
                disabled={calculating}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-2 rounded-2xl shadow-md shadow-blue-600/20 text-xs cursor-pointer disabled:opacity-50"
              >
                {calculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
                <span>Tính lại thù lao</span>
              </button>

              <button
                onClick={handleExportTimesheet}
                className="flex items-center space-x-1.5 bg-brand-success/20 hover:bg-brand-success/30 text-brand-success border border-brand-success/30 font-bold px-3 py-2 rounded-2xl text-xs transition-all cursor-pointer"
                title="Xuất file Excel Bảng Chấm Công (Sheet1)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Chấm công</span>
              </button>

              <button
                onClick={handleExportTasksSummary}
                className="flex items-center space-x-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-bold px-3 py-2 rounded-2xl text-xs transition-all cursor-pointer"
                title="Xuất file Excel Bảng Thống Kê Công Việc (T10.2026)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất Thống kê</span>
              </button>
            </div>
          </div>
        </div>

        {/* HẠNG MỤC 1: ĐIỀU CHỈNH TÊN CÁC MỤC (BỎ PHẦN TÊN SHEET TRÊN GIAO DIỆN) */}
        <div className="flex space-x-2 border-b border-white/5 pb-2 overflow-x-auto">
          {[
            { id: 'TIMESHEET', label: 'Bảng chấm công tháng' },
            { id: 'TASKS_SUMMARY', label: 'Bảng thống kê công việc' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                  : 'text-studio-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: BẢNG CHẤM CÔNG THÁNG                                              */}
        {/* ========================================================================= */}
        {activeTab === 'TIMESHEET' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white/2 p-3 rounded-2xl border border-white/5">
              <span className="flex items-center space-x-2 text-studio-muted">
                <Info className="w-4 h-4 text-brand-primary shrink-0" />
                <span>
                  Nhấp vào ô để sửa: <strong className="text-blue-400">LV</strong> (Trực Studio),{' '}
                  <strong className="text-purple-400">SV</strong> (Làm sự vụ),{' '}
                  <strong className="text-rose-400">NL</strong> (Nghỉ lễ).
                </span>
              </span>
              <span className="text-brand-success font-bold text-sm">
                Tổng quỹ thù lao: {timesheetData?.grandTotalAmount ? Number(timesheetData.grandTotalAmount).toLocaleString('vi-VN') : 0} VNĐ
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
              </div>
            ) : !timesheetData || filteredTimesheetRows.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                <Users className="w-12 h-12 text-studio-muted mx-auto mb-3 opacity-30" />
                <p className="text-white font-bold">Không có dữ liệu chấm công phù hợp</p>
                <p className="text-xs text-studio-muted mt-1">
                  Nhấn &quot;Tính lại thù lao&quot; hoặc thay đổi bộ lọc để xem kết quả.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto glass-panel rounded-3xl border border-white/10 shadow-xl max-w-full">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    {/* Header Row 1: Thứ */}
                    <tr className="bg-black/60 text-studio-muted border-b border-white/10 text-center">
                      <th className="p-2 border-r border-white/10 w-8" rowSpan={2}>STT</th>
                      <th className="p-2 border-r border-white/10 w-36 text-left" rowSpan={2}>Họ và tên</th>
                      <th className="p-2 border-r border-white/10 w-10" rowSpan={2}>Buổi</th>
                      {timesheetData.daysHeader.map((d) => (
                        <th key={`dow-${d.day}`} className={`p-1 border-r border-white/5 w-7 font-bold text-[10px] ${d.dow === 'CN' ? 'text-rose-400 bg-rose-500/10' : ''}`}>
                          {d.dow}
                        </th>
                      ))}
                      <th className="p-2 border-r border-white/10 w-10 font-bold text-blue-400" rowSpan={2}>LV</th>
                      <th className="p-2 border-r border-white/10 w-10 font-bold text-purple-400" rowSpan={2}>SV</th>
                      <th className="p-2 border-r border-white/10 w-14 font-bold text-white" rowSpan={2}>Sum LV</th>
                      <th className="p-2 border-r border-white/10 w-14 font-bold text-white" rowSpan={2}>Giờ LV</th>
                      <th className="p-2 border-r border-white/10 w-14 font-bold text-white" rowSpan={2}>Giờ SV</th>
                      <th className="p-2 border-r border-white/10 w-14 font-bold text-amber-300" rowSpan={2}>Tổng</th>
                      <th className="p-2 w-24 font-bold text-brand-success text-right" rowSpan={2}>Tiền (VNĐ)</th>
                    </tr>

                    {/* Header Row 2: Ngày */}
                    <tr className="bg-black/40 text-white border-b border-white/10 text-center font-bold text-[10px]">
                      {timesheetData.daysHeader.map((d) => (
                        <th key={`day-${d.day}`} className={`p-1 border-r border-white/5 ${d.dow === 'CN' ? 'text-rose-400 bg-rose-500/10' : ''}`}>
                          {d.day}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTimesheetRows.map((row) => (
                      <React.Fragment key={row.ctv.id}>
                        {row.sessions.map((sess, sIdx) => (
                          <tr
                            key={`${row.ctv.id}-${sess.session}`}
                            className={`border-b border-white/5 hover:bg-white/2 transition-colors ${
                              sIdx === 2 ? 'border-b-2 border-white/15' : ''
                            }`}
                          >
                            {/* STT & Họ tên (Rowspan 3) */}
                            {sIdx === 0 && (
                              <>
                                <td className="p-2 border-r border-white/10 text-center text-studio-muted font-bold" rowSpan={3}>
                                  {row.stt}
                                </td>
                                <td className="p-2 border-r border-white/10 font-bold text-white" rowSpan={3}>
                                  <div className="leading-tight">{row.ctv.fullName}</div>
                                  <div className="text-[9px] text-studio-muted font-normal mt-0.5 truncate max-w-[130px]">
                                    {row.ctv.employeeCode || row.ctv.email}
                                  </div>
                                </td>
                              </>
                            )}

                            {/* Buổi (S, C, T) */}
                            <td className="p-2 border-r border-white/10 text-center font-extrabold text-white/80 bg-white/2">
                              {sess.session}
                            </td>

                            {/* Các ô ngày 1..daysCount */}
                            {timesheetData.daysHeader.map((d) => {
                              const symbol = sess.days[d.day] || '';
                              return (
                                <td
                                  key={`cell-${d.day}`}
                                  onClick={() => handleCellClick(row.ctv.id, row.ctv.fullName, d.dateStr, sess.session, symbol)}
                                  className={`p-0.5 border-r border-white/5 text-center font-bold cursor-pointer hover:bg-brand-primary/20 transition-colors ${
                                    d.dow === 'CN' ? 'bg-rose-500/5' : ''
                                  }`}
                                  title={`Click để sửa: ${row.ctv.fullName} - ${d.dateStr} (Buổi ${sess.session})`}
                                >
                                  {symbol === 'LV' && (
                                    <span className="inline-block w-full py-1 rounded bg-blue-500/25 text-blue-300 text-[10px]">
                                      LV
                                    </span>
                                  )}
                                  {symbol === 'SV' && (
                                    <span className="inline-block w-full py-1 rounded bg-purple-500/25 text-purple-300 text-[10px]">
                                      SV
                                    </span>
                                  )}
                                  {symbol === 'NL' && (
                                    <span className="inline-block w-full py-1 rounded bg-rose-500/25 text-rose-300 text-[10px]">
                                      NL
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Cột LV buổi */}
                            <td className="p-2 border-r border-white/10 text-center font-bold text-blue-400">
                              {sess.lv || ''}
                            </td>

                            {/* Cột SV buổi */}
                            <td className="p-2 border-r border-white/10 text-center font-bold text-purple-400">
                              {sess.sv || ''}
                            </td>

                            {/* Các cột tổng hợp CTV (Rowspan 3) */}
                            {sIdx === 0 && (
                              <>
                                <td className="p-2 border-r border-white/10 text-center font-extrabold text-white" rowSpan={3}>
                                  {row.summary.sumLV}
                                </td>
                                <td className="p-2 border-r border-white/10 text-center font-bold text-white/90" rowSpan={3}>
                                  {row.summary.gioLV}
                                </td>
                                <td className="p-2 border-r border-white/10 text-center font-bold text-white/90" rowSpan={3}>
                                  {row.summary.gioSV}
                                </td>
                                <td className="p-2 border-r border-white/10 text-center font-extrabold text-amber-300 text-xs" rowSpan={3}>
                                  {row.summary.tongGio}
                                </td>
                                <td className="p-2 text-right font-black text-brand-success text-xs pr-3" rowSpan={3}>
                                  {row.summary.tien.toLocaleString('vi-VN')}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BẢNG THỐNG KÊ CÔNG VIỆC                                           */}
        {/* ========================================================================= */}
        {activeTab === 'TASKS_SUMMARY' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-studio-muted bg-white/2 p-3 rounded-2xl border border-white/5">
              <span className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-brand-primary" />
                <span>
                  Thống kê các công việc và sự vụ đã được nghiệm thu hoàn thành (COMPLETED) theo từng CTV.
                </span>
              </span>
              <span className="font-bold text-white">
                Tổng cộng: {filteredTasksSummaryGroups.reduce((acc, g) => acc + g.tasks.length, 0)} đầu việc
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
              </div>
            ) : filteredTasksSummaryGroups.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                <FileSpreadsheet className="w-12 h-12 text-studio-muted mx-auto mb-3 opacity-30" />
                <p className="text-white font-bold">Chưa có công việc nào hoàn thành trong tháng {selectedMonth}/{selectedYear}</p>
                <p className="text-xs text-studio-muted mt-1">Khi CTV hoàn thành nhiệm vụ và được Nhân sự nghiệm thu, danh sách sẽ hiển thị tại đây.</p>
              </div>
            ) : (
              <div className="overflow-x-auto glass-panel rounded-3xl border border-white/10 shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-black/60 text-studio-muted border-b border-white/10 font-bold uppercase text-[10px]">
                      <th className="p-3 w-12 text-center">STT</th>
                      <th className="p-3 w-48">Họ và tên CTV</th>
                      <th className="p-3 w-28">Ngày</th>
                      <th className="p-3">Nội dung sự vụ</th>
                      <th className="p-3 w-36">Nhiệm vụ</th>
                      <th className="p-3 w-28 text-center">Thực hiện (giờ)</th>
                      <th className="p-3 w-28 text-center text-amber-300">Tổng (giờ)</th>
                      <th className="p-3 w-48">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTasksSummaryGroups.map((group) => (
                      <React.Fragment key={group.ctv.id}>
                        {group.tasks.length === 0 ? (
                          <tr className="hover:bg-white/2">
                            <td className="p-3 text-center text-studio-muted">{group.stt}</td>
                            <td className="p-3 font-bold text-white">{group.ctv.fullName}</td>
                            <td colSpan={6} className="p-3 text-studio-muted italic text-center">
                              Không có công việc nào trong tháng
                            </td>
                          </tr>
                        ) : (
                          group.tasks.map((task, tIdx) => (
                            <tr key={task.id} className="hover:bg-white/2 transition-colors">
                              {tIdx === 0 && (
                                <>
                                  <td className="p-3 text-center text-studio-muted font-bold align-top border-r border-white/5" rowSpan={group.tasks.length}>
                                    {group.stt}
                                  </td>
                                  <td className="p-3 font-bold text-white align-top border-r border-white/5" rowSpan={group.tasks.length}>
                                    <div>{group.ctv.fullName}</div>
                                    <div className="text-[10px] text-studio-muted font-normal mt-0.5">
                                      {group.ctv.employeeCode || group.ctv.email}
                                    </div>
                                  </td>
                                </>
                              )}
                              <td className="p-3 text-white/90 font-medium whitespace-nowrap">{task.date}</td>
                              <td className="p-3 text-white font-medium">{task.content}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] font-semibold">
                                  {task.taskType}
                                </span>
                              </td>
                              <td className="p-3 text-center font-bold text-white/90">{task.hours}</td>
                              {tIdx === 0 && (
                                <td className="p-3 text-center font-black text-amber-300 text-sm align-top border-l border-white/5" rowSpan={group.tasks.length}>
                                  {group.totalHours}
                                </td>
                              )}
                              <td className="p-3 text-studio-muted text-[11px]">{task.note || '—'}</td>
                            </tr>
                          ))
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL SỬA Ô CHẤM CÔNG THỦ CÔNG (HẠNG MỤC 2: KIỂM SOÁT KÝ HIỆU SV)         */}
        {/* ========================================================================= */}
        {cellModalOpen && selectedCell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCellModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2.5">
                  <Edit className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-base font-bold text-white">Chỉnh Sửa Ô Chấm Công</h3>
                </div>
                <button onClick={() => setCellModalOpen(false)} className="text-studio-muted hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCell} className="space-y-4 text-xs">
                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-bold text-sm">{selectedCell.userName}</p>
                    {(() => {
                      const ctvObj = collaborators.find((c) => c.id === selectedCell.userId);
                      if (!ctvObj) return null;
                      return (
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                          ctvObj.status === 'Active'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                        }`}>
                          {ctvObj.status === 'Active' ? 'Đang hoạt động' : ctvObj.status === 'Disabled' ? 'Đã nghỉ việc' : 'Tạm khóa'}
                        </span>
                      );
                    })()}
                  </div>
                  {(() => {
                    const ctvObj = collaborators.find((c) => c.id === selectedCell.userId);
                    if (!ctvObj) return null;
                    return (
                      <p className="text-[11px] text-studio-muted">
                        {ctvObj.employeeCode ? `${ctvObj.employeeCode} • ` : ''}{ctvObj.email}
                      </p>
                    );
                  })()}
                  <p className="text-studio-muted pt-1 border-t border-white/5">
                    Ngày: <strong className="text-white">{selectedCell.date}</strong> — Buổi:{' '}
                    <strong className="text-white">
                      {selectedCell.session === 'S' ? 'Sáng (S)' : selectedCell.session === 'C' ? 'Chiều (C)' : 'Tối (T)'}
                    </strong>
                  </p>
                </div>

                {/* Hạng mục 2: Kiểm tra công việc tương ứng */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">
                    Chọn ký hiệu chấm công *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {/* Nút LV */}
                    <button
                      type="button"
                      onClick={() => setCellSymbol('LV')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        cellSymbol === 'LV'
                          ? 'border-blue-500 bg-blue-500/25 text-blue-300 ring-2 ring-blue-500'
                          : 'border-white/10 bg-black/40 text-studio-muted hover:text-white'
                      }`}
                    >
                      <span className="block text-sm">LV</span>
                      <span className="text-[9px] block opacity-80">Trực Studio</span>
                    </button>

                    {/* Nút SV (HẠNG MỤC 2: DISABLED NẾU KHÔNG CÓ CÔNG VIỆC TƯƠNG ỨNG) */}
                    <button
                      type="button"
                      disabled={!selectedCell.hasTaskOnDate}
                      onClick={() => {
                        if (!selectedCell.hasTaskOnDate) {
                          toast('Không hợp lệ vì không có công việc tương ứng trong Bảng thống kê công việc.', 'error');
                        } else {
                          setCellSymbol('SV');
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all font-bold ${
                        selectedCell.hasTaskOnDate
                          ? cellSymbol === 'SV'
                            ? 'border-purple-500 bg-purple-500/25 text-purple-300 ring-2 ring-purple-500 cursor-pointer'
                            : 'border-white/10 bg-black/40 text-studio-muted hover:text-white cursor-pointer'
                          : 'border-white/5 bg-white/2 text-white/20 opacity-40 cursor-not-allowed'
                      }`}
                      title={
                        selectedCell.hasTaskOnDate
                          ? 'Chọn làm sự vụ (SV)'
                          : 'Không hợp lệ vì không có công việc tương ứng trong Bảng thống kê công việc.'
                      }
                    >
                      <span className="block text-sm">SV</span>
                      <span className="text-[9px] block opacity-80">Làm sự vụ</span>
                    </button>

                    {/* Nút NL */}
                    <button
                      type="button"
                      onClick={() => setCellSymbol('NL')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        cellSymbol === 'NL'
                          ? 'border-rose-500 bg-rose-500/25 text-rose-300 ring-2 ring-rose-500'
                          : 'border-white/10 bg-black/40 text-studio-muted hover:text-white'
                      }`}
                    >
                      <span className="block text-sm">NL</span>
                      <span className="text-[9px] block opacity-80">Nghỉ lễ</span>
                    </button>

                    {/* Nút Xóa trống */}
                    <button
                      type="button"
                      onClick={() => setCellSymbol('')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        cellSymbol === ''
                          ? 'border-white/30 bg-white/10 text-white ring-2 ring-white/20'
                          : 'border-white/10 bg-black/40 text-studio-muted hover:text-white'
                      }`}
                    >
                      <span className="block text-sm">Xóa</span>
                      <span className="text-[9px] block opacity-80">Trống</span>
                    </button>
                  </div>

                  {/* Thông báo cảnh báo khi nút SV bị khóa (Hạng mục 2.2) */}
                  {!selectedCell.hasTaskOnDate && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start space-x-2 text-[11px] text-rose-300 mt-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>
                        Ký hiệu <strong>SV</strong> bị khóa: <strong>Không hợp lệ vì không có công việc tương ứng trong Bảng thống kê công việc.</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Ghi chú (tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="VD: Trực thay ca, Nghỉ lễ Quốc khánh..."
                    value={cellNote}
                    onChange={(e) => setCellNote(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCellModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={savingCell}
                    className="py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {savingCell ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Lưu thay đổi</span>}
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
