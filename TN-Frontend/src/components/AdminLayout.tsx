'use client';

import Image from "next/image";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/common/ThemeToggle';
import {
  LayoutDashboard,
  Camera,
  ClipboardList,
  Users,
  Globe,
  LayoutGrid,
  Images,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  LogOut,
  CheckSquare,
  Calculator,
  Calendar,
  History,
  Wrench,
  FolderTree,
  Briefcase,
  Settings,
  ChevronDown,
} from 'lucide-react';

interface NavLinkItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}

type SidebarMenuItem =
  | ({ type: 'link'; id: string } & NavLinkItem)
  | {
      type: 'group';
      id: string;
      label: string;
      icon: React.ElementType;
      children: NavLinkItem[];
    };

const sidebarMenu: SidebarMenuItem[] = [
  {
    type: 'link',
    id: 'dashboard',
    href: '/admin/dashboard',
    label: 'Thống kê tổng quan',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    type: 'link',
    id: 'requests',
    href: '/admin/requests',
    label: 'Duyệt yêu cầu',
    icon: ClipboardList,
  },
  {
    type: 'group',
    id: 'equipment',
    label: 'Quản lý Thiết bị',
    icon: Camera,
    children: [
      { href: '/admin/equipment', label: 'Danh sách thiết bị', icon: Camera, exact: true },
      { href: '/admin/categories', label: 'Danh mục thiết bị', icon: FolderTree },
      { href: '/admin/equipment/maintenance', label: 'Bảo trì & Thanh lý', icon: Wrench },
    ],
  },
  {
    type: 'group',
    id: 'operations',
    label: 'Công việc & Ca trực',
    icon: Briefcase,
    children: [
      { href: '/admin/tasks', label: 'Quản lý Công việc', icon: CheckSquare },
      { href: '/admin/duty', label: 'Quản lý Ca trực', icon: Calendar },
      { href: '/admin/payroll', label: 'Chấm công & Thù lao', icon: Calculator },
    ],
  },
  {
    type: 'group',
    id: 'cms',
    label: 'Quản lý Nội dung',
    icon: Globe,
    children: [
      { href: '/admin/cms', label: 'Nội dung Trang chủ', icon: Globe, exact: true },
      { href: '/admin/cms/services', label: 'Dịch vụ Trang chủ', icon: LayoutGrid },
      { href: '/admin/cms/gallery', label: 'Thư viện ảnh', icon: Images },
    ],
  },
  {
    type: 'group',
    id: 'system',
    label: 'Quản trị Hệ thống',
    icon: Settings,
    children: [
      { href: '/admin/users', label: 'Quản lý Thành viên', icon: Users },
      { href: '/admin/audit-logs', label: 'Lịch sử thao tác', icon: History },
    ],
  },
];

