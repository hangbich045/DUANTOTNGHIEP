'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import DatePickerVN from '@/components/common/DatePickerVN';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import {
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Copy,
  Check,
  User,
  Shield,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  Clock,
  Laptop,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | any;
  ip: string | null;
  userAgent: string | null;
  status: 'SUCCESS' | 'FAILED';
  timestamp: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: 'ADMIN' | 'COLLABORATOR' | 'USER';
    employeeCode?: string;
    avatarUrl?: string;
  } | null;
}

interface AuditStats {
  total: number;
  todayCount: number;
  successCount: number;
  failedCount: number;
  byActionGroup: {
    create: number;
    update: number;
    delete: number;
    approve: number;
    reject: number;
  };
}

const ACTION_OPTIONS = [
  { value: 'ALL', label: 'Tất cả hành động' },
  { value: 'CREATE', label: 'Thêm mới (CREATE)' },
  { value: 'UPDATE', label: 'Cập nhật (UPDATE)' },
  { value: 'DELETE', label: 'Xóa bỏ (DELETE)' },
  { value: 'APPROVE', label: 'Phê duyệt / Nghiệm thu (APPROVE)' },
  { value: 'REJECT', label: 'Từ chối (REJECT)' },
  { value: 'ASSIGN_ROLE', label: 'Phân quyền / Đổi vai trò' },
  { value: 'TOGGLE_STATUS', label: 'Khóa / Mở khóa tài khoản' },
  { value: 'HANDOVER', label: 'Bàn giao thiết bị' },
  { value: 'RETURN', label: 'Hoàn trả thiết bị' },
  { value: 'CONFIRM_SCHEDULE', label: 'Chốt lịch trực Studio' },
  { value: 'LOGIN', label: 'Đăng nhập hệ thống' },
];

const RESOURCE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả đối tượng' },
  { value: 'USER', label: 'Thành viên / Tài khoản' },
  { value: 'EQUIPMENT', label: 'Thiết bị Studio' },
  { value: 'CATEGORY', label: 'Danh mục thiết bị' },
  { value: 'BORROW_REQUEST', label: 'Yêu cầu mượn thiết bị' },
  { value: 'STUDIO_BOOKING', label: 'Đặt phòng Studio' },
  { value: 'TASK', label: 'Công việc sự vụ CTV' },
  { value: 'DUTY_PERIOD', label: 'Đợt đăng ký ca trực' },
  { value: 'STUDIO_SHIFT', label: 'Ca trực Studio' },
  { value: 'PAYROLL', label: 'Bảng thù lao / Chấm công' },
];

