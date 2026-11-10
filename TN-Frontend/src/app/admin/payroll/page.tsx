'use strict';
'use client';

import React, { useState, useEffect } from 'react';
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
  PlusCircle,
  Users,
  Edit,
  X,
  Loader2,
  Sparkles,
  Info,
} from 'lucide-react';

interface CTVItem {
  id: string;
  fullName: string;
  email: string;
  employeeCode?: string;
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

interface StudioShiftItem {
  id: string;
  userId: string;
  date: string;
  shiftType: 'MORNING' | 'AFTERNOON' | 'EVENING';
  startTime: string;
  endTime: string;
  hours: number;
  status: 'REGISTERED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  attendanceSymbol: string;
  note?: string;
  collaborator?: CTVItem;
}

export default function AdminPayrollPage() {
  const { toast } = useToast();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'TIMESHEET' | 'TASKS_SUMMARY' | 'SHIFTS_PAYROLL'>('TIMESHEET');
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Dữ liệu Bảng chấm công (Sheet1)
  const [timesheetData, setTimesheetData] = useState<{
    daysCount: number;
    daysHeader: { day: number; dow: string; dateStr: string }[];
    rows: TimesheetRow[];
    grandTotalAmount: number;
  } | null>(null);

  // Dữ liệu Bảng thống kê công việc (T10.2026)
  const [tasksSummaryData, setTasksSummaryData] = useState<CTVTaskGroup[]>([]);

  // Dữ liệu Ca trực Studio & Bảng lương
  const [shifts, setShifts] = useState<StudioShiftItem[]>([]);
  const [collaborators, setCollaborators] = useState<CTVItem[]>([]);

  // Modal chỉnh sửa ô chấm công
  const [cellModalOpen, setCellModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    userId: string;
    userName: string;
    date: string;
    session: 'S' | 'C' | 'T';
    currentSymbol: string;
  } | null>(null);
  const [cellSymbol, setCellSymbol] = useState<string>('');
  const [cellNote, setCellNote] = useState<string>('');
  const [savingCell, setSavingCell] = useState(false);

  // Modal xếp ca trực mới
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftUserId, setShiftUserId] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [shiftType, setShiftType] = useState<'MORNING' | 'AFTERNOON' | 'EVENING'>('MORNING');
  const [shiftNote, setShiftNote] = useState('');
  const [savingShift, setSavingShift] = useState(false);

  useEffect(() => {
    fetchData();
    fetchCollaborators();
  }, [selectedMonth, selectedYear]);

