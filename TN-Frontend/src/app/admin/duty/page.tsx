'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { useToast } from '@/context/ToastContext';
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
} from 'lucide-react';
import CollaboratorSelect, { CollaboratorItem } from '@/components/common/CollaboratorSelect';

interface DutyPeriodItem {
  id: string;
  month: number;
  year: number;
  status: 'OPEN' | 'CLOSED' | 'ARRANGING' | 'CONFIRMED';
  registrationDeadline?: string;
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
        registered: Array<{ id: string; user: CTVItem; note?: string }>;
        assigned: Array<{ shiftId: string; user: CTVItem; status: string; note?: string }>;
      }
    >
  >;
}

export default function AdminDutyManagementPage() {
  const { toast } = useToast();

  const [periods, setPeriods] = useState<DutyPeriodItem[]>([]);
  const [collaborators, setCollaborators] = useState<CTVItem[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [periodSummary, setPeriodSummary] = useState<PeriodSummaryData | null>(null);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [confirmingSchedule, setConfirmingSchedule] = useState(false);

  // Modal tạo đợt đăng ký mới (Giai đoạn 1)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const now = new Date();
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [newMonth, setNewMonth] = useState<number>(nextMonthDate.getMonth() + 1);
  const [newYear, setNewYear] = useState<number>(nextMonthDate.getFullYear());
  const [newDeadline, setNewDeadline] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');
  const [creatingPeriod, setCreatingPeriod] = useState(false);

  // State cục bộ lưu phân công ca trực trước khi lưu: localAssignments[dateStr][session] = [userId1, userId2]
  const [localAssignments, setLocalAssignments] = useState<Record<string, Record<'S' | 'C' | 'T', string[]>>>({});

  // Bộ lọc CTV & Tìm kiếm nhanh trên Bảng tổng hợp ca trực
  const [filterCtvId, setFilterCtvId] = useState<string>('ALL');
  const [searchCtvTerm, setSearchCtvTerm] = useState<string>('');

  // Modal phân công ca trực nhanh (Giai đoạn 3)
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetDate, setAssignTargetDate] = useState<string>('');
  const [assignTargetSession, setAssignTargetSession] = useState<'S' | 'C' | 'T'>('S');
  const [assignSelectedUserId, setAssignSelectedUserId] = useState<string>('');

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
          setSelectedPeriodId(res.data[0].id);
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

      toast(`Đã tạo đợt đăng ký ca trực Tháng ${newMonth}/${newYear} thành công! Đã gửi thông báo đến CTV.`, 'success');
      setCreateModalOpen(false);
      setNewNote('');
      setNewDeadline('');
      await fetchPeriods();
      if (res.data?.id) {
        setSelectedPeriodId(res.data.id);
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

  // Toggle phân công CTV vào một slot (ngày, session)
  const toggleAssignment = (dateStr: string, session: 'S' | 'C' | 'T', userId: string) => {
    if (periodSummary?.period.status === 'CONFIRMED') {
      toast('Lịch trực đã được xác nhận chính thức, không thể thay đổi.', 'warning');
      return;
    }

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

  // Lưu phân công ca trực (Giai đoạn 3)
  const handleSaveAssignments = async () => {
    if (!selectedPeriodId || !periodSummary) return;

    // Chuyển localAssignments sang mảng assignments
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
      await api.post(`/duty/periods/${selectedPeriodId}/assign`, { assignments });
      toast(`Đã lưu phân công ${assignments.length} ca trực thành công!`, 'success');
      fetchPeriods();
      fetchPeriodSummary(selectedPeriodId);
    } catch (err: any) {
      toast(err.message || 'Lỗi khi lưu phân công ca trực', 'error');
    } finally {
      setSavingAssignments(false);
    }
  };

  // Xác nhận lịch trực tháng chính thức (CONFIRMED)
  const handleConfirmSchedule = async () => {
    if (!selectedPeriodId || !periodSummary) return;
    if (!confirm(`Bạn có chắc chắn muốn XÁC NHẬN CHÍNH THỨC lịch trực Tháng ${periodSummary.period.month}/${periodSummary.period.year}? Sau khi xác nhận, lịch trực sẽ được chốt và đồng bộ vào Bảng chấm công.`)) {
      return;
    }

    setConfirmingSchedule(true);
    try {
      // Trước khi chốt, tự động lưu lại các phân công hiện tại
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

      // Gọi xác nhận chính thức
      const res = await api.post(`/duty/periods/${selectedPeriodId}/confirm-schedule`, {});
      toast(res.message || 'Đã xác nhận lịch trực tháng thành công!', 'success');
      fetchPeriods();
      fetchPeriodSummary(selectedPeriodId);
    } catch (err: any) {
      toast(err.message || 'Lỗi khi xác nhận lịch trực', 'error');
    } finally {
      setConfirmingSchedule(false);
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
              <span>Quy trình Quản lý Ca trực 3 giai đoạn (FR-05)</span>
            </div>
            {/* Hạng mục 4.1: Tiêu đề trang chuẩn */}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Quản lý ca trực</h1>
            <p className="text-xs sm:text-sm text-studio-muted mt-1 max-w-2xl leading-relaxed">
              Khởi tạo đợt đăng ký ca trực tháng mới, tiếp nhận thời gian có thể trực của CTV, sắp xếp phân công và chốt lịch trực chính thức.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/payroll"
              className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-2.5 rounded-2xl border border-white/10 text-xs transition-all"
            >
              <span>Xem Bảng chấm công</span>
            </Link>

            <button
              onClick={() => setCreateModalOpen(true)}
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
              className="p-1.5 rounded-xl border border-white/10 text-studio-muted hover:text-white hover:bg-white/5 transition-all"
              title="Làm mới"
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
                    onClick={() => setSelectedPeriodId(p.id)}
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
                      {getStatusBadge(p.status)}
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
                      <p className="text-[10px] text-studio-muted truncate">
                        Hạn: {new Date(p.registrationDeadline).toLocaleDateString('vi-VN')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* GIAI ĐOẠN 2 & 3: BẢNG SẮP XẾP VÀ XÁC NHẬN LỊCH TRỰC THÁNG                 */}
        {/* ========================================================================= */}
        {selectedPeriodId && periodSummary && (
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-black/25 space-y-5">
            {/* Thanh điều khiển đợt */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-black text-white">
                    Sắp Xếp &amp; Phân Công Lịch Trực Tháng {periodSummary.period.month}/{periodSummary.period.year}
                  </h2>
                  {getStatusBadge(periodSummary.period.status)}
                </div>
                <p className="text-xs text-studio-muted mt-0.5">
                  Xem danh sách CTV đăng ký có thể trực, phân công ca trực chính thức và xác nhận lịch trực.
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

                {periodSummary.period.status === 'CONFIRMED' && (
                  <span className="text-xs text-purple-300 font-bold bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/20 flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    <span>Lịch đã được chốt và đồng bộ vào Bảng chấm công</span>
                  </span>
                )}
              </div>
            </div>

            {/* Thanh Bộ lọc CTV và Tìm kiếm trên Ma trận ca trực (Đồng bộ danh sách CTV) */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-black/40 rounded-2xl border border-white/5">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Dropdown Lọc CTV */}
                <div className="flex items-center space-x-2 bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 min-w-[200px] max-w-xs">
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

                {/* Tìm kiếm CTV */}
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

              {periodSummary.period.status !== 'CONFIRMED' && (
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
              )}
            </div>

            {/* Chú thích màu sắc */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-studio-muted bg-white/2 p-3 rounded-2xl border border-white/5">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded bg-blue-500/40 border border-blue-500 inline-block"></span>
                <span>CTV đã đăng ký rảnh (Có thể trực)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
                <span>Đã phân công chính thức (Nhân sự xếp)</span>
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
                      <th className="p-2.5 border-r border-white/10 w-24 sticky left-0 bg-[#121216] z-10 text-left">
                        Buổi trực
                      </th>
                      {periodSummary.daysMeta.map((dm) => (
                        <th
                          key={dm.day}
                          className={`p-2 border-r border-white/5 min-w-[120px] max-w-[140px] ${
                            dm.isSunday ? 'bg-rose-500/15 text-rose-300' : ''
                          }`}
                        >
                          <div className="text-xs font-bold text-white">{dm.day}</div>
                          <div className="text-[10px] font-normal opacity-70">{dm.dayOfWeek}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {(['S', 'C', 'T'] as const).map((session) => {
                      const sessionLabel =
                        session === 'S'
                          ? 'Sáng (07:30 - 11:30)'
                          : session === 'C'
                          ? 'Chiều (13:00 - 17:00)'
                          : 'Tối (17:30 - 21:30)';

                      return (
                        <tr key={session} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          {/* Cột Buổi cố định sticky bên trái */}
                          <td className="p-2.5 border-r border-white/10 sticky left-0 bg-[#121216] z-10 align-top">
                            <span className="font-bold text-white block">
                              {session === 'S' ? 'Ca Sáng' : session === 'C' ? 'Ca Chiều' : 'Ca Tối'}
                            </span>
                            <span className="text-[9px] text-studio-muted block">
                              {session === 'S' ? '07:30 - 11:30' : session === 'C' ? '13:00 - 17:00' : '17:30 - 21:30'}
                            </span>
                          </td>

                          {/* Các cột ngày */}
                          {periodSummary.daysMeta.map((dm) => {
                            const slot = periodSummary.slots[dm.dateStr]?.[session] || { registered: [], assigned: [] };
                            const assignedUserIds = localAssignments[dm.dateStr]?.[session] || [];

                            // Kiểm tra tương tác với bộ lọc CTV
                            const isFilterActive = filterCtvId !== 'ALL' || searchCtvTerm.trim() !== '';
                            const hasMatchingCollaborator = !isFilterActive || (
                              slot.registered.some((r) => {
                                const matchId = filterCtvId === 'ALL' || r.user?.id === filterCtvId;
                                const matchSearch = !searchCtvTerm.trim() ||
                                  r.user?.fullName.toLowerCase().includes(searchCtvTerm.toLowerCase()) ||
                                  r.user?.email.toLowerCase().includes(searchCtvTerm.toLowerCase()) ||
                                  (r.user?.employeeCode && r.user.employeeCode.toLowerCase().includes(searchCtvTerm.toLowerCase()));
                                return matchId && matchSearch;
                              }) ||
                              assignedUserIds.some((uid) => {
                                const matchId = filterCtvId === 'ALL' || uid === filterCtvId;
                                const u = collaborators.find((c) => c.id === uid);
                                const matchSearch = !searchCtvTerm.trim() || (u && (
                                  u.fullName.toLowerCase().includes(searchCtvTerm.toLowerCase()) ||
                                  u.email.toLowerCase().includes(searchCtvTerm.toLowerCase()) ||
                                  (u.employeeCode && u.employeeCode.toLowerCase().includes(searchCtvTerm.toLowerCase()))
                                ));
                                return matchId && (matchSearch !== undefined ? matchSearch : true);
                              })
                            );

                            return (
                              <td
                                key={`${dm.dateStr}_${session}`}
                                className={`p-2 border-r border-white/5 align-top space-y-2 transition-all ${
                                  dm.isSunday ? 'bg-rose-500/5' : ''
                                } ${isFilterActive && !hasMatchingCollaborator ? 'opacity-30' : ''} ${
                                  isFilterActive && hasMatchingCollaborator ? 'ring-1 ring-brand-primary/50 bg-brand-primary/5 rounded-xl' : ''
                                }`}
                              >
                                {/* 1. Danh sách CTV đã đăng ký rảnh (Availability) */}
                                <div>
                                  <span className="text-[9px] uppercase font-bold text-blue-400 block mb-1">
                                    Đăng ký rảnh ({slot.registered.length}):
                                  </span>
                                  {slot.registered.length === 0 ? (
                                    <span className="text-[10px] text-white/30 italic block">Không ai rảnh</span>
                                  ) : (
                                    <div className="space-y-1">
                                      {slot.registered.map((r) => {
                                        const isSelected = assignedUserIds.includes(r.user?.id);
                                        const codeOrEmail = r.user?.employeeCode || r.user?.email;
                                        return (
                                          <div
                                            key={r.id}
                                            onClick={() => toggleAssignment(dm.dateStr, session, r.user.id)}
                                            className={`p-1.5 rounded-lg border text-[10px] flex items-center justify-between transition-all cursor-pointer ${
                                              isSelected
                                                ? 'bg-emerald-500/25 border-emerald-500 text-white font-bold'
                                                : 'bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/20'
                                            }`}
                                            title={`Click để chọn hoặc hủy phân công. ${r.user?.fullName} (${codeOrEmail})`}
                                          >
                                            <span className="truncate max-w-[85px]">{r.user?.fullName}</span>
                                            {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* 2. Phân công thêm CTV khác ngoài danh sách rảnh nếu cần */}
                                {periodSummary.period.status !== 'CONFIRMED' && (
                                  <div className="pt-1 border-t border-white/5">
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          toggleAssignment(dm.dateStr, session, e.target.value);
                                        }
                                      }}
                                      className="w-full bg-black/40 border border-white/10 rounded-lg p-1 text-[9px] text-studio-muted focus:outline-none focus:border-brand-primary"
                                    >
                                      <option value="">+ Phân công CTV...</option>
                                      {collaborators.map((c) => (
                                        <option key={c.id} value={c.id} className="bg-[#121216] text-white">
                                          {c.fullName} ({c.employeeCode || c.email})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL TẠO ĐỢT ĐĂNG KÝ CA TRỰC MỚI (GIAI ĐOẠN 1)                           */}
        {/* ========================================================================= */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCreateModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2.5">
                  <PlusCircle className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-base font-bold text-white">Tạo Đợt Đăng Ký Ca Trực Tháng</h3>
                </div>
                <button onClick={() => setCreateModalOpen(false)} className="text-studio-muted hover:text-white">
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
                      onChange={(e) => setNewMonth(parseInt(e.target.value, 10))}
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
                      onChange={(e) => setNewYear(parseInt(e.target.value, 10))}
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
                  <label className="text-[11px] font-bold text-studio-muted uppercase block mb-1">
                    Hạn chót đăng ký (Tùy chọn)
                  </label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                  />
                  <p className="text-[10px] text-studio-muted mt-1">
                    Sau thời hạn này, CTV sẽ không thể gửi hoặc sửa lịch rảnh.
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
        {/* MODAL PHÂN CÔNG / ĐIỀU CHỈNH NGƯỜI TRỰC NHANH (GIAI ĐOẠN 3)              */}
        {/* ========================================================================= */}
        {assignModalOpen && periodSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setAssignModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2.5">
                  <UserPlus className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-base font-bold text-white">Phân Công Ca Trực Cho CTV</h3>
                </div>
                <button onClick={() => setAssignModalOpen(false)} className="text-studio-muted hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl text-xs text-brand-primary/90 leading-relaxed">
                Chọn ngày, buổi trực và Cộng tác viên (chỉ các tài khoản đang hoạt động). Thông tin sẽ được thêm vào bảng phân công tạm tính trước khi bạn xác nhận lưu.
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!assignTargetDate || !assignSelectedUserId) {
                    toast('Vui lòng chọn ngày và CTV để phân công', 'warning');
                    return;
                  }
                  // Phân công CTV vào slot
                  const currentSlot = localAssignments[assignTargetDate]?.[assignTargetSession] || [];
                  if (!currentSlot.includes(assignSelectedUserId)) {
                    toggleAssignment(assignTargetDate, assignTargetSession, assignSelectedUserId);
                    toast('Đã thêm CTV vào ca trực. Nhớ nhấn "Lưu phân công" sau khi hoàn tất.', 'success');
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
                    Chọn Cộng tác viên (CHỈ CTV ĐANG HOẠT ĐỘNG) *
                  </label>
                  <CollaboratorSelect
                    purpose="assign"
                    value={assignSelectedUserId}
                    onChange={(val) => setAssignSelectedUserId(val)}
                    placeholder="-- Chọn CTV phân công --"
                  />
                  <p className="text-[10px] text-studio-muted mt-1">
                    Hệ thống chỉ hiển thị các CTV có vai trò COLLABORATOR và trạng thái Active.
                  </p>
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
      </div>
    </AdminLayout>
  );
}

