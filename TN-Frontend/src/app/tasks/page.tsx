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

export default function MyTasksPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Filters
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
  const [submittingExternal, setSubmittingExternal] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<TaskItem | null>(null);

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
      fetchTasksAndStats();
    }
  }, [user, activeTab, taskTypeFilter]);

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
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phân hệ Quản lý công việc (FR-04)</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Nhiệm Vụ & Công Việc Của Tôi</h1>
            <p className="text-sm text-studio-muted mt-1 max-w-2xl leading-relaxed">
              Dành cho Cộng tác viên (CTV): Theo dõi tiến độ nhiệm vụ được phân công, nộp kết quả sản phẩm/minh chứng và khai báo công việc phát sinh ngoài hệ thống.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchTasksAndStats}
              className="p-3 rounded-2xl border border-white/5 hover:bg-white/5 text-studio-muted hover:text-white transition-all cursor-pointer shadow-sm"
              title="Làm mới dữ liệu"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>

            <button
              onClick={openExternalModal}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-purple-600/20 transition-all cursor-pointer text-xs"
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
                      <div>{getStatusBadge(task.status)}</div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-white leading-snug">{task.title}</h3>

                    {/* Description */}
                    {task.description && (
                      <p className="text-xs text-studio-muted leading-relaxed line-clamp-3 bg-white/2 p-3 rounded-2xl border border-white/5">
                        {task.description}
                      </p>
                    )}

                    {/* Revision Feedback Alert (if REVISION_REQUESTED) */}
                    {task.status === 'REVISION_REQUESTED' && task.feedback && (
                      <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl space-y-1">
                        <span className="text-[11px] font-bold text-rose-300 flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Yêu cầu chỉnh sửa từ Quản trị viên:</span>
                        </span>
                        <p className="text-xs text-rose-200 leading-relaxed font-medium pl-5">{task.feedback}</p>
                      </div>
                    )}

                    {/* Submission Links (if available) */}
                    {(task.resultLink || task.proofFile) && (
                      <div className="space-y-1.5 pt-1 text-xs">
                        {task.resultLink && (
                          <div className="flex items-center space-x-2 text-brand-primary">
                            <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                            <a
                              href={task.resultLink}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline font-semibold flex items-center space-x-1 break-all"
                            >
                              <span>Link sản phẩm đã nộp</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </div>
                        )}
                        {task.proofFile && (
                          <div className="flex items-center space-x-2 text-blue-400">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <a
                              href={task.proofFile}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline font-semibold flex items-center space-x-1 break-all"
                            >
                              <span>File minh chứng đính kèm</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Deadline & Created info */}
                    <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] text-studio-muted gap-2">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Hạn: {task.deadline ? format(new Date(task.deadline), 'dd/MM/yyyy HH:mm') : 'Không giới hạn'}</span>
                        {isOverdue && <span className="text-rose-400 font-bold">(Quá hạn)</span>}
                      </div>

                      {task.completedAt && (
                        <div className="text-brand-success font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Xong: {format(new Date(task.completedAt), 'dd/MM/yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTaskForDetail(task);
                        setDetailModalOpen(true);
                      }}
                      className="w-full sm:w-auto py-2.5 px-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Chi tiết</span>
                    </button>

                    <div className="flex-1 w-full">
                      {/* Bắt đầu thực hiện (khi NOT_STARTED) */}
                      {task.status === 'NOT_STARTED' && (
                        <button
                          onClick={() => handleStartTask(task)}
                          disabled={actioningId === task.id}
                          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-blue-600/20 disabled:opacity-50"
                        >
                          {actioningId === task.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              <span>Bắt đầu làm việc</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Nộp kết quả (khi IN_PROGRESS hoặc REVISION_REQUESTED) */}
                      {(task.status === 'IN_PROGRESS' || task.status === 'REVISION_REQUESTED') && (
                        <button
                          onClick={() => openSubmitModal(task)}
                          className="w-full py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-brand-primary/20"
                        >
                          <Send className="w-4 h-4" />
                          <span>
                            {task.status === 'REVISION_REQUESTED' ? 'Cập nhật & Nộp lại bài' : 'Nộp kết quả'}
                          </span>
                        </button>
                      )}

                      {/* Đang chờ duyệt (khi PENDING_APPROVAL) */}
                      {task.status === 'PENDING_APPROVAL' && (
                        <div className="py-2.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold text-xs text-center flex items-center justify-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>Đang chờ Quản trị viên nghiệm thu</span>
                        </div>
                      )}

                      {/* Đã hoàn thành (khi COMPLETED) */}
                      {task.status === 'COMPLETED' && (
                        <div className="py-2.5 px-4 rounded-xl bg-brand-success/10 border border-brand-success/20 text-brand-success font-semibold text-xs text-center flex items-center justify-center space-x-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Đã nghiệm thu hoàn thành xuất sắc!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Nộp kết quả bài làm */}
        {submitModalOpen && selectedTaskToSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSubmitModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-lg w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-brand-primary">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Nộp Kết Quả Nhiệm Vụ</h3>
                    <p className="text-xs text-studio-muted mt-0.5">{selectedTaskToSubmit.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSubmitModalOpen(false)}
                  className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitTaskResult} className="space-y-4">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-xs text-studio-muted space-y-1">
                  <p className="text-white font-medium">Quy tắc nộp bài nghiệm thu (FR-04):</p>
                  <p>Vui lòng cung cấp link sản phẩm đã lưu trữ trên đám mây (Google Drive, Figma, Youtube, v.v.) hoặc file minh chứng để Nhân sự kiểm tra nghiệm thu.</p>
                </div>

                {/* Result Link */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Link sản phẩm / Kết quả hoàn thành</label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 text-studio-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={resultLink}
                      onChange={(e) => setResultLink(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                    />
                  </div>
                </div>

                {/* Proof File */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Đường dẫn file minh chứng / hình ảnh</label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-studio-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="VD: uploads/minh-chung-quay-phim.jpg hoặc link ảnh"
                      value={proofFile}
                      onChange={(e) => setProofFile(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setSubmitModalOpen(false)}
                    className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-xs"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submittingResult}
                    className="py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all cursor-pointer text-xs disabled:opacity-40 flex items-center justify-center space-x-2 shadow-lg shadow-brand-primary/20"
                  >
                    {submittingResult ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Xác nhận nộp bài</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Khai báo việc ngoài hệ thống */}
        {externalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setExternalModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-lg w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Khai Báo Việc Ngoài Hệ Thống</h3>
                    <p className="text-xs text-studio-muted mt-0.5">Quy tắc 5.9: Khai báo nhiệm vụ phát sinh để tính thù lao</p>
                  </div>
                </div>
                <button
                  onClick={() => setExternalModalOpen(false)}
                  className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitExternalTask} className="space-y-4">
                {/* Task Type */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Loại công việc *</label>
                  <select
                    value={externalTaskType}
                    onChange={(e) => setExternalTaskType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                  >
                    {TASK_TYPES.map((type) => (
                      <option key={type} value={type} className="bg-[#121216] text-white">
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Other Task Type Input when 'Khác' selected */}
                {externalTaskType === 'Khác' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-amber-300 uppercase block">Chi tiết loại công việc khác *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Quay flycam, Hỗ trợ ánh sáng sân khấu..."
                      value={externalOtherTaskType}
                      onChange={(e) => setExternalOtherTaskType(e.target.value)}
                      className="w-full bg-black/40 border border-amber-500/40 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Tên công việc phát sinh *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Hỗ trợ kỹ thuật livestream sự kiện ngày hội thể thao..."
                    value={externalTitle}
                    onChange={(e) => setExternalTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Mô tả công việc đã thực hiện</label>
                  <textarea
                    rows={3}
                    placeholder="Mô tả cụ thể thời gian, địa điểm, các thiết bị đã vận hành..."
                    value={externalDescription}
                    onChange={(e) => setExternalDescription(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-purple-500/50 resize-none"
                  />
                </div>

                {/* Result Link */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Link sản phẩm / Kết quả thực hiện</label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/live/... hoặc link Drive"
                    value={externalResultLink}
                    onChange={(e) => setExternalResultLink(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                {/* Proof File */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">File minh chứng đính kèm</label>
                  <input
                    type="text"
                    placeholder="VD: link ảnh chụp tại hiện trường, tài liệu xác nhận..."
                    value={externalProofFile}
                    onChange={(e) => setExternalProofFile(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                  />
                  <p className="text-[10px] text-studio-muted">
                    * Theo Quy tắc 5.10, công việc ngoài hệ thống phải được Nhân sự xác minh trước khi đưa vào Bảng lương.
                  </p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setExternalModalOpen(false)}
                    className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-xs"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submittingExternal}
                    className="py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all cursor-pointer text-xs disabled:opacity-40 flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/20"
                  >
                    {submittingExternal ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        <span>Gửi khai báo</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Xem chi tiết nhiệm vụ của CTV */}
        {detailModalOpen && selectedTaskForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDetailModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-xl w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-brand-primary">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Chi Tiết Nhiệm Vụ</h3>
                    <p className="text-xs text-studio-muted mt-0.5">Mã nhiệm vụ: #{selectedTaskForDetail.id.slice(0, 8)}</p>
                  </div>
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