  const fetchCollaborators = async () => {
    try {
      const res = await api.get('/admin/users?role=COLLABORATOR&limit=100');
      if (res.success && res.data && Array.isArray(res.data.users)) {
        setCollaborators(res.data.users);
      }
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

      // 3. Fetch shifts
      const shiftRes = await api.get(`/duty/shifts?month=${selectedMonth}&year=${selectedYear}`);
      if (shiftRes.success && Array.isArray(shiftRes.data)) {
        setShifts(shiftRes.data);
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
      toast(res.message || 'Tính toán thù lao thành công!', 'success');
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

  // Mở modal sửa ô chấm công
  const handleCellClick = (userId: string, userName: string, date: string, session: 'S' | 'C' | 'T', currentSymbol: string) => {
    setSelectedCell({ userId, userName, date, session, currentSymbol });
    setCellSymbol(currentSymbol || '');
    setCellNote('');
    setCellModalOpen(true);
  };

  // Lưu ô chấm công
  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;
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

  // Thao tác ca trực (Duyệt / Hoàn thành / Hủy)
  const handleShiftAction = async (shiftId: string, action: 'confirm' | 'complete' | 'cancel') => {
    try {
      if (action === 'confirm') {
        await api.put(`/duty/shifts/${shiftId}/confirm`, {});
        toast('Đã xác nhận ca trực Studio!', 'success');
      } else if (action === 'complete') {
        await api.put(`/duty/shifts/${shiftId}/complete`, {});
        toast('Đã xác nhận hoàn thành ca trực!', 'success');
      } else if (action === 'cancel') {
        if (!confirm('Bạn có chắc muốn hủy ca trực này?')) return;
        await api.delete(`/duty/shifts/${shiftId}`);
        toast('Đã hủy ca trực!', 'info');
      }
      fetchData();
    } catch (err: any) {
      toast(err.message || 'Lỗi thao tác ca trực', 'error');
    }
  };

  // Tạo ca trực mới cho CTV
  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftUserId || !shiftDate) {
      toast('Vui lòng chọn CTV và ngày trực', 'warning');
      return;
    }
    setSavingShift(true);
    try {
      await api.post('/duty/register', {
        userId: shiftUserId,
        date: shiftDate,
        shiftType,
        note: shiftNote || undefined,
      });
      toast('Xếp ca trực Studio thành công!', 'success');
      setShiftModalOpen(false);
      setShiftDate('');
      setShiftNote('');
      fetchData();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi xếp ca trực', 'error');
    } finally {
      setSavingShift(false);
    }
  };

  const getShiftBadge = (status: StudioShiftItem['status']) => {
    switch (status) {
      case 'REGISTERED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Chờ duyệt</span>;
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Đã xếp ca</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-success/20 text-brand-success border border-brand-success/30">Hoàn thành</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">Đã hủy</span>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phân hệ Chấm công & Tính thù lao CTV (FR-05)</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Chấm Công, Thống Kê & Tính Lương CTV</h1>
            <p className="text-sm text-studio-muted mt-1 max-w-2xl leading-relaxed">
              Biểu mẫu thực tế của Bộ phận Truyền thông – Trường Đại học Lạc Hồng: Bảng chấm công 3 ca (Sáng – Chiều – Tối), Bảng thống kê công việc chi tiết và tính tiền công theo 7 quy tắc chuẩn.
            </p>
          </div>

          {/* Month / Year selector & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-black/40 border border-white/10 rounded-2xl p-1.5 px-3">
              <Calendar className="w-4 h-4 text-studio-muted" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
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
                className="bg-transparent text-xs text-white font-semibold focus:outline-none cursor-pointer"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y} className="bg-[#121216] text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchData}
              className="p-3 rounded-2xl border border-white/5 hover:bg-white/5 text-studio-muted hover:text-white transition-all cursor-pointer shadow-sm"
              title="Làm mới dữ liệu"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>

            <button
              onClick={handleCalculatePayroll}
              disabled={calculating}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 rounded-2xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer text-xs disabled:opacity-50"
            >
              {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              <span>Đồng bộ & Tính lương</span>
            </button>

            <button
              onClick={handleExportTimesheet}
              className="flex items-center space-x-2 bg-brand-success/20 hover:bg-brand-success/30 text-brand-success border border-brand-success/30 font-bold px-4 py-3 rounded-2xl transition-all cursor-pointer text-xs"
              title="Xuất Excel Bảng Chấm Công (Sheet1)"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Bảng Chấm Công</span>
            </button>

            <button
              onClick={handleExportTasksSummary}
              className="flex items-center space-x-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-bold px-4 py-3 rounded-2xl transition-all cursor-pointer text-xs"
              title="Xuất Excel Bảng Thống Kê Công Việc (T10.2026)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Bảng Thống Kê</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-white/5 pb-2 overflow-x-auto">
          {[
            { id: 'TIMESHEET', label: 'Bảng Chấm Công Tháng (Sheet1)' },
            { id: 'TASKS_SUMMARY', label: 'Bảng Thống Kê Công Việc (T10.2026)' },
            { id: 'SHIFTS_PAYROLL', label: 'Quản Lý Ca Trực & Bảng Lương' },
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

        {/* TAB 1: BẢNG CHẤM CÔNG THÁNG (SHEET1) */}
        {activeTab === 'TIMESHEET' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-studio-muted">
              <span className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-brand-primary" />
                <span>Nhấp vào ô bất kỳ để chỉnh sửa nhanh ký hiệu: <strong className="text-blue-400">LV</strong> (Trực Studio), <strong className="text-purple-400">SV</strong> (Làm sự vụ), <strong className="text-rose-400">NL</strong> (Nghỉ lễ).</span>
              </span>
              <span className="text-brand-success font-bold text-sm">
                Tổng quỹ lương tháng: {timesheetData?.grandTotalAmount ? Number(timesheetData.grandTotalAmount).toLocaleString('vi-VN') : 0} VNĐ
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
              </div>
            ) : !timesheetData || timesheetData.rows.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                <Users className="w-12 h-12 text-studio-muted mx-auto mb-3 opacity-30" />
                <p className="text-white font-bold">Chưa có dữ liệu chấm công cho Tháng {selectedMonth}/{selectedYear}</p>
                <p className="text-xs text-studio-muted mt-1">Nhấn &quot;Đồng bộ &amp; Tính lương&quot; để tổng hợp ca trực và công việc hoàn thành trong tháng.</p>
              </div>
            ) : (
              <div className="overflow-x-auto glass-panel rounded-3xl border border-white/10 shadow-xl max-w-full">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    {/* Header Row 1: Thứ */}
                    <tr className="bg-black/60 text-studio-muted border-b border-white/10 text-center">
                      <th className="p-2 border-r border-white/10 w-8" rowSpan={2}>Stt</th>
                      <th className="p-2 border-r border-white/10 w-36 text-left" rowSpan={2}>Họ và tên</th>
                      <th className="p-2 border-r border-white/10 w-10" rowSpan={2}>Buổi</th>
                      {timesheetData.daysHeader.map((d) => (
                        <th key={`dow-${d.day}`} className="p-1 border-r border-white/5 w-7 font-bold text-[10px]">
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
                        <th key={`day-${d.day}`} className="p-1 border-r border-white/5">
                          {d.day}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {timesheetData.rows.map((row) => (
                      <React.Fragment key={row.ctv.id}>
                        {row.sessions.map((sess, sIdx) => (
                          <tr
                            key={`${row.ctv.id}-${sess.session}`}
                            className={`hover:bg-white/5 transition-colors border-b ${
                              sIdx === 2 ? 'border-white/15' : 'border-white/5'
                            }`}
                          >
                            {/* Stt & Họ tên (Merge 3 dòng) */}
                            {sIdx === 0 && (
                              <>
                                <td className="p-2 border-r border-white/10 text-center font-bold text-studio-muted" rowSpan={3}>
                                  {row.stt}
                                </td>
                                <td className="p-2 border-r border-white/10 font-bold text-white whitespace-nowrap" rowSpan={3}>
                                  {row.ctv.fullName}
                                </td>
                              </>
                            )}

                            {/* Buổi (S / C / T) */}
                            <td className="p-1.5 border-r border-white/10 text-center font-bold text-studio-muted">
                              {sess.session}
                            </td>

                            {/* Các ngày 1..daysCount */}
                            {timesheetData.daysHeader.map((d) => {
                              const symbol = sess.days[d.day] || '';
                              return (
                                <td
                                  key={`cell-${row.ctv.id}-${sess.session}-${d.day}`}
                                  onClick={() => handleCellClick(row.ctv.id, row.ctv.fullName, d.dateStr, sess.session, symbol)}
                                  className="p-1 border-r border-white/5 text-center cursor-pointer hover:bg-white/10 transition-colors select-none"
                                >
                                  {symbol === 'LV' ? (
                                    <span className="font-bold text-blue-400">LV</span>
                                  ) : symbol === 'SV' ? (
                                    <span className="font-bold text-purple-400">SV</span>
                                  ) : symbol === 'NL' ? (
                                    <span className="font-bold text-rose-400">NL</span>
                                  ) : null}
                                </td>
                              );
                            })}

                            {/* Cột AI (LV) & AJ (SV) của từng buổi */}
                            <td className="p-1.5 border-r border-white/10 text-center text-blue-400 font-semibold">{sess.lv}</td>
                            <td className="p-1.5 border-r border-white/10 text-center text-purple-400 font-semibold">{sess.sv}</td>

                            {/* Cột AK, AL, AM, AN, AO (Merge 3 dòng) */}
                            {sIdx === 0 && (
                              <>
                                <td className="p-2 border-r border-white/10 text-center font-bold text-white" rowSpan={3}>
                                  {row.summary.sumLV}
                                </td>
                                <td className="p-2 border-r border-white/10 text-center font-bold text-white" rowSpan={3}>
                                  {row.summary.gioLV}
                                </td>
                                <td className="p-2 border-r border-white/10 text-center font-bold text-white" rowSpan={3}>
                                  {row.summary.gioSV}
                                </td>
                                <td className="p-2 border-r border-white/10 text-center font-bold text-amber-300 text-xs" rowSpan={3}>
                                  {row.summary.tongGio}
                                </td>
                                <td className="p-2 text-right font-extrabold text-brand-success text-xs" rowSpan={3}>
                                  {Number(row.summary.tien).toLocaleString('vi-VN')}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr className="bg-black/60 font-black text-white border-t border-white/20">
                      <td colSpan={3 + timesheetData.daysCount + 5} className="p-3 text-right uppercase tracking-wider text-xs">
                        Tổng tiền toàn bộ CTV:
                      </td>
                      <td className="p-3 text-right text-brand-success text-sm font-extrabold">
                        {Number(timesheetData.grandTotalAmount).toLocaleString('vi-VN')} VNĐ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BẢNG THỐNG KÊ CÔNG VIỆC THÁNG (T10.2026) */}
        {activeTab === 'TASKS_SUMMARY' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-studio-muted">
              <span>Biểu mẫu chuẩn: Thống kê chi tiết từng đầu việc sự vụ được nghiệm thu trong tháng theo từng CTV.</span>
              <button
                onClick={handleExportTasksSummary}
                className="flex items-center space-x-1.5 text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải file Excel mẫu T{selectedMonth}.{selectedYear}</span>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
              </div>
            ) : tasksSummaryData.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                <FileSpreadsheet className="w-12 h-12 text-studio-muted mx-auto mb-3 opacity-30" />
                <p className="text-white font-bold">Chưa có công việc sự vụ nào được hoàn thành trong tháng này</p>
              </div>
            ) : (
              <div className="overflow-x-auto glass-panel rounded-3xl border border-white/10 shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-black/60 text-studio-muted border-b border-white/10 text-center font-bold">
                      <th className="p-3 w-12 border-r border-white/10">Stt</th>
                      <th className="p-3 w-48 border-r border-white/10 text-left">Họ và tên</th>
                      <th className="p-3 w-28 border-r border-white/10">Ngày</th>
                      <th className="p-3 border-r border-white/10 text-left">Nội dung sự vụ</th>
                      <th className="p-3 w-44 border-r border-white/10 text-left">Nhiệm vụ</th>
                      <th className="p-3 w-28 border-r border-white/10">Thực hiện (giờ)</th>
                      <th className="p-3 w-28 border-r border-white/10">Tổng (giờ)</th>
                      <th className="p-3 w-44 text-left">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksSummaryData.map((group) => {
                      if (group.tasks.length === 0) return null;
                      return group.tasks.map((task, tIdx) => (
                        <tr key={task.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          {tIdx === 0 && (
                            <>
                              <td className="p-3 border-r border-white/10 text-center font-bold text-studio-muted" rowSpan={group.tasks.length}>
                                {group.stt}
                              </td>
                              <td className="p-3 border-r border-white/10 font-bold text-white whitespace-nowrap" rowSpan={group.tasks.length}>
                                {group.ctv.fullName}
                              </td>
                            </>
                          )}

                          <td className="p-3 border-r border-white/10 text-center text-studio-muted whitespace-nowrap">
                            {task.date}
                          </td>
                          <td className="p-3 border-r border-white/10 text-white font-medium leading-relaxed">
                            {task.content}
                          </td>
                          <td className="p-3 border-r border-white/10">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-brand-primary/15 text-brand-primary border border-brand-primary/30">
                              {task.taskType}
                            </span>
                          </td>
                          <td className="p-3 border-r border-white/10 text-center font-bold text-white">
                            {task.hours}
                          </td>

                          {tIdx === 0 && (
                            <td className="p-3 border-r border-white/10 text-center font-extrabold text-amber-300 text-sm" rowSpan={group.tasks.length}>
                              {group.totalHours}
                            </td>
                          )}

                          <td className="p-3 text-studio-muted text-[11px] leading-relaxed">
                            {task.note || '-'}
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: QUẢN LÝ LỊCH TRỰC STUDIO & BẢNG LƯƠNG */}
        {activeTab === 'SHIFTS_PAYROLL' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Danh Sách Ca Trực Studio Tháng {selectedMonth}/{selectedYear}</h3>
                <p className="text-xs text-studio-muted mt-0.5">Xếp lịch, điều phối và xác nhận ca trực Studio tiêu chuẩn 4 giờ/ca.</p>
              </div>

              <button
                onClick={() => setShiftModalOpen(true)}
                className="flex items-center space-x-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-brand-primary/20 transition-all cursor-pointer text-xs shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Xếp ca trực Studio mới</span>
              </button>
            </div>

            {/* Bảng danh sách ca trực */}
            {shifts.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                <Clock className="w-10 h-10 text-studio-muted mx-auto mb-2 opacity-30" />
                <p className="text-white font-bold text-sm">Chưa có ca trực Studio nào trong tháng này</p>
              </div>
            ) : (
              <div className="overflow-x-auto glass-panel rounded-3xl border border-white/10 shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-black/60 text-studio-muted border-b border-white/10 text-center font-bold">
                      <th className="p-3 w-12 border-r border-white/10">STT</th>
                      <th className="p-3 border-r border-white/10 text-left">CTV Trực</th>
                      <th className="p-3 w-32 border-r border-white/10">Ngày trực</th>
                      <th className="p-3 w-32 border-r border-white/10">Ca trực</th>
                      <th className="p-3 w-28 border-r border-white/10">Khung giờ</th>
                      <th className="p-3 w-24 border-r border-white/10">Trạng thái</th>
                      <th className="p-3 text-left border-r border-white/10">Ghi chú</th>
                      <th className="p-3 w-48 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((s, idx) => (
                      <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3 border-r border-white/10 text-center font-bold text-studio-muted">{idx + 1}</td>
                        <td className="p-3 border-r border-white/10 font-bold text-white">{s.collaborator?.fullName || 'CTV'}</td>
                        <td className="p-3 border-r border-white/10 text-center text-studio-muted">{s.date}</td>
                        <td className="p-3 border-r border-white/10 text-center font-semibold text-blue-400">
                          {s.shiftType === 'MORNING' ? 'Sáng (S)' : s.shiftType === 'AFTERNOON' ? 'Chiều (C)' : 'Tối (T)'}
                        </td>
                        <td className="p-3 border-r border-white/10 text-center text-studio-muted">{s.startTime} - {s.endTime}</td>
                        <td className="p-3 border-r border-white/10 text-center">{getShiftBadge(s.status)}</td>
                        <td className="p-3 border-r border-white/10 text-studio-muted">{s.note || '-'}</td>
                        <td className="p-3 text-center space-x-1.5 whitespace-nowrap">
                          {s.status === 'REGISTERED' && (
                            <button
                              onClick={() => handleShiftAction(s.id, 'confirm')}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] cursor-pointer"
                            >
                              Duyệt ca
                            </button>
                          )}
                          {(s.status === 'CONFIRMED' || s.status === 'REGISTERED') && (
                            <button
                              onClick={() => handleShiftAction(s.id, 'complete')}
                              className="px-2.5 py-1.5 rounded-lg bg-brand-success hover:bg-brand-success/80 text-white font-bold text-[10px] cursor-pointer"
                            >
                              Hoàn thành
                            </button>
                          )}
                          {s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleShiftAction(s.id, 'cancel')}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[10px] cursor-pointer"
                            >
                              Hủy
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODAL SỬA Ô CHẤM CÔNG THỦ CÔNG */}
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
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1">
                  <p className="text-white font-bold">{selectedCell.userName}</p>
                  <p className="text-studio-muted">Ngày: <strong className="text-white">{selectedCell.date}</strong> — Buổi: <strong className="text-white">{selectedCell.session === 'S' ? 'Sáng' : selectedCell.session === 'C' ? 'Chiều' : 'Tối'}</strong></p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Ký hiệu chấm công *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { code: 'LV', label: 'Trực Studio', color: 'border-blue-500 bg-blue-500/20 text-blue-300' },
                      { code: 'SV', label: 'Làm sự vụ', color: 'border-purple-500 bg-purple-500/20 text-purple-300' },
                      { code: 'NL', label: 'Nghỉ lễ', color: 'border-rose-500 bg-rose-500/20 text-rose-300' },
                      { code: '', label: 'Xóa trống', color: 'border-white/20 bg-white/5 text-studio-muted' },
                    ].map((opt) => (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => setCellSymbol(opt.code)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                          cellSymbol === opt.code
                            ? `${opt.color} ring-2 ring-brand-primary`
                            : 'border-white/10 bg-black/40 text-studio-muted hover:text-white'
                        }`}
                      >
                        <span className="block text-sm">{opt.code || 'None'}</span>
                        <span className="text-[9px] block opacity-80">{opt.label}</span>
                      </button>
                    ))}
                  </div>
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
                    className="py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    {savingCell ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Lưu thay đổi</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL XẾP CA TRỰC MỚI CHO CTV */}
        {shiftModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShiftModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2.5">
                  <PlusCircle className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-base font-bold text-white">Xếp Ca Trực Studio Mới</h3>
                </div>
                <button onClick={() => setShiftModalOpen(false)} className="text-studio-muted hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateShift} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Chọn CTV trực *</label>
                  <select
                    value={shiftUserId}
                    onChange={(e) => setShiftUserId(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                  >
                    <option value="">-- Chọn CTV --</option>
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#121216] text-white">
                        {c.fullName} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Ngày trực *</label>
                  <input
                    type="date"
                    required
                    value={shiftDate}
                    onChange={(e) => setShiftDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Ca trực Studio *</label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                  >
                    <option value="MORNING" className="bg-[#121216] text-white">Ca Sáng (07:30 - 11:30) - 4 giờ</option>
                    <option value="AFTERNOON" className="bg-[#121216] text-white">Ca Chiều (13:30 - 17:30) - 4 giờ</option>
                    <option value="EVENING" className="bg-[#121216] text-white">Ca Tối (17:30 - 21:30) - 4 giờ</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Ghi chú phân công</label>
                  <input
                    type="text"
                    placeholder="VD: Phụ trách hỗ trợ kỹ thuật Studio 2..."
                    value={shiftNote}
                    onChange={(e) => setShiftNote(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShiftModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={savingShift}
                    className="py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    {savingShift ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Lưu ca trực</span>}
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

