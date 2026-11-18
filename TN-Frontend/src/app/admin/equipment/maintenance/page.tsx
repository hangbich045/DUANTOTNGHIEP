'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import DatePickerVN from '@/components/common/DatePickerVN';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import {
  Wrench,
  Search,
  Filter,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  DollarSign,
  AlertTriangle,
  Archive,
  ArrowLeft,
  Eye,
  Edit2,
  Trash2,
  Upload,
  X,
  Camera,
  Calendar,
  Building,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface EquipmentItem {
  id: string;
  name: string;
  code: string;
  status: string;
  imageUrl?: string;
  location?: string;
  quantity?: number;
  availableQuantity?: number;
}

interface EquipmentMaintenanceItem {
  id: string;
  equipmentId: string;
  type: 'MAINTENANCE' | 'REPAIR' | 'LOST' | 'DISPOSAL';
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  cost: number;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  invoiceUrl: string | null;
  serviceProvider: string | null;
  notes: string | null;
  createdAt: string;
  equipment?: EquipmentItem;
  creator?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

interface MaintenanceStats {
  total: number;
  inProgressCount: number;
  completedCount: number;
  cancelledCount: number;
  totalCost: number;
  byType: {
    maintenance: number;
    repair: number;
    lost: number;
    disposal: number;
  };
  equipmentStatusCounts: {
    inMaintenance: number;
    lost: number;
    disposed: number;
  };
}

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả loại nghiệp vụ' },
  { value: 'MAINTENANCE', label: 'Bảo trì định kỳ' },
  { value: 'REPAIR', label: 'Sửa chữa sự cố' },
  { value: 'LOST', label: 'Báo mất thiết bị' },
  { value: 'DISPOSAL', label: 'Thanh lý / Tiêu hủy' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'IN_PROGRESS', label: 'Đang xử lý / Đang sửa chữa' },
  { value: 'COMPLETED', label: 'Đã hoàn tất / Nghiệm thu' },
  { value: 'CANCELLED', label: 'Đã hủy bỏ' },
];