export default function AdminAuditLogsPage() {
  const { toast } = useToast();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [resourceFilter, setResourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Phân trang
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal Chi tiết
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Tải danh sách Audit Logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (actionFilter !== 'ALL') params.append('action', actionFilter);
      if (resourceFilter !== 'ALL') params.append('resource', resourceFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res: any = await api.get(`/audit-logs?${params.toString()}`);
      if (res.success) {
        setLogs(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tải lịch sử thao tác', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, actionFilter, resourceFilter, statusFilter, startDate, endDate, toast]);

  // Tải thống kê
  const fetchStats = useCallback(async () => {
    try {
      const res: any = await api.get('/audit-logs/stats');
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      console.warn('Lỗi tải thống kê audit logs:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedLog) {
        setSelectedLog(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLog]);

  // Reset toàn bộ bộ lọc
  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('ALL');
    setResourceFilter('ALL');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Copy nội dung diễn giải vào clipboard
  const handleCopyText = (content: any) => {
    try {
      const text = typeof content === 'string' ? content : (typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content || ''));
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast('Đã sao chép nội dung thao tác vào Clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Không thể sao chép nội dung', 'error');
    }
  };

  // Format Action Badge
  const renderActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (['APPROVE', 'CONFIRM_SCHEDULE', 'COMPLETED'].includes(act)) {
      return (
        <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 inline-flex items-center space-x-1">
          <CheckCircle2 className="w-3 h-3 shrink-0" />
          <span>{act === 'CONFIRM_SCHEDULE' ? 'CHỐT LỊCH' : act === 'APPROVE' ? 'PHÊ DUYỆT' : 'NGHIỆM THU'}</span>
        </span>
      );
    }
    if (['CREATE', 'REGISTER'].includes(act)) {
      return (
        <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-teal-500/10 text-teal-400 border-teal-500/30 inline-flex items-center space-x-1">
          <Layers className="w-3 h-3 shrink-0" />
          <span>{act === 'REGISTER' ? 'ĐĂNG KÝ' : 'THÊM MỚI'}</span>
        </span>
      );
    }
    if (['UPDATE', 'UPDATE_STATUS'].includes(act)) {
      return (
        <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-blue-500/10 text-blue-400 border-blue-500/30 inline-flex items-center space-x-1">
          <Activity className="w-3 h-3 shrink-0" />
          <span>CẬP NHẬT</span>
        </span>
      );
    }
    if (['DELETE', 'REJECT', 'CANCEL'].includes(act)) {
      return (
        <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-rose-500/10 text-rose-400 border-rose-500/30 inline-flex items-center space-x-1">
          <XCircle className="w-3 h-3 shrink-0" />
          <span>{act === 'DELETE' ? 'XÓA BỎ' : act === 'REJECT' ? 'TỪ CHỐI' : 'HỦY BỎ'}</span>
        </span>
      );
    }
    if (['ASSIGN_ROLE', 'TOGGLE_STATUS'].includes(act)) {
      return (
        <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-amber-500/10 text-amber-400 border-amber-500/30 inline-flex items-center space-x-1">
          <Shield className="w-3 h-3 shrink-0" />
          <span>{act === 'ASSIGN_ROLE' ? 'PHÂN QUYỀN' : 'ĐỔI TRẠNG THÁI'}</span>
        </span>
      );
    }
    if (['HANDOVER', 'RETURN'].includes(act)) {
      return (
        <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-purple-500/10 text-purple-400 border-purple-500/30 inline-flex items-center space-x-1">
          <Laptop className="w-3 h-3 shrink-0" />
          <span>{act === 'HANDOVER' ? 'BÀN GIAO' : 'HOÀN TRẢ'}</span>
        </span>
      );
    }
    if (['LOGIN', 'VERIFY_ACCOUNT', 'RESET_PASSWORD'].includes(act)) {
      return (
        <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-cyan-500/10 text-cyan-400 border-cyan-500/30 inline-flex items-center space-x-1">
          <User className="w-3 h-3 shrink-0" />
          <span>{act === 'LOGIN' ? 'ĐĂNG NHẬP' : act === 'VERIFY_ACCOUNT' ? 'XÁC THỰC' : 'ĐỔI MẬT KHẨU'}</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border bg-white/5 text-white/80 border-white/10">
        {action}
      </span>
    );
  };

  // Format Resource Label
  const formatResourceLabel = (resource: string) => {
    const res = resource.toUpperCase();
    const map: Record<string, string> = {
      USER: 'Người dùng',
      EQUIPMENT: 'Thiết bị',
      CATEGORY: 'Danh mục',
      BORROW_REQUEST: 'Mượn - Trả',
      STUDIO_BOOKING: 'Đặt phòng Studio',
      TASK: 'Công việc CTV',
      DUTY_PERIOD: 'Đợt trực Studio',
      STUDIO_SHIFT: 'Ca trực',
      PAYROLL: 'Thù lao',
      NOTIFICATION: 'Thông báo',
      SYSTEM: 'Hệ thống',
    };
    return map[res] || resource;
  };

  // Format Date chuẩn Việt Nam
  const formatDateVN = (dateString: string) => {
    if (!dateString) return '---';
    try {
      const d = new Date(dateString);
      return d.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Lịch sử thao tác
            </h1>
            <p className="text-studio-muted text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              Theo dõi toàn bộ thao tác quan trọng trên hệ thống: thêm/sửa/xóa, phê duyệt/từ chối, phân quyền và đăng nhập.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                fetchLogs();
                fetchStats();
              }}
              disabled={loading}
              className="flex items-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-studio-card/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-studio-muted">Tổng số thao tác</span>
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Activity className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-white mt-2">
              {stats ? stats.total.toLocaleString() : '---'}
            </div>
            <div className="text-[11px] text-studio-muted mt-1">Toàn bộ thao tác đã ghi nhận</div>
          </div>

          <div className="bg-studio-card/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-studio-muted">Thao tác hôm nay</span>
              <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-white mt-2">
              {stats ? stats.todayCount.toLocaleString() : '---'}
            </div>
            <div className="text-[11px] text-cyan-400/90 mt-1">Hoạt động trong 24 giờ qua</div>
          </div>

          <div className="bg-studio-card/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-studio-muted">Duyệt &amp; Nghiệm thu</span>
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-2">
              {stats ? (stats.byActionGroup.approve || 0).toLocaleString() : '---'}
            </div>
            <div className="text-[11px] text-studio-muted mt-1">Duyệt mượn, phòng, chốt lịch</div>
          </div>

          <div className="bg-studio-card/80 border border-white/10 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-studio-muted">Thêm / Sửa / Phân quyền</span>
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Shield className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-amber-400 mt-2">
              {stats ? ((stats.byActionGroup.create || 0) + (stats.byActionGroup.update || 0)).toLocaleString() : '---'}
            </div>
            <div className="text-[11px] text-studio-muted mt-1">Thay đổi cấu hình &amp; tài nguyên</div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-studio-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Filter className="w-4 h-4 text-brand-primary" />
              <span>Bộ lọc tra cứu nâng cao</span>
            </div>
            {(search || actionFilter !== 'ALL' || resourceFilter !== 'ALL' || statusFilter !== 'ALL' || startDate || endDate) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-brand-primary hover:underline font-semibold cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Search Input */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-studio-muted block mb-1.5">
                Tìm kiếm thao tác
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-studio-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên người thực hiện, email, IP, nội dung..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-studio-dark/70 border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-studio-muted focus:outline-none focus:border-brand-primary transition-all"
                />
              </div>
            </div>

            {/* Action Filter */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-studio-muted block mb-1.5">
                Loại hành động
              </label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-studio-dark/70 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-studio-card text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Filter */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-studio-muted block mb-1.5">
                Đối tượng tài nguyên
              </label>
              <select
                value={resourceFilter}
                onChange={(e) => {
                  setResourceFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-studio-dark/70 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
              >
                {RESOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-studio-card text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-studio-muted block mb-1.5">
                Trạng thái thực thi
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-studio-dark/70 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
              >
                <option value="ALL" className="bg-studio-card text-white">Tất cả trạng thái</option>
                <option value="SUCCESS" className="bg-studio-card text-white">Thành công (SUCCESS)</option>
                <option value="FAILED" className="bg-studio-card text-white">Thất bại / Lỗi (FAILED)</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-studio-muted block mb-1.5">
                Từ ngày
              </label>
              <DatePickerVN
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  setPage(1);
                }}
                clearable
                className="w-full"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-studio-muted block mb-1.5">
                Đến ngày
              </label>
              <DatePickerVN
                value={endDate}
                onChange={(val) => {
                  setEndDate(val);
                  setPage(1);
                }}
                clearable
                className="w-full"
              />
            </div>

            {/* Limit Selector */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-studio-muted block mb-1.5">
                Số bản ghi / trang
              </label>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="w-full bg-studio-dark/70 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary cursor-pointer"
              >
                <option value={10} className="bg-studio-card text-white">10 bản ghi/trang</option>
                <option value={20} className="bg-studio-card text-white">20 bản ghi/trang</option>
                <option value={50} className="bg-studio-card text-white">50 bản ghi/trang</option>
                <option value={100} className="bg-studio-card text-white">100 bản ghi/trang</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-studio-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="text-xs font-semibold text-studio-muted">
              Hiển thị <span className="text-white font-bold">{logs.length}</span> trên tổng số <span className="text-white font-bold">{totalCount}</span> thao tác
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-studio-muted">
              <span>Trang {page} / {totalPages}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold text-studio-muted uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-[170px] whitespace-nowrap">Thời gian</th>
                  <th className="py-3.5 px-4 w-[190px] whitespace-nowrap">Người thực hiện</th>
                  <th className="py-3.5 px-4 w-[150px] whitespace-nowrap">Hành động</th>
                  <th className="py-3.5 px-4 min-w-[320px]">Nội dung thao tác</th>
                  <th className="py-3.5 px-4 w-[120px] whitespace-nowrap">Địa chỉ IP</th>
                  <th className="py-3.5 px-4 w-[120px] text-center whitespace-nowrap">Trạng thái</th>
                  <th className="py-3.5 px-4 w-[80px] text-right whitespace-nowrap">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-white/90">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-studio-muted">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
                        <span>Đang tải nhật ký thao tác...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-studio-muted">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertTriangle className="w-8 h-8 text-studio-muted/50" />
                        <span className="font-semibold text-white">Không có bản ghi lịch sử thao tác nào</span>
                        <span className="text-[11px] max-w-sm text-studio-muted">
                          Thử thay đổi từ khóa hoặc điều chỉnh khoảng thời gian lọc dữ liệu để xem thêm kết quả.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Thời gian */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-studio-muted shrink-0" />
                          <span className="font-mono text-[11px] text-white/90">
                            {formatDateVN(log.createdAt || log.timestamp)}
                          </span>
                        </div>
                      </td>

                      {/* Người thực hiện */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.user ? (
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center font-bold text-[11px] text-brand-primary shrink-0">
                              {log.user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate max-w-[150px]">
                                {log.user.fullName}
                              </div>
                              <div className="text-[10px] text-studio-muted truncate max-w-[150px]">
                                {log.user.email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-studio-muted">
                            <Laptop className="w-3.5 h-3.5 shrink-0" />
                            <span className="italic text-[11px]">Hệ thống / Khách</span>
                          </div>
                        )}
                      </td>

                      {/* Hành động */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderActionBadge(log.action)}
                      </td>

                      {/* Nội dung thao tác (Văn bản tiếng Việt người dùng đọc được trực tiếp) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-w-md">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/90 shrink-0">
                              {formatResourceLabel(log.resource)}
                            </span>
                            {log.resourceId && (
                              <span className="font-mono text-[10px] text-studio-muted truncate max-w-[130px]" title={log.resourceId}>
                                #{log.resourceId.slice(0, 10)}...
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/95 line-clamp-2 leading-relaxed font-medium">
                            {typeof log.details === 'string' ? log.details : (log.details ? JSON.stringify(log.details) : 'Không có mô tả chi tiết')}
                          </p>
                        </div>
                      </td>

                      {/* IP */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/80">
                          {log.ip || '127.0.0.1'}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {log.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Thành công</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-rose-400 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Thất bại</span>
                          </span>
                        )}
                      </td>

                      {/* Nút xem chi tiết */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-studio-muted hover:text-white transition-all cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang (Pagination) */}
          <div className="p-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-studio-muted">
              Đang xem dòng {(page - 1) * limit + 1} - {Math.min(page * limit, totalCount)} trong tổng số {totalCount}
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || loading}
                className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 font-bold text-white">
                {page} / {totalPages || 1}
              </span>

              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || loading}
                className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Xem chi tiết Audit Log */}
        {selectedLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-studio-card border border-white/15 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Chi tiết Lịch sử thao tác
                    </h3>
                    <p className="text-xs text-studio-muted font-mono">
                      Mã thao tác: {selectedLog.id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-studio-muted hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="py-4 space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Tóm tắt metadata */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
                  <div>
                    <span className="text-studio-muted block text-[11px]">Hành động:</span>
                    <div className="mt-1">{renderActionBadge(selectedLog.action)}</div>
                  </div>
                  <div>
                    <span className="text-studio-muted block text-[11px]">Đối tượng tác động:</span>
                    <strong className="text-white mt-1 block">
                      {formatResourceLabel(selectedLog.resource)} {selectedLog.resourceId ? `(#${selectedLog.resourceId})` : ''}
                    </strong>
                  </div>
                  <div>
                    <span className="text-studio-muted block text-[11px]">Trạng thái:</span>
                    <strong className={`mt-1 block font-bold ${selectedLog.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedLog.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-studio-muted block text-[11px]">Người thực hiện:</span>
                    <strong className="text-white mt-1 block">
                      {selectedLog.user ? `${selectedLog.user.fullName} (${selectedLog.user.role})` : 'Hệ thống'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-studio-muted block text-[11px]">Địa chỉ IP:</span>
                    <span className="font-mono text-white mt-1 block">{selectedLog.ip || '127.0.0.1'}</span>
                  </div>
                  <div>
                    <span className="text-studio-muted block text-[11px]">Thời gian ghi nhận:</span>
                    <span className="font-mono text-white mt-1 block text-[11px]">
                      {formatDateVN(selectedLog.createdAt || selectedLog.timestamp)}
                    </span>
                  </div>
                </div>

                {selectedLog.userAgent && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                    <span className="text-studio-muted block text-[11px]">Trình duyệt / Thiết bị:</span>
                    <span className="font-mono text-white/80 text-[11px] break-all">
                      {selectedLog.userAgent}
                    </span>
                  </div>
                )}

                {/* Khối Nội dung mô tả chi tiết (Văn bản tiếng Việt dễ đọc, KHÔNG hiển thị mã JSON) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Nội dung thao tác chi tiết</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(selectedLog.details)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold border border-white/10 transition-all cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Đã sao chép' : 'Sao chép nội dung'}</span>
                    </button>
                  </div>

                  <div className="p-4.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="p-2.5 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shrink-0 mt-0.5">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-studio-muted">
                          Diễn giải hành động
                        </div>
                        <p className="text-white text-sm font-semibold leading-relaxed">
                          {typeof selectedLog.details === 'string'
                            ? selectedLog.details
                            : (selectedLog.details ? JSON.stringify(selectedLog.details) : 'Không có nội dung mô tả')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-studio-muted italic">
                    * Hệ thống tự động ghi nhận mô tả thao tác dễ đọc và không lưu mật khẩu hay mã xác thực bảo mật.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