const allMobileLinks: NavLinkItem[] = sidebarMenu.flatMap((item) =>
  item.type === 'link' ? [item] : item.children
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { toast } = useToast();
  const [manualOpenGroups, setManualOpenGroups] = useState<Record<string, boolean>>({});
  const [pathOverrides, setPathOverrides] = useState<Record<string, { path: string; open: boolean }>>({});

  useEffect(() => {
    if (!loading) {
      if (!user) {
        toast('Vui lòng đăng nhập tài khoản Quản trị', 'warning');
        router.push('/auth/login');
      } else if (user.role !== 'ADMIN') {
        toast('Bạn không có quyền truy cập trang quản trị này', 'error');
        router.push('/');
      }
    }
  }, [user, loading, router, toast]);

  const isLinkActive = (link: NavLinkItem) =>
    link.exact
      ? pathname === link.href
      : pathname === link.href || pathname.startsWith(`${link.href}/`);

  const isGroupActive = (children: NavLinkItem[]) =>
    children.some((child) => isLinkActive(child));

  const isGroupExpanded = (groupId: string, children: NavLinkItem[]) => {
    const override = pathOverrides[groupId];
    if (override && override.path === pathname) {
      return override.open;
    }
    if (isGroupActive(children)) {
      return true;
    }
    return Boolean(manualOpenGroups[groupId]);
  };

  const toggleGroup = (groupId: string, children: NavLinkItem[]) => {
    const currentlyOpen = isGroupExpanded(groupId, children);
    const nextOpen = !currentlyOpen;
    setManualOpenGroups((prev) => ({ ...prev, [groupId]: nextOpen }));
    setPathOverrides((prev) => ({ ...prev, [groupId]: { path: pathname, open: nextOpen } }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studio-dark">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-studio-dark text-center px-6">
        <ShieldCheck className="w-16 h-16 text-brand-error mb-4" />
        <h1 className="text-2xl font-extrabold text-white">Truy Cập Bị Từ Chối</h1>
        <p className="text-studio-muted text-sm mt-2 max-w-md">
          Trang này chỉ dành cho tài khoản quản trị viên. Vui lòng quay lại hoặc đăng nhập bằng tài khoản được cấp quyền.
        </p>
        <Link
          href="/"
          className="mt-6 flex items-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang chủ</span>
        </Link>
      </div>
    );
  }

  const renderTopLink = (link: NavLinkItem) => {
    const Icon = link.icon;
    const active = isLinkActive(link);

    return (
      <Link
        key={link.href}
        href={link.href}
        className={`flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
          active
            ? 'bg-brand-primary/15 text-brand-primary border border-brand-primary/20 shadow-md shadow-brand-primary/5'
            : 'text-studio-muted hover:bg-white/5 hover:text-white border border-transparent'
        }`}
      >
        <Icon className="w-4.5 h-4.5 shrink-0" />
        <span className="truncate">{link.label}</span>
      </Link>
    );
  };

  const renderSubLink = (link: NavLinkItem) => {
    const Icon = link.icon;
    const active = isLinkActive(link);

    return (
      <Link
        key={link.href}
        href={link.href}
        className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
          active
            ? 'bg-brand-primary/15 text-brand-primary border border-brand-primary/20 shadow-sm shadow-brand-primary/5'
            : 'text-studio-muted hover:bg-white/5 hover:text-white border border-transparent'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{link.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex bg-studio-dark">
      <aside className="w-72 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col justify-between p-6 shrink-0 hidden md:flex sticky top-0 h-screen z-40">
        <div className="flex flex-col min-h-0 space-y-6">
          <div className="flex items-center justify-between pl-1 shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-11 h-11 flex items-center justify-center">
                <Image
                  src="/LOGO.png"
                  alt="LHU Media"
                  width={44}
                  height={44}
                  className="object-contain drop-shadow-lg"
                  priority
                />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                LHU <span className="text-gradient">MEDIA</span>
              </span>
            </Link>
            <div className="flex items-center space-x-2 shrink-0">
              <ThemeToggle />
              <NotificationBell align="left" />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto pr-1 space-y-1.5 text-left">
            <span className="text-[10px] font-bold tracking-widest text-studio-muted/70 uppercase pl-3 block mb-3">
              Hệ thống Quản trị
            </span>

            {sidebarMenu.map((item) => {
              if (item.type === 'link') {
                return renderTopLink(item);
              }

              const GroupIcon = item.icon;
              const groupActive = isGroupActive(item.children);
              const expanded = isGroupExpanded(item.id, item.children);

              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(item.id, item.children)}
                    aria-expanded={expanded}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                      groupActive
                        ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                        : 'text-studio-muted hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="flex items-center space-x-3 min-w-0">
                      <GroupIcon className="w-4.5 h-4.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                        expanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {expanded && (
                    <div className="ml-5 pl-3 border-l border-white/10 space-y-1 py-1">
                      {item.children.map(renderSubLink)}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 pt-5 border-t border-white/5 shrink-0">
          <div className="flex items-center space-x-3 bg-white/5 p-3 rounded-2xl border border-white/5">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-8 h-8 rounded-lg object-cover border border-brand-secondary/30 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-brand-accent/20 flex items-center justify-center font-bold text-brand-accent text-sm shrink-0">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-left min-w-0">
              <p className="text-xs font-bold text-white truncate leading-none mb-1">{user.fullName}</p>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded leading-none bg-brand-accent/20 text-brand-accent border border-brand-accent/30">
                {user.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/"
              className="flex items-center justify-center space-x-1.5 bg-white/5 hover:bg-white/10 text-xs font-semibold py-2 px-3 rounded-xl border border-white/5 text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về User</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center justify-center space-x-1.5 bg-brand-error/5 hover:bg-brand-error/10 border border-brand-error/20 text-brand-error text-xs font-semibold py-2 px-3 rounded-xl cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center bg-black/20 md:hidden relative z-30">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-11 h-11 flex items-center justify-center">
              <Image
                src="/LOGO.png"
                alt="LHU Media"
                width={44}
                height={44}
                className="object-contain drop-shadow-lg"
                priority
              />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">ADMIN PANEL</span>
          </Link>
          <div className="flex items-center space-x-2 overflow-x-auto">
            <ThemeToggle />
            <NotificationBell align="right" />
            {allMobileLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`p-2 rounded-xl border shrink-0 ${
                    isLinkActive(link)
                      ? 'bg-brand-primary/20 border-brand-primary text-brand-primary'
                      : 'border-white/5 text-studio-muted hover:text-white'
                  }`}
                  title={link.label}
                >
                  <Icon className="w-4 h-4" />
                </Link>
              );
            })}
            <button
              onClick={logout}
              className="p-2 rounded-xl border border-brand-error/20 bg-brand-error/5 text-brand-error cursor-pointer shrink-0"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-12 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