export default function EquipmentMaintenancePage() {
  const { toast } = useToast();

  const [records, setRecords] = useState<EquipmentMaintenanceItem[]>([]);
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [equipmentsList, setEquipmentsList] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [equipmentFilter, setEquipmentFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Phân trang
  const [page, setPage] = useState(1);
  const limit = 15;
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal Tạo / Sửa
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  // Dữ liệu Form
  const [equipmentId, setEquipmentId] = useState('');
  const [type, setType] = useState<'MAINTENANCE' | 'REPAIR' | 'LOST' | 'DISPOSAL'>('MAINTENANCE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState('');
  const [formStatus, setFormStatus] = useState<'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'>('IN_PROGRESS');
  const [cost, setCost] = useState<number | string>('0');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [notes, setNotes] = useState('');

  // Modal Xem chi tiết
  const [selectedRecord, setSelectedRecord] = useState<EquipmentMaintenanceItem | null>(null);

  // Modal Nghiệm thu hoàn tất
  const [completeConfirmModal, setCompleteConfirmModal] = useState<EquipmentMaintenanceItem | null>(null);
  const [completeSubmitting, setCompleteSubmitting] = useState(false);

  // Modal Xóa
  const [deletingRecord, setDeletingRecord] = useState<EquipmentMaintenanceItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Tải danh sách thiết bị cho dropdown
  const fetchEquipments = useCallback(async () => {
    try {
      const res: any = await api.get('/equipment?limit=100');
      if (res && res.items) {
        setEquipmentsList(res.items);
      }
    } catch (e: any) {
      console.warn('Không thể tải danh sách thiết bị:', e.message);
    }
  }, []);

  // Tải danh sách phiếu bảo trì
  const fetchMaintenances = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (equipmentFilter !== 'ALL') params.append('equipmentId', equipmentFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res: any = await api.get(`/maintenances?${params.toString()}`);
      if (res.success) {
        setRecords(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tải lịch sử bảo trì thiết bị', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, typeFilter, statusFilter, equipmentFilter, startDate, endDate, toast]);

  // Tải thống kê
  const fetchStats = useCallback(async () => {
    try {
      const res: any = await api.get('/maintenances/stats');
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      console.warn('Lỗi tải thống kê bảo trì:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchEquipments();
    fetchStats();
  }, [fetchEquipments, fetchStats]);

  useEffect(() => {
    fetchMaintenances();
  }, [fetchMaintenances]);

  // Mở modal thêm mới
  const handleOpenCreate = () => {
    setEditingId(null);
    setEquipmentId(equipmentsList[0]?.id || '');
    setType('MAINTENANCE');
    setTitle('');
    setDescription('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormEndDate('');
    setFormStatus('IN_PROGRESS');
    setCost('0');
    setInvoiceNumber('');
    setInvoiceDate('');
    setInvoiceUrl('');
    setServiceProvider('');
    setNotes('');
    setFormModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (rec: EquipmentMaintenanceItem) => {
    setEditingId(rec.id);
    setEquipmentId(rec.equipmentId);
    setType(rec.type);
    setTitle(rec.title);
    setDescription(rec.description || '');
    setFormStartDate(rec.startDate ? rec.startDate.split('T')[0] : '');
    setFormEndDate(rec.endDate ? rec.endDate.split('T')[0] : '');
    setFormStatus(rec.status);
    setCost(String(rec.cost || 0));
    setInvoiceNumber(rec.invoiceNumber || '');
    setInvoiceDate(rec.invoiceDate ? rec.invoiceDate.split('T')[0] : '');
    setInvoiceUrl(rec.invoiceUrl || '');
    setServiceProvider(rec.serviceProvider || '');
    setNotes(rec.notes || '');
    setFormModalOpen(true);
  };

  // Upload hóa đơn / biên bản chứng từ
  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingInvoice(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/fe-api/upload?type=equipment', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi tải tệp hóa đơn lên');
      }
      setInvoiceUrl(data.url);
      toast('Tải chứng từ / hóa đơn thành công', 'success');
    } catch (err: any) {
      toast(err.message || 'Lỗi tải ảnh chứng từ', 'error');
    } finally {
      setUploadingInvoice(false);
    }
  };

  // Submit Form Tạo / Sửa
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentId) {
      toast('Vui lòng chọn thiết bị', 'warning');
      return;
    }
    if (!title.trim() || title.trim().length < 3) {
      toast('Tiêu đề phiếu phải từ 3 ký tự trở lên', 'warning');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        equipmentId,
        type,
        title: title.trim(),
        description: description.trim() || null,
        startDate: formStartDate,
        endDate: formEndDate || null,
        status: formStatus,
        cost: parseFloat(String(cost)) || 0,
        invoiceNumber: invoiceNumber.trim() || null,
        invoiceDate: invoiceDate || null,
        invoiceUrl: invoiceUrl || null,
        serviceProvider: serviceProvider.trim() || null,
        notes: notes.trim() || null,
      };

      if (editingId) {
        await api.put(`/maintenances/${editingId}`, payload);
        toast('Cập nhật phiếu thành công', 'success');
      } else {
        await api.post('/maintenances', payload);
        toast('Tạo phiếu mới thành công', 'success');
      }

      setFormModalOpen(false);
      fetchMaintenances();
      fetchStats();
    } catch (err: any) {
      toast(err.message || 'Lỗi lưu phiếu bảo trì / sửa chữa', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Xác nhận nghiệm thu hoàn tất
  const handleConfirmComplete = async () => {
    if (!completeConfirmModal) return;
    setCompleteSubmitting(true);
    try {
      await api.put(`/maintenances/${completeConfirmModal.id}`, {
        status: 'COMPLETED',
        endDate: new Date().toISOString().split('T')[0],
      });
      toast('Đã nghiệm thu hoàn tất! Thiết bị đã được chuyển về trạng thái Sẵn sàng.', 'success');
      setCompleteConfirmModal(null);
      fetchMaintenances();
      fetchStats();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi nghiệm thu hoàn tất', 'error');
    } finally {
      setCompleteSubmitting(false);
    }
  };

  // Xóa phiếu
  const handleConfirmDelete = async () => {
    if (!deletingRecord) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/maintenances/${deletingRecord.id}`);
      toast('Đã xóa phiếu thành công', 'success');
      setDeletingRecord(null);
      fetchMaintenances();
      fetchStats();
    } catch (err: any) {
      toast(err.message || 'Lỗi xóa phiếu', 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Format tiền tệ VNĐ
  const formatVND = (amount: number) => {
    return Number(amount || 0).toLocaleString('vi-VN') + ' đ';
  };

  // Format ngày Việt Nam
  const formatDateVN = (dateStr: string | null) => {
    if (!dateStr) return '---';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Render Badge Loại phiếu
  const renderTypeBadge = (t: string) => {
    switch (t) {
      case 'MAINTENANCE':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-blue-500/10 text-blue-400 border-blue-500/30 inline-flex items-center space-x-1">
            <Wrench className="w-3 h-3 shrink-0" />
            <span>Bảo trì định kỳ</span>
          </span>
        );
      case 'REPAIR':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-amber-500/10 text-amber-400 border-amber-500/30 inline-flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Sửa chữa sự cố</span>
          </span>
        );
      case 'LOST':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-rose-500/10 text-rose-400 border-rose-500/30 inline-flex items-center space-x-1">
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span>Báo mất thiết bị</span>
          </span>
        );
      case 'DISPOSAL':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-purple-500/10 text-purple-400 border-purple-500/30 inline-flex items-center space-x-1">
            <Archive className="w-3 h-3 shrink-0" />
            <span>Thanh lý / Hủy</span>
          </span>
        );
      default:
        return <span className="text-white text-xs">{t}</span>;
    }
  };

  // Render Badge Trạng thái
  const renderStatusBadge = (st: string) => {
    switch (st) {
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center space-x-1 text-amber-400 font-bold text-[11px]">
            <Clock className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            <span>Đang xử lý</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 text-emerald-400 font-bold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Đã hoàn tất</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1 text-studio-muted font-bold text-[11px]">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return <span className="text-white text-xs">{st}</span>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Bảo trì, Sửa chữa &amp; Thanh lý Thiết bị
            </h1>
            <p className="text-studio-muted text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              Theo dõi lịch sử bảo trì định kỳ, sửa chữa theo hóa đơn chứng từ, quản lý báo mất và thanh lý tài sản đúng quy định, bảo toàn lịch sử trọn đời.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/equipment"
              className="flex items-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Danh mục Thiết bị</span>
            </Link>

            <button
              onClick={() => {
                fetchMaintenances();
                fetchStats();
              }}
              disabled={loading}
              className="flex items-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="flex items-center space-x-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-brand-primary/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Lập phiếu mới</span>
            </button>
          </div>
        </div>

        {/* KPI Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-studio-card/80 border border-white/10 rounded-2xl p-4.5 backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-studio-muted">Tổng chi phí sửa chữa</span>
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-emerald-400 mt-2">
              {stats ? formatVND(stats.totalCost) : '---'}
            </div>
            <div className="text-[11px] text-studio-muted mt-1">Hóa đơn chứng từ đã hạch toán</div>
          </div>

          <div className="bg-studio-card/80 border border-white/10 rounded-2xl p-4.5 backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-studio-muted">Đang bảo trì / Sửa</span>
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Wrench className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-amber-400 mt-2">
              {stats ? stats.inProgressCount.toLocaleString() : '---'}
            </div>
            <div className="text-[11px] text-amber-400/80 mt-1">Thiết bị đang gửi sửa/bảo dưỡng</div>
          </div>

          <div className="bg-studio-card/80 border border-white/10 rounded-2xl p-4.5 backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-studio-muted">Đã thanh lý / Tiêu hủy</span>
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Archive className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-purple-400 mt-2">
              {stats ? stats.byType.disposal.toLocaleString() : '---'}
            </div>
            <div className="text-[11px] text-studio-muted mt-1">Đã có quyết định thanh lý tài sản</div>
          </div>

          <div className="bg-studio-card/80 border border-white/10 rounded-2xl p-4.5 backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-studio-muted">Báo mất thiết bị</span>
              <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-rose-400 mt-2">
              {stats ? stats.byType.lost.toLocaleString() : '---'}
            </div>
            <div className="text-[11px] text-rose-400/80 mt-1">Biên bản thất lạc cần xử lý</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-studio-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Filter className="w-4 h-4 text-brand-primary" />
              <span>Bộ lọc tra cứu hồ sơ chứng từ</span>
            </div>
            {(search || typeFilter !== 'ALL' || statusFilter !== 'ALL' || equipmentFilter !== 'ALL' || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearch('');
                  setTypeFilter('ALL');
                  setStatusFilter('ALL');
                  setEquipmentFilter('ALL');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                className="text-xs text-brand-primary hover:underline font-semibold cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-studio-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên máy, mã thiết bị, số hóa đơn, đơn vị sửa..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-studio-dark/70 border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-studio-muted focus:outline-none focus:border-brand-primary transition-all"
              />
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-studio-dark/70 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-studio-card text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-studio-dark/70 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary transition-all cursor-pointer"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-studio-card text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 border-t border-white/5">
            {/* Filter by Equipment */}
            <div>
              <label className="text-[11px] text-studio-muted block mb-1">Thiết bị cụ thể:</label>
              <select
                value={equipmentFilter}
                onChange={(e) => {
                  setEquipmentFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-studio-dark/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary cursor-pointer"
              >
                <option value="ALL" className="bg-studio-card text-white">
                  Tất cả thiết bị
                </option>
                {equipmentsList.map((eq) => (
                  <option key={eq.id} value={eq.id} className="bg-studio-card text-white">
                    [{eq.code}] {eq.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-[11px] text-studio-muted block mb-1">Từ ngày:</label>
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
              <label className="text-[11px] text-studio-muted block mb-1">Đến ngày:</label>
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
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-studio-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="text-xs font-semibold text-studio-muted">
              Hiển thị <span className="text-white font-bold">{records.length}</span> trên tổng số <span className="text-white font-bold">{totalCount}</span> hồ sơ
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-studio-muted">
              <span>Trang {page} / {totalPages}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-bold text-studio-muted uppercase tracking-wider">
                  <th className="py-3.5 px-4">Thiết bị</th>
                  <th className="py-3.5 px-4">Loại phiếu</th>
                  <th className="py-3.5 px-4">Tiêu đề &amp; Mô tả</th>
                  <th className="py-3.5 px-4">Hóa đơn chứng từ</th>
                  <th className="py-3.5 px-4">Chi phí</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-white/90">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-studio-muted">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-brand-primary" />
                        <span>Đang tải danh sách bảo trì &amp; sửa chữa...</span>
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-studio-muted">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertTriangle className="w-8 h-8 text-studio-muted/50" />
                        <span className="font-semibold text-white">Chưa có hồ sơ bảo trì, sửa chữa hoặc thanh lý nào</span>
                        <span className="text-[11px] max-w-sm text-studio-muted">
                          Nhấn nút "+ Lập phiếu mới" ở trên để ghi nhận bảo trì, hóa đơn sửa chữa, báo mất hoặc thanh lý tài sản.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                      onClick={() => setSelectedRecord(rec)}
                    >
                      {/* Thiết bị */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {rec.equipment?.imageUrl ? (
                              <img src={rec.equipment.imageUrl} alt={rec.equipment.name} className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-4 h-4 text-studio-muted" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-xs truncate max-w-[170px]" title={rec.equipment?.name}>
                              {rec.equipment?.name || 'Thiết bị'}
                            </div>
                            <div className="font-mono text-[10px] text-brand-primary">
                              {rec.equipment?.code}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Loại phiếu */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderTypeBadge(rec.type)}
                      </td>

                      {/* Tiêu đề & Mô tả */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-white text-xs truncate" title={rec.title}>
                          {rec.title}
                        </div>
                        {rec.description && (
                          <div className="text-[11px] text-studio-muted truncate max-w-xs" title={rec.description}>
                            {rec.description}
                          </div>
                        )}
                        {rec.serviceProvider && (
                          <div className="text-[10px] text-brand-primary/80 mt-0.5 flex items-center space-x-1">
                            <Building className="w-3 h-3 shrink-0" />
                            <span className="truncate">{rec.serviceProvider}</span>
                          </div>
                        )}
                      </td>

                      {/* Hóa đơn chứng từ */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {rec.invoiceNumber ? (
                          <div className="space-y-0.5">
                            <div className="font-mono text-[11px] font-bold text-cyan-400">
                              {rec.invoiceNumber}
                            </div>
                            {rec.invoiceDate && (
                              <div className="text-[10px] text-studio-muted">
                                Ngày: {formatDateVN(rec.invoiceDate)}
                              </div>
                            )}
                            {rec.invoiceUrl && (
                              <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-400 hover:underline">
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>Có file đính kèm</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-studio-muted italic">Chưa có HĐ</span>
                        )}
                      </td>

                      {/* Chi phí */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-xs text-white">
                        {rec.cost > 0 ? (
                          <span className="text-emerald-400">{formatVND(rec.cost)}</span>
                        ) : (
                          <span className="text-studio-muted">0 đ</span>
                        )}
                      </td>

                      {/* Thời gian */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px]">
                        <div className="flex items-center space-x-1 text-white/90">
                          <Calendar className="w-3 h-3 text-studio-muted shrink-0" />
                          <span>{formatDateVN(rec.startDate)}</span>
                        </div>
                        {rec.endDate && (
                          <div className="text-[10px] text-emerald-400 mt-0.5">
                            Xong: {formatDateVN(rec.endDate)}
                          </div>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {renderStatusBadge(rec.status)}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Nghiệm thu nhanh nếu đang xử lý */}
                          {rec.status === 'IN_PROGRESS' && (
                            <button
                              type="button"
                              onClick={() => setCompleteConfirmModal(rec)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                              title="Nghiệm thu hoàn tất"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedRecord(rec)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-studio-muted hover:text-white transition-all cursor-pointer"
                            title="Xem chi tiết & Hóa đơn"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rec)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-studio-muted hover:text-white transition-all cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingRecord(rec)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                            title="Xóa hồ sơ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="p-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-studio-muted">
              Đang xem dòng {(page - 1) * limit + 1} - {Math.min(page * limit, totalCount)} trong tổng số {totalCount}
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Trước
              </button>

              <span className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 font-bold text-white">
                {page} / {totalPages || 1}
              </span>

              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Tiếp theo
              </button>
            </div>
          </div>
        </div>

        {/* Modal Lập / Sửa phiếu */}
        {formModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-studio-card border border-white/15 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {editingId ? 'Chỉnh sửa Hồ sơ Bảo trì / Sửa chữa' : 'Lập Phiếu Bảo trì / Sửa chữa / Báo mất / Thanh lý'}
                    </h3>
                    <p className="text-xs text-studio-muted">
                      Theo dõi chứng từ hóa đơn, quản lý chi phí và cập nhật trạng thái thiết bị
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-studio-muted hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmitForm} className="py-4 space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                {/* Chọn thiết bị & Loại phiếu */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-studio-muted block mb-1">
                      Thiết bị áp dụng <span className="text-rose-400">*</span>:
                    </label>
                    <select
                      value={equipmentId}
                      onChange={(e) => setEquipmentId(e.target.value)}
                      required
                      className="w-full bg-studio-dark/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary cursor-pointer"
                    >
                      <option value="" disabled className="bg-studio-card text-white">-- Chọn thiết bị --</option>
                      {equipmentsList.map((eq) => (
                        <option key={eq.id} value={eq.id} className="bg-studio-card text-white">
                          [{eq.code}] {eq.name} ({eq.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-studio-muted block mb-1">
                      Loại hồ sơ nghiệp vụ <span className="text-rose-400">*</span>:
                    </label>
                    <select
                      value={type}
                      onChange={(e: any) => setType(e.target.value)}
                      required
                      className="w-full bg-studio-dark/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary cursor-pointer"
                    >
                      <option value="MAINTENANCE" className="bg-studio-card text-white">Bảo trì định kỳ</option>
                      <option value="REPAIR" className="bg-studio-card text-white">Sửa chữa sự cố</option>
                      <option value="LOST" className="bg-studio-card text-white">Báo mất thiết bị</option>
                      <option value="DISPOSAL" className="bg-studio-card text-white">Thanh lý / Tiêu hủy</option>
                    </select>
                  </div>
                </div>

                {/* Tiêu đề phiếu */}
                <div>
                  <label className="text-[11px] font-bold text-studio-muted block mb-1">
                    Tiêu đề hồ sơ / Tóm tắt sự việc <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Thay thế cáp màn hình Sony A7S III hoặc Thanh lý chân máy cũ"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-studio-dark/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-studio-muted focus:outline-none focus:border-brand-primary"
                  />
                </div>

                {/* Mô tả chi tiết */}
                <div>
                  <label className="text-[11px] font-bold text-studio-muted block mb-1">
                    Mô tả nguyên nhân / Tình trạng hỏng hóc / Phương án xử lý:
                  </label>
                  <textarea
                    rows={2.5}
                    placeholder="Mô tả cụ thể linh kiện thay thế, lỗi phát sinh hoặc lý do thanh lý/báo mất..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-studio-dark/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-studio-muted focus:outline-none focus:border-brand-primary"
                  />
                </div>

                {/* Đơn vị thực hiện & Chi phí */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-studio-muted block mb-1">
                      Đơn vị sửa chữa / Tiếp nhận:
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Trung tâm bảo hành Sony Việt Nam..."
                      value={serviceProvider}
                      onChange={(e) => setServiceProvider(e.target.value)}
                      className="w-full bg-studio-dark/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-studio-muted block mb-1">
                      Chi phí sửa chữa / Giá trị thanh lý (VNĐ):
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="w-full bg-studio-dark/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>

                {/* Số hóa đơn & Ngày hóa đơn */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-studio-muted block mb-1">
                      Số hóa đơn VAT / Mã chứng từ kế toán:
                    </label>
                    <input
                      type="text"
                      placeholder="VD: HD-SONY-2026-9812..."
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full bg-studio-dark/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-studio-muted block mb-1">
                      Ngày xuất hóa đơn / Ngày lập chứng từ:
                    </label>
                    <DatePickerVN
                      value={invoiceDate}
                      onChange={setInvoiceDate}
                      clearable
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Upload File / Ảnh hóa đơn chứng từ */}
                <div>
                  <label className="text-[11px] font-bold text-studio-muted block mb-1">
                    Ảnh chụp hóa đơn / Biên bản bàn giao tài sản:
                  </label>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5 text-brand-primary" />
                      <span>{uploadingInvoice ? 'Đang tải tệp...' : 'Tải lên hóa đơn'}</span>
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleInvoiceUpload} disabled={uploadingInvoice} />
                    </label>
                    {invoiceUrl && (
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-emerald-400 font-semibold truncate max-w-[200px]">
                          ✓ Đã đính kèm chứng từ
                        </span>
                        <a href={invoiceUrl} target="_blank" rel="noreferrer" className="text-brand-primary hover:underline text-[11px]">
                          (Xem)
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ngày bắt đầu, Ngày kết thúc & Trạng thái */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-studio-muted block mb-1">
                      Ngày bắt đầu:
                    </label>
                    <DatePickerVN
                      value={formStartDate}
                      onChange={setFormStartDate}
                      required
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-studio-muted block mb-1">
                      Ngày hoàn thành (nếu có):
                    </label>
                    <DatePickerVN
                      value={formEndDate}
                      onChange={setFormEndDate}
                      clearable
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-studio-muted block mb-1">
                      Trạng thái xử lý:
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e: any) => setFormStatus(e.target.value)}
                      className="w-full bg-studio-dark/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary cursor-pointer"
                    >
                      <option value="IN_PROGRESS" className="bg-studio-card text-white">Đang xử lý</option>
                      <option value="COMPLETED" className="bg-studio-card text-white">Đã hoàn thành</option>
                      <option value="CANCELLED" className="bg-studio-card text-white">Đã hủy bỏ</option>
                    </select>
                  </div>
                </div>

                {/* Ghi chú */}
                <div>
                  <label className="text-[11px] font-bold text-studio-muted block mb-1">Ghi chú nội bộ:</label>
                  <input
                    type="text"
                    placeholder="Ghi chú thêm về chế độ bảo hành linh kiện, quy định nghiệm thu..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-studio-dark/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-white/10 flex justify-end space-x-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFormModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting || uploadingInvoice}
                    className="py-2.5 px-5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all cursor-pointer shadow-lg shadow-brand-primary/20 disabled:opacity-50"
                  >
                    {formSubmitting ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo hồ sơ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Xem chi tiết & Hóa đơn chứng từ */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-studio-card border border-white/15 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Hồ sơ Bảo trì / Sửa chữa &amp; Chứng từ
                    </h3>
                    <p className="text-xs text-studio-muted font-mono">
                      Mã hồ sơ: {selectedRecord.id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-studio-muted hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="py-4 space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                {/* Thông tin thiết bị */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {selectedRecord.equipment?.imageUrl ? (
                        <img src={selectedRecord.equipment.imageUrl} alt={selectedRecord.equipment.name} className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-studio-muted" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">
                        {selectedRecord.equipment?.name}
                      </div>
                      <div className="font-mono text-brand-primary text-xs">
                        Mã thiết bị: {selectedRecord.equipment?.code}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-studio-muted block">Trạng thái hiện tại:</span>
                    <span className="font-bold text-white mt-0.5 block">{selectedRecord.equipment?.status}</span>
                  </div>
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div>
                    <span className="text-studio-muted block text-[11px]">Loại hồ sơ:</span>
                    <div className="mt-1">{renderTypeBadge(selectedRecord.type)}</div>
                  </div>
                  <div>
                    <span className="text-studio-muted block text-[11px]">Trạng thái:</span>
                    <div className="mt-1">{renderStatusBadge(selectedRecord.status)}</div>
                  </div>
                  <div>
                    <span className="text-studio-muted block text-[11px]">Chi phí hạch toán:</span>
                    <strong className="text-emerald-400 text-sm mt-0.5 block font-mono">
                      {formatVND(selectedRecord.cost)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-studio-muted block text-[11px]">Số hóa đơn / Chứng từ:</span>
                    <span className="font-mono text-cyan-400 font-bold block mt-1">
                      {selectedRecord.invoiceNumber || 'Chưa lập HĐ'}
                    </span>
                  </div>
                  <div>
                    <span className="text-studio-muted block text-[11px]">Ngày hóa đơn:</span>
                    <span className="text-white block mt-1">
                      {formatDateVN(selectedRecord.invoiceDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-studio-muted block text-[11px]">Đơn vị sửa chữa / tiếp nhận:</span>
                    <span className="text-white block mt-1 font-semibold truncate">
                      {selectedRecord.serviceProvider || '---'}
                    </span>
                  </div>
                  <div>
                    <span className="text-studio-muted block text-[11px]">Ngày bắt đầu:</span>
                    <span className="text-white block mt-1">
                      {formatDateVN(selectedRecord.startDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-studio-muted block text-[11px]">Ngày hoàn tất:</span>
                    <span className="text-white block mt-1">
                      {formatDateVN(selectedRecord.endDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-studio-muted block text-[11px]">Người lập phiếu:</span>
                    <span className="text-white block mt-1 truncate">
                      {selectedRecord.creator ? selectedRecord.creator.fullName : 'Quản trị viên'}
                    </span>
                  </div>
                </div>

                {/* Tiêu đề & Diễn giải */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  <span className="text-[11px] font-bold text-studio-muted uppercase tracking-wider block">
                    Tiêu đề &amp; Nội dung sự việc
                  </span>
                  <div className="font-bold text-white text-sm">
                    {selectedRecord.title}
                  </div>
                  {selectedRecord.description && (
                    <p className="text-white/85 text-xs leading-relaxed mt-1">
                      {selectedRecord.description}
                    </p>
                  )}
                  {selectedRecord.notes && (
                    <div className="pt-2 border-t border-white/5 text-[11px] text-studio-muted italic">
                      Ghi chú: {selectedRecord.notes}
                    </div>
                  )}
                </div>

                {/* Hóa đơn đính kèm */}
                {selectedRecord.invoiceUrl && (
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                    <span className="text-[11px] font-bold text-studio-muted uppercase tracking-wider flex items-center justify-between">
                      <span>Chứng từ / Hóa đơn đính kèm</span>
                      <a
                        href={selectedRecord.invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-primary hover:underline text-xs flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Mở toàn màn hình</span>
                      </a>
                    </span>
                    <div className="rounded-xl overflow-hidden border border-white/10 max-h-60 flex items-center justify-center bg-black/40">
                      <img
                        src={selectedRecord.invoiceUrl}
                        alt="Hóa đơn chứng từ"
                        className="max-h-60 w-auto object-contain hover:scale-105 transition-transform"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
                <div>
                  {selectedRecord.status === 'IN_PROGRESS' && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompleteConfirmModal(selectedRecord);
                        setSelectedRecord(null);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold border border-emerald-500/30 transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Nghiệm thu hoàn tất</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xác nhận Nghiệm thu hoàn tất */}
        {completeConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-studio-card border border-white/15 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Nghiệm thu hoàn tất</h3>
                  <p className="text-xs text-studio-muted">Xác nhận tiếp nhận lại thiết bị Studio</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-white/90 space-y-1.5 mb-5">
                <div>
                  Thiết bị: <strong className="text-white">[{completeConfirmModal.equipment?.code}] {completeConfirmModal.equipment?.name}</strong>
                </div>
                <div>
                  Nội dung sửa: <span className="text-studio-muted">{completeConfirmModal.title}</span>
                </div>
                <p className="text-[11px] text-emerald-400/90 pt-1 border-t border-white/5">
                  ✓ Sau khi xác nhận, thiết bị sẽ tự động được khôi phục về trạng thái <strong>Sẵn sàng (AVAILABLE)</strong> để phục vụ hoạt động Studio.
                </p>
              </div>

              <div className="flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setCompleteConfirmModal(null)}
                  disabled={completeSubmitting}
                  className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmComplete}
                  disabled={completeSubmitting}
                  className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {completeSubmitting ? 'Đang cập nhật...' : 'Xác nhận Nghiệm thu'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xác nhận Xóa */}
        {deletingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-studio-card border border-white/15 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Xác nhận xóa hồ sơ</h3>
                  <p className="text-xs text-studio-muted">Hành động này không thể hoàn tác</p>
                </div>
              </div>

              <p className="text-xs text-white/90 mb-5 leading-relaxed">
                Bạn có chắc chắn muốn xóa phiếu <strong className="text-white">"{deletingRecord.title}"</strong> của thiết bị <strong className="text-white">[{deletingRecord.equipment?.code}]</strong>?
              </p>

              <div className="flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setDeletingRecord(null)}
                  disabled={deleteSubmitting}
                  className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteSubmitting}
                  className="py-2.5 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-all cursor-pointer shadow-lg shadow-rose-500/20 disabled:opacity-50"
                >
                  {deleteSubmitting ? 'Đang xóa...' : 'Xác nhận Xóa'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
