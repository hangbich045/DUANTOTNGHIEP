'use strict';

import React, { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { Users, Loader2, Search, UserCheck, AlertCircle } from 'lucide-react';

export interface CollaboratorItem {
  id: string;
  fullName: string;
  email: string;
  employeeCode?: string;
  avatarUrl?: string;
  phone?: string;
  role: string;
  status?: 'Active' | 'Locked' | 'Disabled';
  isActive?: boolean;
}

interface CollaboratorSelectProps {
  value: string;
  onChange: (val: string, selectedCollaborator?: CollaboratorItem) => void;
  purpose?: 'assign' | 'filter';
  status?: 'Active' | 'ALL' | 'Locked' | 'Disabled';
  placeholder?: string;
  allOptionLabel?: string;
  allowAll?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  showDetailsInLabel?: boolean;
}

export default function CollaboratorSelect({
  value,
  onChange,
  purpose = 'assign',
  status,
  placeholder,
  allOptionLabel = 'Tất cả CTV',
  allowAll,
  className = '',
  disabled = false,
  id,
  name,
  required = false,
  showDetailsInLabel = true,
}: CollaboratorSelectProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mặc định allowAll = true nếu mục đích là 'filter', false nếu là 'assign'
  const isAllowAll = allowAll !== undefined ? allowAll : purpose === 'filter';
  const defaultPlaceholder = purpose === 'assign' ? '-- Chọn Cộng tác viên --' : allOptionLabel;

  useEffect(() => {
    let isMounted = true;

    const fetchList = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryPurpose = purpose;
        const queryStatus = status || (purpose === 'assign' ? 'Active' : 'ALL');
        const res: any = await api.get(`/admin/collaborators?purpose=${queryPurpose}&status=${queryStatus}`);

        let items: CollaboratorItem[] = [];
        if (res && res.success && Array.isArray(res.data)) {
          items = res.data;
        } else if (Array.isArray(res)) {
          items = res;
        } else if (res && Array.isArray(res.data)) {
          items = res.data;
        } else if (res && res.items && Array.isArray(res.items)) {
          items = res.items;
        }

        // Lọc an toàn 2 lớp tại Frontend: CHỈ lấy role = COLLABORATOR
        items = items.filter((u) => u.role === 'COLLABORATOR');

        // Nếu là mục đích phân công: CHỈ lấy CTV Active
        if (queryPurpose === 'assign' || queryStatus === 'Active') {
          items = items.filter((u) => u.status === 'Active' || (u.isActive && u.status !== 'Locked' && u.status !== 'Disabled'));
        }

        // Sắp xếp A-Z theo Họ tên
        items.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));

        if (isMounted) {
          setCollaborators(items);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Lỗi khi tải danh sách CTV:', err);
          setError(err.message || 'Không thể tải danh sách CTV');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchList();

    return () => {
      isMounted = false;
    };
  }, [purpose, status]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const selected = collaborators.find((c) => c.id === val);
    onChange(val, selected);
  };

  return (
    <div className="relative inline-block w-full">
      <select
        id={id}
        name={name}
        value={value || (isAllowAll ? 'ALL' : '')}
        onChange={handleChange}
        disabled={disabled || loading}
        required={required}
        className={`w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isAllowAll && (
          <option value="ALL" className="bg-[#121216] text-white font-bold">
            {allOptionLabel}
          </option>
        )}

        {!isAllowAll && (
          <option value="" disabled className="bg-[#121216] text-studio-muted">
            {placeholder || defaultPlaceholder}
          </option>
        )}

        {collaborators.map((c) => {
          let label = c.fullName;
          const codeOrEmail = c.employeeCode || c.email;

          if (showDetailsInLabel && codeOrEmail) {
            label += ` (${codeOrEmail})`;
          }

          if (purpose === 'filter') {
            if (c.status === 'Disabled') {
              label += ' - [Đã nghỉ việc]';
            } else if (c.status === 'Locked') {
              label += ' - [Tạm khóa]';
            }
          }

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

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin" />
        </div>
      )}
    </div>
  );
}

