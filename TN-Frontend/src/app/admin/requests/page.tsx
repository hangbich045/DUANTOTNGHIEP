'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Loader2, Check, X, Undo, Camera, Calendar, Clock, RefreshCcw, User, Eye, AlertTriangle, Send, PackageCheck, Wrench, ShieldAlert } from 'lucide-react';

interface EquipmentItem {
  equipmentId: string;
  quantity: number;
  details?: {
    name: string;
    code: string;
    category: string;
    image: string;
  };
}

interface BorrowRequest {
  id: string;
  userId: string;
  purpose: string;
  borrowDate: string;
  returnDate: string;
  actualReturnDate?: string;
  status: 'PENDING' | 'APPROVED' | 'HANDED_OVER' | 'OVERDUE' | 'REJECTED' | 'RETURNED';
  rejectReason?: string;
  handedOverAt?: string;
  handoverCondition?: string;
  returnCondition?: string;
  adminNote?: string;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
    employeeCode: string;
  };
  equipments: EquipmentItem[];
}

interface StudioBooking {
  id: string;
  userId: string;
  fullName: string;
  participants: number;
  purpose: string;
  technicalSupport: boolean;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectReason?: string;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
    employeeCode: string;
  };
}

export default function AdminRequestsPage() {
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'studio' | 'equipment'>('studio');
  const [borrows, setBorrows] = useState<BorrowRequest[]>([]);
  const [bookings, setBookings] = useState<StudioBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Detail Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState<StudioBooking | null>(null);
  const [selectedBorrow, setSelectedBorrow] = useState<BorrowRequest | null>(null);

  // Reject Dialog states
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNote, setAdminNote] = useState('');

  // Handover Dialog states
  const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);
  const [selectedBorrowHandover, setSelectedBorrowHandover] = useState<BorrowRequest | null>(null);
  const [handoverCondition, setHandoverCondition] = useState('');
  const [handoverAdminNote, setHandoverAdminNote] = useState('');

  // Return Dialog states
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedBorrowReturn, setSelectedBorrowReturn] = useState<BorrowRequest | null>(null);
  const [returnCondition, setReturnCondition] = useState('');
  const [isDamaged, setIsDamaged] = useState(false);
  const [returnAdminNote, setReturnAdminNote] = useState('');

  // Overlap Warning Dialog states (Studio Booking)
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [warningTargetId, setWarningTargetId] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      if (activeTab === 'studio') {
        const data = await api.get('/studio-bookings');
        setBookings(data);
      } else {
        const data = await api.get('/borrow-requests');
        setBorrows(data);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi tải danh sách yêu cầu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openStudioDetail = (booking: StudioBooking) => {
    setSelectedStudio(booking);
    setSelectedBorrow(null);
    setAdminNote('');
    setDetailModalOpen(true);
  };

  const openBorrowDetail = (borrow: BorrowRequest) => {
    setSelectedBorrow(borrow);
    setSelectedStudio(null);
    setAdminNote('');
    setDetailModalOpen(true);
  };

  // Studio Booking Approvals
  const handleApproveStudio = async (id: string, force = false) => {
    setDetailModalOpen(false);
    setActioningId(id);
    try {
      const res = await api.put(`/studio-bookings/${id}/approve`, { force, adminNote: adminNote.trim() || undefined });
      
      if (res.status === 'warning') {
        // Show overlap warning dialog
        setWarningTargetId(id);
        setWarningMessage(res.message);
        setWarningDialogOpen(true);
      } else {
        toast('Phê duyệt lịch đặt phòng studio thành công', 'success');
        setWarningDialogOpen(false);
        setWarningTargetId(null);
        fetchRequests();
      }
    } catch (err: any) {
      toast(err.message || 'Phê duyệt thất bại', 'error');
    } finally {
      setActioningId(null);
    }
  };

  // Equipment Borrow Approvals
  const handleApproveBorrow = async (id: string) => {
    setDetailModalOpen(false);
    setActioningId(id);
    try {
      await api.put(`/borrow-requests/${id}/approve`, { adminNote: adminNote.trim() || undefined });
      toast('Phê duyệt yêu cầu mượn thiết bị thành công', 'success');
      fetchRequests();
    } catch (err: any) {
      toast(err.message || 'Phê duyệt thất bại', 'error');
    } finally {
      setActioningId(null);
    }
  };

  // Trigger Reject reason input modal
  const triggerRejectDialog = (id: string) => {
    setDetailModalOpen(false);
    setRejectTargetId(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const submitReject = async () => {
    if (!rejectTargetId || !rejectReason.trim()) {
      toast('Vui lòng điền lý do từ chối', 'warning');
      return;
    }

    setActioningId(rejectTargetId);
    try {
      const endpoint = activeTab === 'studio' ? `/studio-bookings/${rejectTargetId}/reject` : `/borrow-requests/${rejectTargetId}/reject`;
      await api.put(endpoint, { rejectReason: rejectReason.trim(), adminNote: adminNote.trim() || undefined });
      
      toast('Đã từ chối yêu cầu thành công', 'success');
      setRejectDialogOpen(false);
      setRejectTargetId(null);
      setRejectReason('');
      setAdminNote('');
      fetchRequests();
    } catch (err: any) {
      toast(err.message || 'Thao tác thất bại', 'error');
    } finally {
      setActioningId(null);
    }
  };

  // Handover actions
  const openHandoverModal = (borrow: BorrowRequest) => {
    setDetailModalOpen(false);
    setSelectedBorrowHandover(borrow);
    setHandoverCondition('Thiết bị hoạt động bình thường, đầy đủ phụ kiện bàn giao.');
    setHandoverAdminNote(borrow.adminNote || '');
    setHandoverDialogOpen(true);
  };

  const submitHandover = async () => {
    if (!selectedBorrowHandover) return;
    setActioningId(selectedBorrowHandover.id);
    try {
      await api.put(`/borrow-requests/${selectedBorrowHandover.id}/handover`, {
        handoverCondition: handoverCondition.trim() || undefined,
        adminNote: handoverAdminNote.trim() || undefined,
      });
      toast('Đã bàn giao thiết bị thành công cho người mượn', 'success');
      setHandoverDialogOpen(false);
      setSelectedBorrowHandover(null);
      setHandoverCondition('');
      setHandoverAdminNote('');
      fetchRequests();
    } catch (err: any) {
      toast(err.message || 'Bàn giao thiết bị thất bại', 'error');
    } finally {
      setActioningId(null);
    }
  };

  // Return actions
  const openReturnModal = (borrow: BorrowRequest) => {
    setDetailModalOpen(false);
    setSelectedBorrowReturn(borrow);
    setReturnCondition('Đã kiểm tra và nhận lại thiết bị đầy đủ.');
    setIsDamaged(false);
    setReturnAdminNote(borrow.adminNote || '');
    setReturnDialogOpen(true);
  };

  const submitReturn = async () => {
    if (!selectedBorrowReturn) return;
    setActioningId(selectedBorrowReturn.id);
    try {
      await api.put(`/borrow-requests/${selectedBorrowReturn.id}/return`, {
        returnCondition: returnCondition.trim() || undefined,
        isDamaged,
        adminNote: returnAdminNote.trim() || undefined,
      });
      toast(
        isDamaged
          ? 'Đã nhận trả thiết bị (Ghi nhận hư hỏng -> Chuyển sang bảo trì)'
          : 'Đã nhận hoàn trả thiết bị thành công và cập nhật lại kho khả dụng',
        'success'
      );
      setReturnDialogOpen(false);
      setSelectedBorrowReturn(null);
      setReturnCondition('');
      setIsDamaged(false);
      setReturnAdminNote('');
      fetchRequests();
    } catch (err: any) {
      toast(err.message || 'Thu hồi thiết bị thất bại', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'PENDING':
        return <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-brand-accent/20 text-brand-accent border border-brand-accent/30">Chờ duyệt</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-brand-success/20 text-brand-success border border-brand-success/30">Đã duyệt (Chờ giao)</span>;
      case 'HANDED_OVER':
        return <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/35">Đang mượn</span>;
      case 'OVERDUE':
        return <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-red-600/30 text-red-400 border border-red-500/50 animate-pulse font-extrabold flex items-center justify-center space-x-1"><AlertTriangle className="w-3 h-3 shrink-0" /><span>Quá hạn</span></span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-brand-error/20 text-brand-error border border-brand-error/30">Từ chối</span>;
      case 'RETURNED':
        return <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-white/10 text-studio-muted border border-white/10">Đã trả</span>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 text-left">
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Phê Duyệt Yêu Cầu</h1>
            <p className="text-sm text-studio-muted mt-1">Xem thông tin chi tiết và phê duyệt lịch đặt phòng Studio hoặc mượn thiết bị.</p>
          </div>
          <button
            onClick={fetchRequests}
            className="p-3 rounded-2xl border border-white/5 hover:bg-white/5 text-studio-muted hover:text-white transition-all cursor-pointer"
            title="Làm mới"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex space-x-4 border-b border-white/5 pb-0.5">
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center space-x-2 pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === 'studio'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-studio-muted hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Yêu cầu đặt Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('equipment')}
            className={`flex items-center space-x-2 pb-4 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === 'equipment'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-studio-muted hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Yêu cầu mượn thiết bị</span>
          </button>
        </div>

        {/* List content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : activeTab === 'studio' ? (
          bookings.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
              <p className="text-studio-muted">Không có yêu cầu đặt lịch Studio nào.</p>
            </div>
          ) : (
            <div className="glass-panel overflow-hidden rounded-3xl border border-white/5 shadow-xl bg-black/25">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-studio-muted font-semibold bg-white/2">
                      <th className="py-4 px-6 text-left">Người đăng ký</th>
                      <th className="py-4 px-6 text-left">Thời gian đặt</th>
                      <th className="py-4 px-6 text-left">Mục đích</th>
                      <th className="py-4 px-6 text-center">Trạng thái</th>
                      <th className="py-4 px-6 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-white/2 transition-colors">
                        <td className="py-4 px-6 text-left">
                          <div className="font-bold text-white">{booking.fullName}</div>
                          <div className="text-xs text-studio-muted mt-0.5">{booking.user.employeeCode}</div>
                        </td>
                        <td className="py-4 px-6 text-left font-medium text-white">
                          <span className="block">
                            {format(new Date(booking.startTime), 'HH:mm')} - {format(new Date(booking.endTime), 'HH:mm')}
                          </span>
                          <span className="text-xs text-studio-muted font-normal block mt-0.5">
                            {format(new Date(booking.startTime), 'dd/MM/yyyy')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-left text-white max-w-xs truncate">{booking.purpose}</td>
                        <td className="py-4 px-6 text-center">{getStatusBadge(booking.status)}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => openStudioDetail(booking)}
                              className="flex items-center space-x-1.5 py-1.5 px-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem xét</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          borrows.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
              <p className="text-studio-muted">Không có yêu cầu mượn thiết bị nào.</p>
            </div>
          ) : (
            <div className="glass-panel overflow-hidden rounded-3xl border border-white/5 shadow-xl bg-black/25">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-studio-muted font-semibold bg-white/2">
                      <th className="py-4 px-6 text-left">Người đăng ký</th>
                      <th className="py-4 px-6 text-left">Thời gian mượn</th>
                      <th className="py-4 px-6 text-left">Số lượng thiết bị</th>
                      <th className="py-4 px-6 text-center">Trạng thái</th>
                      <th className="py-4 px-6 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {borrows.map((borrow) => (
                      <tr key={borrow.id} className="hover:bg-white/2 transition-colors">
                        <td className="py-4 px-6 text-left">
                          <div className="font-bold text-white">{borrow.user.fullName}</div>
                          <div className="text-xs text-studio-muted mt-0.5">{borrow.user.employeeCode}</div>
                        </td>
                        <td className="py-4 px-6 text-left font-medium text-white">
                          <span className="block">
                            {format(new Date(borrow.borrowDate), 'dd/MM/yyyy')}
                          </span>
                          <span className="text-xs text-studio-muted font-normal block mt-0.5">
                            đến {format(new Date(borrow.returnDate), 'dd/MM/yyyy')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-left text-white font-semibold">
                          {borrow.equipments.reduce((acc, eq) => acc + eq.quantity, 0)} thiết bị
                        </td>
                        <td className="py-4 px-6 text-center">{getStatusBadge(borrow.status)}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center space-x-2">
                            {borrow.status === 'PENDING' && (
                              <button
                                onClick={() => openBorrowDetail(borrow)}
                                className="flex items-center space-x-1.5 py-1.5 px-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem xét</span>
                              </button>
                            )}

                            {borrow.status === 'APPROVED' && (
                              <>
                                <button
                                  onClick={() => openHandoverModal(borrow)}
                                  className="flex items-center space-x-1.5 py-1.5 px-3 rounded-lg border border-purple-500/30 bg-purple-600/20 text-purple-300 text-xs font-bold hover:bg-purple-600 hover:text-white transition-all cursor-pointer shadow-sm"
                                  title="Lập biên bản và bàn giao thiết bị"
                                >
                                  <PackageCheck className="w-3.5 h-3.5" />
                                  <span>Bàn giao</span>
                                </button>
                                <button
                                  onClick={() => openBorrowDetail(borrow)}
                                  className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-studio-muted hover:text-white text-xs cursor-pointer"
                                  title="Xem chi tiết"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {(borrow.status === 'HANDED_OVER' || borrow.status === 'OVERDUE') && (
                              <>
                                <button
                                  onClick={() => openReturnModal(borrow)}
                                  className="flex items-center space-x-1 py-1.5 px-3 rounded-lg border border-brand-primary/20 bg-brand-primary/10 text-brand-primary text-xs font-bold hover:bg-brand-primary hover:text-white transition-all cursor-pointer"
                                  title="Kiểm tra và nhận hoàn trả thiết bị"
                                >
                                  <Undo className="w-3.5 h-3.5" />
                                  <span>Nhận trả</span>
                                </button>
                                <button
                                  onClick={() => openBorrowDetail(borrow)}
                                  className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-studio-muted hover:text-white text-xs cursor-pointer"
                                  title="Xem chi tiết"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {(borrow.status === 'RETURNED' || borrow.status === 'REJECTED') && (
                              <button
                                onClick={() => openBorrowDetail(borrow)}
                                className="flex items-center space-x-1.5 py-1.5 px-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-studio-muted hover:text-white text-xs font-medium cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Chi tiết</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* Detailed Review Modal (Approve/Reject confirmation) */}
        {detailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setDetailModalOpen(false)} />

            <div className="glass-panel max-w-lg w-full rounded-[32px] border border-white/5 overflow-hidden shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
                <h3 className="text-lg font-bold text-white">Chi tiết yêu cầu duyệt</h3>
                <button onClick={() => setDetailModalOpen(false)} className="p-2 rounded-xl text-studio-muted hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 text-left max-h-[70vh] overflow-y-auto">
                {/* 1. Studio Booking Preview */}
                {selectedStudio && (
                  <div className="space-y-4">
                    {/* User profile */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-studio-muted font-bold uppercase">Họ và Tên</span>
                        <div className="text-sm font-semibold text-white mt-0.5">{selectedStudio.fullName}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-studio-muted font-bold uppercase">Mã NV / SV</span>
                        <div className="text-sm font-semibold text-white mt-0.5">{selectedStudio.user.employeeCode}</div>
                      </div>
                    </div>

                    {/* Time Frame */}
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                      <span className="text-[10px] text-brand-primary font-bold uppercase">Thời gian sử dụng</span>
                      <div className="text-sm text-white font-medium flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-studio-muted" />
                        <span>
                          {format(new Date(selectedStudio.startTime), 'HH:mm')} - {format(new Date(selectedStudio.endTime), 'HH:mm')} • {format(new Date(selectedStudio.startTime), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* Meta stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-studio-muted font-bold uppercase">Người tham gia</span>
                        <div className="text-sm font-bold text-white mt-0.5">{selectedStudio.participants} người</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-studio-muted font-bold uppercase">Hỗ trợ kỹ thuật</span>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {selectedStudio.technicalSupport ? 'Cần hỗ trợ' : 'Không cần'}
                        </div>
                      </div>
                    </div>

                    {/* Purpose */}
                    <div>
                      <span className="text-[10px] text-studio-muted font-bold uppercase">Mục đích sử dụng</span>
                      <p className="text-sm text-white bg-white/5 p-3.5 rounded-xl border border-white/5 mt-1 leading-relaxed break-words whitespace-pre-wrap">
                        {selectedStudio.purpose}
                      </p>
                    </div>

                    {/* Admin Note Input */}
                    {selectedStudio.status === 'PENDING' && (
                      <div className="space-y-1">
                        <label className="text-[10px] text-studio-muted font-bold uppercase block mb-1">Ghi chú / Nhận xét của Admin</label>
                        <textarea
                          placeholder="Nhập ghi chú hoặc nhận xét (ví dụ: Chấp nhận yêu cầu, Lý do từ chối...)"
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          className="w-full bg-black/35 border border-white/5 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 h-16 resize-none"
                        />
                      </div>
                    )}

                    {/* Actions footer */}
                    {selectedStudio.status === 'PENDING' && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <button
                          onClick={() => triggerRejectDialog(selectedStudio.id)}
                          className="py-3 px-4 rounded-xl border border-brand-error/20 bg-brand-error/5 text-brand-error hover:bg-brand-error/10 font-bold transition-all cursor-pointer text-center"
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={() => handleApproveStudio(selectedStudio.id)}
                          className="py-3 px-4 rounded-xl bg-brand-success hover:bg-brand-success/90 text-white font-bold transition-all cursor-pointer text-center"
                        >
                          Phê duyệt
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Equipment Borrow Preview */}
                {selectedBorrow && (
                  <div className="space-y-4">
                    {/* User profile */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-studio-muted font-bold uppercase">Họ và Tên</span>
                        <div className="text-sm font-semibold text-white mt-0.5">{selectedBorrow.user.fullName}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-studio-muted font-bold uppercase">Mã NV / SV</span>
                        <div className="text-sm font-semibold text-white mt-0.5">{selectedBorrow.user.employeeCode}</div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 grid grid-cols-2 gap-4">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-brand-primary font-bold uppercase">Ngày mượn</span>
                        <div className="text-xs text-white font-semibold">
                          {format(new Date(selectedBorrow.borrowDate), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-brand-primary font-bold uppercase">Ngày trả</span>
                        <div className="text-xs text-white font-semibold">
                          {format(new Date(selectedBorrow.returnDate), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    </div>

                    {/* Equipments Lists */}
                    <div>
                      <span className="text-[10px] text-studio-muted font-bold uppercase block mb-2">Danh sách thiết bị mượn</span>
                      <div className="space-y-2">
                        {selectedBorrow.equipments.map((eq) => (
                          <div
                            key={eq.equipmentId}
                            className="flex items-center space-x-3 p-2 bg-white/5 border border-white/5 rounded-xl text-sm text-white"
                          >
                            {eq.details?.image && (
                              <img src={eq.details.image} alt={eq.details.name} className="w-10 h-10 rounded-lg object-cover" />
                            )}
                            <div className="flex-1 text-left min-w-0">
                              <h5 className="font-bold truncate">{eq.details?.name || 'N/A'}</h5>
                            </div>
                            <div className="text-white font-extrabold bg-brand-primary/10 border border-brand-primary/10 px-2.5 py-0.5 rounded-lg text-xs">
                              Số lượng: {eq.quantity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Purpose */}
                    <div>
                      <span className="text-[10px] text-studio-muted font-bold uppercase">Mục đích sử dụng</span>
                      <p className="text-sm text-white bg-white/5 p-3.5 rounded-xl border border-white/5 mt-1 leading-relaxed break-words whitespace-pre-wrap">
                        {selectedBorrow.purpose}
                      </p>
                    </div>

                    {/* Handover metadata if exists */}
                    {(selectedBorrow.handedOverAt || selectedBorrow.handoverCondition) && (
                      <div className="p-3.5 bg-purple-500/10 border border-purple-500/25 rounded-2xl space-y-1">
                        <span className="text-[10px] text-purple-300 font-bold uppercase flex items-center space-x-1.5">
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Biên bản bàn giao thiết bị</span>
                        </span>
                        {selectedBorrow.handedOverAt && (
                          <div className="text-xs text-purple-200">
                            Thời gian bàn giao: {format(new Date(selectedBorrow.handedOverAt), 'HH:mm dd/MM/yyyy')}
                          </div>
                        )}
                        {selectedBorrow.handoverCondition && (
                          <p className="text-xs text-white/90 whitespace-pre-wrap mt-0.5">
                            Tình trạng lúc giao: {selectedBorrow.handoverCondition}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Return metadata if exists */}
                    {(selectedBorrow.actualReturnDate || selectedBorrow.returnCondition) && (
                      <div className="p-3.5 bg-brand-primary/10 border border-brand-primary/25 rounded-2xl space-y-1">
                        <span className="text-[10px] text-brand-primary font-bold uppercase flex items-center space-x-1.5">
                          <Undo className="w-3.5 h-3.5" />
                          <span>Biên bản nhận hoàn trả thiết bị</span>
                        </span>
                        {selectedBorrow.actualReturnDate && (
                          <div className="text-xs text-white/90">
                            Thời gian hoàn trả: {format(new Date(selectedBorrow.actualReturnDate), 'HH:mm dd/MM/yyyy')}
                          </div>
                        )}
                        {selectedBorrow.returnCondition && (
                          <p className="text-xs text-white/90 whitespace-pre-wrap mt-0.5">
                            Tình trạng lúc trả: {selectedBorrow.returnCondition}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Rejection reason if REJECTED */}
                    {selectedBorrow.status === 'REJECTED' && selectedBorrow.rejectReason && (
                      <div className="p-3.5 bg-brand-error/10 border border-brand-error/25 rounded-2xl space-y-1">
                        <span className="text-[10px] text-brand-error font-bold uppercase flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Lý do từ chối</span>
                        </span>
                        <p className="text-xs text-brand-error whitespace-pre-wrap mt-0.5">
                          {selectedBorrow.rejectReason}
                        </p>
                      </div>
                    )}

                    {/* Existing Admin Note display */}
                    {selectedBorrow.status !== 'PENDING' && selectedBorrow.adminNote && (
                      <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-1">
                        <span className="text-[10px] text-studio-muted font-bold uppercase block mb-0.5">Ghi chú của Quản trị viên</span>
                        <p className="text-xs text-white/90 whitespace-pre-wrap">{selectedBorrow.adminNote}</p>
                      </div>
                    )}

                    {/* Admin Note Input during PENDING */}
                    {selectedBorrow.status === 'PENDING' && (
                      <div className="space-y-1">
                        <label className="text-[10px] text-studio-muted font-bold uppercase block mb-1">Ghi chú / Nhận xét của Admin</label>
                        <textarea
                          placeholder="Nhập ghi chú hoặc nhận xét (ví dụ: Chấp nhận yêu cầu, Lưu ý người mượn...)"
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          className="w-full bg-black/35 border border-white/5 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 h-16 resize-none"
                        />
                      </div>
                    )}

                    {/* Actions footer */}
                    {selectedBorrow.status === 'PENDING' && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <button
                          onClick={() => triggerRejectDialog(selectedBorrow.id)}
                          className="py-3 px-4 rounded-xl border border-brand-error/20 bg-brand-error/5 text-brand-error hover:bg-brand-error/10 font-bold transition-all cursor-pointer text-center"
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={() => handleApproveBorrow(selectedBorrow.id)}
                          className="py-3 px-4 rounded-xl bg-brand-success hover:bg-brand-success/90 text-white font-bold transition-all cursor-pointer text-center"
                        >
                          Phê duyệt
                        </button>
                      </div>
                    )}

                    {selectedBorrow.status === 'APPROVED' && (
                      <div className="pt-4 border-t border-white/5">
                        <button
                          onClick={() => openHandoverModal(selectedBorrow)}
                          className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all cursor-pointer text-center flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/20"
                        >
                          <PackageCheck className="w-4 h-4" />
                          <span>Lập biên bản & Bàn giao thiết bị</span>
                        </button>
                      </div>
                    )}

                    {(selectedBorrow.status === 'HANDED_OVER' || selectedBorrow.status === 'OVERDUE') && (
                      <div className="pt-4 border-t border-white/5">
                        <button
                          onClick={() => openReturnModal(selectedBorrow)}
                          className="w-full py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all cursor-pointer text-center flex items-center justify-center space-x-2"
                        >
                          <Undo className="w-4 h-4" />
                          <span>Xác nhận Thu hồi / Nhận hoàn trả</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reject Reason input dialog */}
        {rejectDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setRejectDialogOpen(false)} />

            <div className="glass-panel max-w-md w-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
                <h3 className="text-lg font-bold text-white">Nhập lý do từ chối</h3>
                <button onClick={() => setRejectDialogOpen(false)} className="p-2 rounded-xl text-studio-muted hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-left">
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-studio-muted uppercase">Lý do từ chối (Bắt buộc)</label>
                    <span className={`text-[10px] font-bold ${rejectReason.length > 450 ? 'text-brand-error' : 'text-studio-muted'}`}>
                      {rejectReason.length} / 500
                    </span>
                  </div>
                  <textarea
                    placeholder="Nhập lý do từ chối yêu cầu (Ví dụ: Thiết bị đang bảo trì, Trùng lịch sự kiện...)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    maxLength={500}
                    className="w-full bg-black/35 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-primary/50 h-24 resize-none break-words"
                    disabled={actioningId !== null}
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={() => setRejectDialogOpen(false)}
                    className="py-3 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-center"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={submitReject}
                    disabled={!rejectReason.trim() || actioningId !== null}
                    className="py-3 px-4 rounded-xl bg-brand-error hover:bg-brand-error/90 text-white font-bold transition-all cursor-pointer text-center disabled:opacity-40"
                  >
                    Xác nhận từ chối
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Handover Dialog */}
        {handoverDialogOpen && selectedBorrowHandover && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setHandoverDialogOpen(false)} />

            <div className="glass-panel max-w-lg w-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
                <div className="flex items-center space-x-2 text-purple-400">
                  <PackageCheck className="w-5 h-5" />
                  <h3 className="text-lg font-bold text-white">Biên bản Bàn Giao Thiết Bị</h3>
                </div>
                <button onClick={() => setHandoverDialogOpen(false)} className="p-2 rounded-xl text-studio-muted hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-left max-h-[75vh] overflow-y-auto">
                {/* Thông tin người nhận */}
                <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-studio-muted font-bold block uppercase text-[10px]">Người nhận</span>
                    <span className="font-semibold text-white mt-0.5 block">{selectedBorrowHandover.user.fullName}</span>
                  </div>
                  <div>
                    <span className="text-studio-muted font-bold block uppercase text-[10px]">Mã SV / NV</span>
                    <span className="font-semibold text-white mt-0.5 block">{selectedBorrowHandover.user.employeeCode}</span>
                  </div>
                </div>

                {/* Danh sách thiết bị */}
                <div>
                  <span className="text-[10px] text-studio-muted font-bold uppercase block mb-1.5">Thiết bị bàn giao</span>
                  <div className="space-y-1.5">
                    {selectedBorrowHandover.equipments.map((eq) => (
                      <div key={eq.equipmentId} className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5 text-xs text-white">
                        <span className="font-medium truncate">{eq.details?.name || 'Thiết bị'}</span>
                        <span className="text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">SL: {eq.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tình trạng bàn giao */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Tình trạng thiết bị lúc giao (Bắt buộc)</label>
                  <textarea
                    placeholder="Mô tả chi tiết tình trạng máy, số seri, phụ kiện kèm theo..."
                    value={handoverCondition}
                    onChange={(e) => setHandoverCondition(e.target.value)}
                    className="w-full bg-black/35 border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-purple-500/50 h-20 resize-none"
                    required
                  />
                </div>

                {/* Ghi chú thêm */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Ghi chú quản trị</label>
                  <textarea
                    placeholder="Ghi chú thêm nếu có..."
                    value={handoverAdminNote}
                    onChange={(e) => setHandoverAdminNote(e.target.value)}
                    className="w-full bg-black/35 border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-purple-500/50 h-16 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setHandoverDialogOpen(false)}
                    className="py-3 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-center text-xs"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={submitHandover}
                    disabled={!handoverCondition.trim() || actioningId !== null}
                    className="py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all cursor-pointer text-center text-xs disabled:opacity-40 flex items-center justify-center space-x-1.5 shadow-lg shadow-purple-600/20"
                  >
                    {actioningId === selectedBorrowHandover.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <PackageCheck className="w-4 h-4" />
                        <span>Xác nhận bàn giao</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Return Dialog */}
        {returnDialogOpen && selectedBorrowReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setReturnDialogOpen(false)} />

            <div className="glass-panel max-w-lg w-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
                <div className="flex items-center space-x-2 text-brand-primary">
                  <Undo className="w-5 h-5" />
                  <h3 className="text-lg font-bold text-white">Xác Nhận Thu Hồi / Nhận Trả Thiết Bị</h3>
                </div>
                <button onClick={() => setReturnDialogOpen(false)} className="p-2 rounded-xl text-studio-muted hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-left max-h-[75vh] overflow-y-auto">
                {/* Thông tin người trả */}
                <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-studio-muted font-bold block uppercase text-[10px]">Người trả</span>
                    <span className="font-semibold text-white mt-0.5 block">{selectedBorrowReturn.user.fullName}</span>
                  </div>
                  <div>
                    <span className="text-studio-muted font-bold block uppercase text-[10px]">Mã SV / NV</span>
                    <span className="font-semibold text-white mt-0.5 block">{selectedBorrowReturn.user.employeeCode}</span>
                  </div>
                </div>

                {/* Danh sách thiết bị */}
                <div>
                  <span className="text-[10px] text-studio-muted font-bold uppercase block mb-1.5">Thiết bị hoàn trả</span>
                  <div className="space-y-1.5">
                    {selectedBorrowReturn.equipments.map((eq) => (
                      <div key={eq.equipmentId} className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5 text-xs text-white">
                        <span className="font-medium truncate">{eq.details?.name || 'Thiết bị'}</span>
                        <span className="text-brand-primary font-bold bg-brand-primary/10 px-2 py-0.5 rounded border border-brand-primary/20">SL: {eq.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tình trạng khi hoàn trả */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Tình trạng thiết bị lúc nhận trả</label>
                  <textarea
                    placeholder="Mô tả tình trạng máy khi nhận lại..."
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                    className="w-full bg-black/35 border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 h-20 resize-none"
                  />
                </div>

                {/* Checkbox hư hỏng */}
                <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDamaged}
                      onChange={(e) => setIsDamaged(e.target.checked)}
                      className="w-4 h-4 rounded border-amber-500/40 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                      <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      <span>Thiết bị hư hỏng / cần chuyển sang Bảo trì (MAINTENANCE)</span>
                    </span>
                  </label>
                  {isDamaged && (
                    <p className="text-[11px] text-amber-200/80 leading-relaxed pl-6">
                      * Theo Quy tắc nghiệp vụ (Mục 3.9 & 3.10), thiết bị sẽ được chuyển sang trạng thái <strong>MAINTENANCE</strong> và tạm ngưng cho mượn cho đến khi hoàn tất sửa chữa.
                    </p>
                  )}
                </div>

                {/* Ghi chú thêm */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Ghi chú quản trị</label>
                  <textarea
                    placeholder="Ghi chú thêm nếu có..."
                    value={returnAdminNote}
                    onChange={(e) => setReturnAdminNote(e.target.value)}
                    className="w-full bg-black/35 border border-white/5 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 h-16 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setReturnDialogOpen(false)}
                    className="py-3 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-center text-xs"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={submitReturn}
                    disabled={actioningId !== null}
                    className="py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all cursor-pointer text-center text-xs disabled:opacity-40 flex items-center justify-center space-x-1.5 shadow-lg shadow-brand-primary/20"
                  >
                    {actioningId === selectedBorrowReturn.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Undo className="w-4 h-4" />
                        <span>Xác nhận thu hồi</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Studio Booking Overlap Warning Override Alert */}
        {warningDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setWarningDialogOpen(false)} />

            <div className="glass-panel max-w-md w-full rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200 p-6 text-center space-y-6">
              <div className="w-14 h-14 rounded-full bg-brand-accent/15 border border-brand-accent/30 text-brand-accent flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Xác nhận duyệt đè lịch đặt?</h3>
                <p className="text-sm text-studio-muted leading-relaxed">
                  {warningMessage}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setWarningDialogOpen(false);
                    setWarningTargetId(null);
                  }}
                  className="py-3 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => warningTargetId && handleApproveStudio(warningTargetId, true)}
                  className="py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold transition-all cursor-pointer"
                >
                  Tiếp tục duyệt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
