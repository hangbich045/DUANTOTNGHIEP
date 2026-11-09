'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import { format } from 'date-fns';
import {
  Loader2,
  Plus,
  RefreshCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  CheckSquare,
  AlertTriangle,
  X,
  User as UserIcon,
  Calendar,
  FileText,
  Link as LinkIcon,
  MessageSquare,
  Pencil,
  Tag,
} from 'lucide-react';

export const TASK_TYPES = [
  'Viết content',
  'Chụp & xử lý hình sự kiện',
  'Quay highlight',
  'Dựng clip highlight',
  'Quay clip TikTok',
  'Dựng clip TikTok',
  'Viết kịch bản',
  'MC bản tin',
  'Thư ký trường quay',
  'Quay phim',
  'Dựng phim',
  'Diễn viên',
  'Thiết kế',
  'Khác',
];

interface TaskAssignee {
  id: string;
  fullName: string;
  email: string;
  employeeCode?: string;
  avatarUrl?: string;
  role: string;
}

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
  assignee?: TaskAssignee;
  creator?: TaskAssignee;
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

export default function AdminTasksPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [collaborators, setCollaborators] = useState<TaskAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [collaboratorFilter, setCollaboratorFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Create Task Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createAssigneeId, setCreateAssigneeId] = useState('');
  const [createDeadline, setCreateDeadline] = useState('');
  const [createTaskType, setCreateTaskType] = useState('Viết content');
  const [createOtherTaskType, setCreateOtherTaskType] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Edit Task Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editTaskType, setEditTaskType] = useState('Viết content');
  const [editOtherTaskType, setEditOtherTaskType] = useState('');
  const [updatingTask, setUpdatingTask] = useState(false);

  // Review Task Modal states
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<TaskItem | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'COMPLETED' | 'REVISION_REQUESTED'>('COMPLETED');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Detail Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskItem | null>(null);

  // Delete Confirm Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  useEffect(() => {
    fetchCollaborators();
  }, []);

  useEffect(() => {
    fetchTasksAndStats();
  }, [statusFilter, collaboratorFilter, typeFilter, taskTypeFilter]);

  const fetchCollaborators = async () => {
    try {
      const res = await api.get('/dashboard/users');
      const allUsers: any[] = Array.isArray(res) ? res : res.data || [];
      const ctvs = allUsers.filter((u: any) => u.role === 'COLLABORATOR' || u.role === 'ADMIN');
      setCollaborators(ctvs);
    } catch (err: any) {
      console.error('Lỗi tải danh sách CTV:', err);
    }
  };

  const fetchTasksAndStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch stats
      const statsRes = await api.get('/tasks/stats');
      if (statsRes.success) {
        setStats(statsRes.data);
      }

      // 2. Build query
      let query = '?limit=50';
      if (statusFilter !== 'ALL') query += `&status=${statusFilter}`;
      if (collaboratorFilter !== 'ALL') query += `&assignedToUserId=${collaboratorFilter}`;
      if (taskTypeFilter !== 'ALL') query += `&taskType=${encodeURIComponent(taskTypeFilter)}`;
      if (typeFilter === 'EXTERNAL') query += `&isExternal=true`;
      if (typeFilter === 'INTERNAL') query += `&isExternal=false`;
      if (searchTerm.trim()) query += `&search=${encodeURIComponent(searchTerm.trim())}`;

      const res = await api.get(`/tasks${query}`);
      if (res.success && Array.isArray(res.data)) {
        setTasks(res.data);
      } else {
        setTasks([]);
      }
    } catch (err: any) {
      toast(err.message || 'Lỗi khi tải danh sách công việc', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTasksAndStats();
  };

  const openCreateModal = () => {
    setCreateTitle('');
    setCreateDescription('');
    setCreateAssigneeId(collaborators[0]?.id || '');
    setCreateDeadline('');
    setCreateTaskType('Viết content');
    setCreateOtherTaskType('');
    setCreateModalOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      toast('Vui lòng nhập tiêu đề công việc', 'warning');
      return;
    }
    if (!createAssigneeId) {
      toast('Vui lòng chọn CTV phụ trách', 'warning');
      return;
    }
    if (createTaskType === 'Khác' && !createOtherTaskType.trim()) {
      toast('Vui lòng nhập tên loại công việc tùy chỉnh khi chọn Khác', 'warning');
      return;
    }

    setCreatingTask(true);
    try {
      await api.post('/tasks', {
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        assignedToUserId: createAssigneeId,
        taskType: createTaskType,
        otherTaskType: createTaskType === 'Khác' ? createOtherTaskType.trim() : undefined,
        deadline: createDeadline ? new Date(createDeadline).toISOString() : undefined,
      });

      toast('Giao nhiệm vụ cho CTV thành công', 'success');
      setCreateModalOpen(false);
      fetchTasksAndStats();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi giao việc', 'error');
    } finally {
      setCreatingTask(false);
    }
  };

  const openEditModal = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title || '');
    setEditDescription(task.description || '');
    setEditAssigneeId(task.assignedToUserId || '');
    setEditTaskType(task.taskType || 'Viết content');
    setEditOtherTaskType(task.otherTaskType || '');
    if (task.deadline) {
      try {
        const d = new Date(task.deadline);
        const iso = format(d, "yyyy-MM-dd'T'HH:mm");
        setEditDeadline(iso);
      } catch {
        setEditDeadline('');
      }
    } else {
      setEditDeadline('');
    }
    setEditModalOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId) return;

    if (!editTitle.trim()) {
      toast('Vui lòng nhập tiêu đề công việc', 'warning');
      return;
    }
    if (!editAssigneeId) {
      toast('Vui lòng chọn CTV phụ trách', 'warning');
      return;
    }
    if (editTaskType === 'Khác' && !editOtherTaskType.trim()) {
      toast('Vui lòng nhập tên loại công việc tùy chỉnh khi chọn Khác', 'warning');
      return;
    }

    setUpdatingTask(true);
    try {
      await api.put(`/tasks/${editingTaskId}`, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        assignedToUserId: editAssigneeId,
        taskType: editTaskType,
        otherTaskType: editTaskType === 'Khác' ? editOtherTaskType.trim() : undefined,
        deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
      });

      toast('Cập nhật nhiệm vụ thành công!', 'success');
      setEditModalOpen(false);
      setEditingTaskId(null);
      fetchTasksAndStats();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi cập nhật nhiệm vụ', 'error');
    } finally {
      setUpdatingTask(false);
    }
  };

  const openReviewModal = (task: TaskItem) => {
    setSelectedTaskForReview(task);
    setReviewDecision('COMPLETED');
    setReviewFeedback(task.feedback || '');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedTaskForReview) return;

    if (reviewDecision === 'REVISION_REQUESTED' && !reviewFeedback.trim()) {
      toast('Vui lòng nhập lý do/nội dung cần chỉnh sửa', 'warning');
      return;
    }

    setSubmittingReview(true);
    try {
      await api.put(`/tasks/${selectedTaskForReview.id}/review`, {
        decision: reviewDecision,
        feedback: reviewFeedback.trim() || undefined,
      });

      toast(
        reviewDecision === 'COMPLETED'
          ? 'Đã nghiệm thu hoàn thành công việc thành công!'
          : 'Đã gửi yêu cầu chỉnh sửa cho CTV',
        'success'
      );
      setReviewModalOpen(false);
      setSelectedTaskForReview(null);
      fetchTasksAndStats();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi đánh giá công việc', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const openDetailModal = (task: TaskItem) => {
    setSelectedTaskDetail(task);
    setDetailModalOpen(true);
  };

  const triggerDeleteTask = (task: TaskItem) => {
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeletingTask(true);
    try {
      await api.delete(`/tasks/${taskToDelete.id}`);
      toast('Đã xóa công việc thành công', 'success');
      setDeleteModalOpen(false);
      setTaskToDelete(null);
      fetchTasksAndStats();
    } catch (err: any) {
      toast(err.message || 'Lỗi khi xóa công việc', 'error');
    } finally {
      setDeletingTask(false);
    }
  };

  const renderTaskTypeBadge = (task: TaskItem) => {
    if (!task.taskType) return null;
    const isOther = task.taskType === 'Khác';
    const displayLabel = isOther
      ? (task.otherTaskType ? `Khác: ${task.otherTaskType}` : 'Khác')
      : task.taskType;

    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/25">
        <Tag className="w-3 h-3 shrink-0" />
        <span className="truncate max-w-[160px]" title={displayLabel}>{displayLabel}</span>
      </span>
    );
  };

  const getStatusBadge = (status: TaskItem['status']) => {
    switch (status) {
      case 'NOT_STARTED':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider bg-white/10 text-studio-muted border border-white/10 flex items-center space-x-1.5 w-fit">
            <Clock className="w-3 h-3 text-studio-muted" />
            <span>Chưa thực hiện</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center space-x-1.5 w-fit">
            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
            <span>Đang thực hiện</span>
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/35 flex items-center space-x-1.5 animate-pulse w-fit">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>Chờ nghiệm thu</span>
          </span>
        );
      case 'REVISION_REQUESTED':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1.5 w-fit">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Cần chỉnh sửa</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider bg-brand-success/20 text-brand-success border border-brand-success/30 flex items-center space-x-1.5 w-fit">
            <CheckCircle2 className="w-3 h-3 text-brand-success" />
            <span>Đã hoàn thành</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 text-left">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
              <CheckSquare className="w-8 h-8 text-brand-primary" />
              <span>Quản Lý Công Việc & Phân Công CTV</span>
            </h1>
            <p className="text-sm text-studio-muted mt-1">
              Phân hệ FR-04: Giao việc theo loại công việc, theo dõi tiến độ, kiểm tra minh chứng, nghiệm thu hoàn thành và quản lý việc ngoài hệ thống.
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
              onClick={openCreateModal}
              className="flex items-center space-x-2 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-brand-primary/20 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Giao nhiệm vụ mới</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-black/25">
              <span className="text-[11px] font-bold text-studio-muted uppercase block">Tổng nhiệm vụ</span>
              <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-black/25">
              <span className="text-[11px] font-bold text-studio-muted uppercase block">Chưa thực hiện</span>
              <p className="text-2xl font-black text-white/70 mt-1">{stats.notStarted}</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-blue-500/10 bg-blue-500/5">
              <span className="text-[11px] font-bold text-blue-400 uppercase block">Đang làm</span>
              <p className="text-2xl font-black text-blue-400 mt-1">{stats.inProgress}</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 shadow-sm shadow-amber-500/5">
              <span className="text-[11px] font-bold text-amber-300 uppercase block">Chờ nghiệm thu</span>
              <p className="text-2xl font-black text-amber-300 mt-1">{stats.pendingApproval}</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-rose-500/10 bg-rose-500/5">
              <span className="text-[11px] font-bold text-rose-400 uppercase block">Cần sửa</span>
              <p className="text-2xl font-black text-rose-400 mt-1">{stats.revisionRequested}</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-brand-success/15 bg-brand-success/5">
              <span className="text-[11px] font-bold text-brand-success uppercase block">Đã hoàn thành</span>
              <p className="text-2xl font-black text-brand-success mt-1">{stats.completed}</p>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="glass-panel p-4 rounded-3xl border border-white/5 bg-black/25 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="md:col-span-3 relative">
              <Search className="w-4 h-4 text-studio-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tiêu đề, mô tả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-brand-primary/50"
              />
            </form>

            {/* Filter by Task Type (Loại công việc) */}
            <div className="md:col-span-3">
              <select
                value={taskTypeFilter}
                onChange={(e) => setTaskTypeFilter(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
              >
                <option value="ALL" className="bg-[#18181b]">Tất cả loại công việc</option>
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-[#18181b]">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div className="md:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
              >
                <option value="ALL" className="bg-[#18181b]">Tất cả trạng thái</option>
                <option value="NOT_STARTED" className="bg-[#18181b]">Chưa thực hiện</option>
                <option value="IN_PROGRESS" className="bg-[#18181b]">Đang thực hiện</option>
                <option value="PENDING_APPROVAL" className="bg-[#18181b]">Chờ nghiệm thu</option>
                <option value="REVISION_REQUESTED" className="bg-[#18181b]">Cần chỉnh sửa</option>
                <option value="COMPLETED" className="bg-[#18181b]">Đã hoàn thành</option>
              </select>
            </div>

            {/* Filter by Collaborator */}
            <div className="md:col-span-2">
              <select
                value={collaboratorFilter}
                onChange={(e) => setCollaboratorFilter(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
              >
                <option value="ALL" className="bg-[#18181b]">Tất cả CTV</option>
                {collaborators.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#18181b]">
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Internal / External Type */}
            <div className="md:col-span-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
              >
                <option value="ALL" className="bg-[#18181b]">Tất cả nguồn việc</option>
                <option value="INTERNAL" className="bg-[#18181b]">Giao nội bộ</option>
                <option value="EXTERNAL" className="bg-[#18181b]">Việc ngoài hệ thống</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tasks Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
            <CheckSquare className="w-10 h-10 text-studio-muted mx-auto mb-3 opacity-40" />
            <p className="text-studio-muted font-medium">Không tìm thấy nhiệm vụ nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="glass-panel overflow-hidden rounded-3xl border border-white/5 shadow-xl bg-black/25">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-studio-muted font-semibold bg-white/2 text-left">
                    <th className="py-4 px-6">Nhiệm vụ & Loại công việc</th>
                    <th className="py-4 px-6">CTV Phụ trách</th>
                    <th className="py-4 px-6">Hạn hoàn thành</th>
                    <th className="py-4 px-6">Trạng thái</th>
                    <th className="py-4 px-6 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tasks.map((task) => {
                    const isOverdue =
                      task.deadline &&
                      new Date(task.deadline) < new Date() &&
                      task.status !== 'COMPLETED';

                    return (
                      <tr key={task.id} className="hover:bg-white/2 transition-colors">
                        {/* Title, Description & Task Type */}
                        <td className="py-4 px-6 max-w-sm">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            {renderTaskTypeBadge(task)}
                            {task.isExternal && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                Việc ngoài
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-white text-sm line-clamp-1">{task.title}</div>
                          {task.description && (
                            <p className="text-xs text-studio-muted mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
                          )}
                          {task.feedback && task.status === 'REVISION_REQUESTED' && (
                            <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[11px] text-rose-300">
                              <strong>Phản hồi sửa:</strong> {task.feedback}
                            </div>
                          )}
                        </td>

                        {/* Assignee */}
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-brand-primary font-bold text-xs shrink-0">
                              {task.assignee?.fullName?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-white text-xs">{task.assignee?.fullName || 'Chưa gán'}</div>
                              <div className="text-[11px] text-studio-muted">{task.assignee?.employeeCode || task.assignee?.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Deadline */}
                        <td className="py-4 px-6">
                          {task.deadline ? (
                            <div>
                              <span className={`text-xs font-semibold block ${isOverdue ? 'text-rose-400 font-bold' : 'text-white'}`}>
                                {format(new Date(task.deadline), 'dd/MM/yyyy HH:mm')}
                              </span>
                              {isOverdue && (
                                <span className="text-[10px] text-rose-400/80 font-medium flex items-center space-x-1 mt-0.5">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Đã quá hạn</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-studio-muted italic">Không đặt hạn</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">{getStatusBadge(task.status)}</td>

                        {/* Actions */}
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center space-x-2">
                            {/* Nút Nghiệm thu (khi PENDING_APPROVAL) */}
                            {task.status === 'PENDING_APPROVAL' && (
                              <button
                                onClick={() => openReviewModal(task)}
                                className="flex items-center space-x-1.5 py-1.5 px-3 rounded-lg border border-amber-500/30 bg-amber-500/20 text-amber-300 text-xs font-bold hover:bg-amber-500 hover:text-black transition-all cursor-pointer shadow-sm"
                                title="Đánh giá và nghiệm thu nhiệm vụ"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Nghiệm thu</span>
                              </button>
                            )}

                            {/* Nút Chỉnh sửa nhiệm vụ (khi chưa COMPLETED) */}
                            {task.status !== 'COMPLETED' && (
                              <button
                                onClick={() => openEditModal(task)}
                                className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-blue-500/20 hover:text-blue-300 text-studio-muted transition-all cursor-pointer"
                                title="Chỉnh sửa nhiệm vụ & Loại công việc"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Nút Xem chi tiết */}
                            <button
                              onClick={() => openDetailModal(task)}
                              className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-studio-muted hover:text-white transition-all cursor-pointer"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Nút Xóa (chỉ cho phép nếu chưa hoàn thành) */}
                            {task.status !== 'COMPLETED' && (
                              <button
                                onClick={() => triggerDeleteTask(task)}
                                className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 text-studio-muted transition-all cursor-pointer"
                                title="Xóa nhiệm vụ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Giao việc mới */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCreateModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-lg w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-brand-primary">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Giao Nhiệm Vụ Cho CTV</h3>
                    <p className="text-xs text-studio-muted mt-0.5">Phân loại và phân công công việc chuyên môn</p>
                  </div>
                </div>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                {/* Task Type (Loại công việc) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block flex items-center space-x-1">
                    <Tag className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Loại công việc *</span>
                  </label>
                  <select
                    value={createTaskType}
                    onChange={(e) => setCreateTaskType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-[#18181b]">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Other Task Type input (nếu chọn 'Khác') */}
                {createTaskType === 'Khác' && (
                  <div className="space-y-1.5 p-3 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 animate-in fade-in duration-200">
                    <label className="text-[11px] font-bold text-brand-primary uppercase block">
                      Tên loại công việc tùy chỉnh *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Biên kịch phóng sự tài liệu, Lồng tiếng video..."
                      value={createOtherTaskType}
                      onChange={(e) => setCreateOtherTaskType(e.target.value)}
                      className="w-full bg-black/40 border border-brand-primary/30 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-primary"
                    />
                    <p className="text-[10px] text-studio-muted">
                      * Nhập cụ thể nội dung công việc để CTV và hệ thống lưu trữ chính xác.
                    </p>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Tiêu đề nhiệm vụ *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Chụp ảnh kỷ yếu sinh viên khóa 2022..."
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Mô tả chi tiết yêu cầu</label>
                  <textarea
                    rows={3}
                    placeholder="Ghi chú cụ thể các yêu cầu, thiết bị cần chuẩn bị, địa điểm..."
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 resize-none"
                  />
                </div>

                {/* Assignee */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Cộng tác viên (CTV) phụ trách *</label>
                  <select
                    required
                    value={createAssigneeId}
                    onChange={(e) => setCreateAssigneeId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                  >
                    <option value="" disabled className="bg-[#18181b]">-- Chọn CTV --</option>
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#18181b]">
                        {c.fullName} ({c.employeeCode || c.email}) - {c.role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deadline */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Thời hạn hoàn thành (Deadline)</label>
                  <input
                    type="datetime-local"
                    value={createDeadline}
                    onChange={(e) => setCreateDeadline(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 cursor-pointer"
                  />
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-xs"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTask}
                    className="py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold transition-all cursor-pointer text-xs disabled:opacity-40 flex items-center justify-center space-x-2 shadow-lg shadow-brand-primary/20"
                  >
                    {creatingTask ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        <span>Xác nhận giao việc</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Chỉnh sửa nhiệm vụ */}
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-lg w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Chỉnh Sửa Nhiệm Vụ</h3>
                    <p className="text-xs text-studio-muted mt-0.5">Cập nhật thông tin phân công và loại công việc</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateTask} className="space-y-4">
                {/* Task Type (Loại công việc) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block flex items-center space-x-1">
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    <span>Loại công việc *</span>
                  </label>
                  <select
                    value={editTaskType}
                    onChange={(e) => setEditTaskType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-[#18181b]">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Other Task Type input (nếu chọn 'Khác') */}
                {editTaskType === 'Khác' && (
                  <div className="space-y-1.5 p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20 animate-in fade-in duration-200">
                    <label className="text-[11px] font-bold text-blue-400 uppercase block">
                      Tên loại công việc tùy chỉnh *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Biên kịch trailer, Lồng tiếng nhân vật..."
                      value={editOtherTaskType}
                      onChange={(e) => setEditOtherTaskType(e.target.value)}
                      className="w-full bg-black/40 border border-blue-500/30 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Tiêu đề nhiệm vụ *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Mô tả chi tiết yêu cầu</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500/50 resize-none"
                  />
                </div>

                {/* Assignee */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Cộng tác viên phụ trách *</label>
                  <select
                    required
                    value={editAssigneeId}
                    onChange={(e) => setEditAssigneeId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    {collaborators.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#18181b]">
                        {c.fullName} ({c.employeeCode || c.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deadline */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-studio-muted uppercase block">Thời hạn hoàn thành (Deadline)</label>
                  <input
                    type="datetime-local"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                  />
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-xs"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={updatingTask}
                    className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all cursor-pointer text-xs disabled:opacity-40 flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
                  >
                    {updatingTask ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Pencil className="w-4 h-4" />
                        <span>Lưu thay đổi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Nghiệm thu / Đánh giá */}
        {reviewModalOpen && selectedTaskForReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setReviewModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-lg w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Nghiệm Thu Công Việc</h3>
                    <p className="text-xs text-studio-muted mt-0.5">Kiểm tra kết quả và xác nhận hoàn thành hoặc yêu cầu sửa</p>
                  </div>
                </div>
                <button
                  onClick={() => setReviewModalOpen(false)}
                  className="p-2 rounded-xl text-studio-muted hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Task info summary */}
              <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  {renderTaskTypeBadge(selectedTaskForReview)}
                  <span className="font-bold text-white text-sm">{selectedTaskForReview.title}</span>
                </div>
                <div className="text-studio-muted">
                  CTV thực hiện: <span className="text-white font-medium">{selectedTaskForReview.assignee?.fullName}</span>
                </div>
                {selectedTaskForReview.resultLink && (
                  <div className="flex items-center space-x-1.5 pt-1">
                    <LinkIcon className="w-3.5 h-3.5 text-brand-primary" />
                    <a
                      href={selectedTaskForReview.resultLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-primary hover:underline font-semibold flex items-center space-x-1 break-all"
                    >
                      <span>Xem link sản phẩm</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {selectedTaskForReview.proofFile && (
                  <div className="flex items-center space-x-1.5 pt-1">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <a
                      href={selectedTaskForReview.proofFile}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline font-semibold flex items-center space-x-1 break-all"
                    >
                      <span>Xem file minh chứng đính kèm</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Decision radio */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-studio-muted uppercase block">Quyết định của Nhân sự</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('COMPLETED')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      reviewDecision === 'COMPLETED'
                        ? 'border-brand-success bg-brand-success/20 text-brand-success'
                        : 'border-white/10 bg-white/5 text-studio-muted hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Nghiệm thu ĐẠT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewDecision('REVISION_REQUESTED')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                      reviewDecision === 'REVISION_REQUESTED'
                        ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                        : 'border-white/10 bg-white/5 text-studio-muted hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Yêu cầu sửa đổi</span>
                  </button>
                </div>
              </div>

              {/* Feedback textarea */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-studio-muted uppercase block">
                  {reviewDecision === 'REVISION_REQUESTED' ? 'Nội dung cần chỉnh sửa (Bắt buộc) *' : 'Ghi chú / Đánh giá nhận xét'}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    reviewDecision === 'REVISION_REQUESTED'
                      ? 'Chỉ rõ các điểm chưa đạt và hướng dẫn CTV sửa đổi...'
                      : 'Đánh giá chất lượng công việc (tùy chọn)...'
                  }
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-brand-primary/50 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-xs"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className={`py-3 px-4 rounded-xl font-bold transition-all cursor-pointer text-xs disabled:opacity-40 flex items-center justify-center space-x-2 shadow-lg ${
                    reviewDecision === 'COMPLETED'
                      ? 'bg-brand-success hover:bg-brand-success/90 text-black shadow-brand-success/20'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                  }`}
                >
                  {submittingReview ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      <span>{reviewDecision === 'COMPLETED' ? 'Xác nhận hoàn thành' : 'Gửi yêu cầu sửa'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xem chi tiết */}
        {detailModalOpen && selectedTaskDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDetailModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-lg w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-brand-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Chi Tiết Nhiệm Vụ</h3>
                    <p className="text-xs text-studio-muted mt-0.5">Mã ID: {selectedTaskDetail.id.slice(0, 8)}...</p>
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
                <div>
                  <span className="text-[11px] font-bold text-studio-muted uppercase block">Loại công việc</span>
                  <div className="mt-1">{renderTaskTypeBadge(selectedTaskDetail) || <span className="text-studio-muted italic">Chưa phân loại</span>}</div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-studio-muted uppercase block">Tiêu đề</span>
                  <p className="text-sm font-bold text-white mt-0.5">{selectedTaskDetail.title}</p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-studio-muted uppercase block">Mô tả</span>
                  <p className="text-xs text-white/90 mt-0.5 whitespace-pre-wrap leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                    {selectedTaskDetail.description || 'Không có mô tả chi tiết.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-studio-muted uppercase block">CTV phụ trách</span>
                    <p className="text-xs font-semibold text-white mt-0.5">{selectedTaskDetail.assignee?.fullName}</p>
                    <p className="text-[10px] text-studio-muted">{selectedTaskDetail.assignee?.employeeCode || selectedTaskDetail.assignee?.email}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-studio-muted uppercase block">Người giao việc</span>
                    <p className="text-xs font-semibold text-white mt-0.5">{selectedTaskDetail.creator?.fullName}</p>
                    <p className="text-[10px] text-studio-muted">{selectedTaskDetail.creator?.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-studio-muted uppercase block">Trạng thái</span>
                    <div className="mt-1">{getStatusBadge(selectedTaskDetail.status)}</div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-studio-muted uppercase block">Hạn hoàn thành</span>
                    <p className="text-xs font-medium text-white mt-1">
                      {selectedTaskDetail.deadline
                        ? format(new Date(selectedTaskDetail.deadline), 'dd/MM/yyyy HH:mm')
                        : 'Không đặt hạn'}
                    </p>
                  </div>
                </div>

                {selectedTaskDetail.resultLink && (
                  <div>
                    <span className="text-[11px] font-bold text-studio-muted uppercase block">Link sản phẩm nộp</span>
                    <a
                      href={selectedTaskDetail.resultLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-primary hover:underline font-semibold flex items-center space-x-1.5 mt-1 break-all"
                    >
                      <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{selectedTaskDetail.resultLink}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}

                {selectedTaskDetail.proofFile && (
                  <div>
                    <span className="text-[11px] font-bold text-studio-muted uppercase block">File minh chứng</span>
                    <a
                      href={selectedTaskDetail.proofFile}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline font-semibold flex items-center space-x-1.5 mt-1 break-all"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span>{selectedTaskDetail.proofFile}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}

                {selectedTaskDetail.feedback && (
                  <div>
                    <span className="text-[11px] font-bold text-studio-muted uppercase block">Ý kiến phản hồi / Nhận xét</span>
                    <p className="text-xs text-amber-200 mt-1 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                      {selectedTaskDetail.feedback}
                    </p>
                  </div>
                )}

                {selectedTaskDetail.completedAt && (
                  <div className="text-[11px] text-brand-success font-medium flex items-center space-x-1.5 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Nghiệm thu vào lúc: {format(new Date(selectedTaskDetail.completedAt), 'dd/MM/yyyy HH:mm')}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="w-full py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xác nhận xóa */}
        {deleteModalOpen && taskToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)} />
            <div className="relative glass-panel rounded-3xl p-6 md:p-8 max-w-sm w-full border border-white/10 shadow-2xl bg-[#0e0e11] z-10 space-y-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Xác Nhận Xóa Nhiệm Vụ?</h3>
                <p className="text-xs text-studio-muted mt-1 leading-relaxed">
                  Bạn có chắc chắn muốn xóa nhiệm vụ <strong className="text-white">"{taskToDelete.title}"</strong> không? Thao tác này không thể hoàn tác.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteTask}
                  disabled={deletingTask}
                  className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer text-xs disabled:opacity-40 flex items-center justify-center space-x-2"
                >
                  {deletingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Xác nhận xóa</span>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
