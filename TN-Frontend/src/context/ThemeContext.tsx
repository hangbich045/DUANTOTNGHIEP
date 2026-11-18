'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  isLight: boolean;
  isDark: boolean;
  mounted: boolean;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
}

const ACTIVE_THEME_KEY = 'lhu_theme_active';
const userThemeKey = (userId: string) => `lhu_theme_user_${userId}`;

const ThemeContext = createContext<ThemeContextType | null>(null);

function applyThemeToDom(mode: ThemeMode, animate = false) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-transition');
    window.setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 260);
  }
  root.setAttribute('data-theme', mode);
  if (mode === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);
  const lastSyncedUserIdRef = useRef<string | null>(null);

  // Khởi tạo từ DOM / localStorage ngay sau mount để khớp script anti-flicker
  useEffect(() => {
    try {
      const domTheme = document.documentElement.getAttribute('data-theme');
      const stored = localStorage.getItem(ACTIVE_THEME_KEY);
      const initial: ThemeMode =
        domTheme === 'light' || domTheme === 'dark'
          ? domTheme
          : stored === 'light'
          ? 'light'
          : 'dark';
      setThemeState(initial);
      applyThemeToDom(initial, false);
    } catch {
      applyThemeToDom('dark', false);
    }
    setMounted(true);
  }, []);

  // Đồng bộ giao diện theo từng tài khoản (ưu tiên dữ liệu lưu trong DB để đồng bộ đa thiết bị)
  useEffect(() => {
    if (!mounted) return;
    if (!user?.id) {
      lastSyncedUserIdRef.current = null;
      return;
    }

    const dbTheme = user.themePreference;
    const localUserTheme = (() => {
      try {
        const v = localStorage.getItem(userThemeKey(user.id));
        return v === 'light' || v === 'dark' ? v : null;
      } catch {
        return null;
      }
    })();

    const resolved: ThemeMode | null =
      dbTheme === 'light' || dbTheme === 'dark'
        ? dbTheme
        : localUserTheme;

    if (resolved && (resolved !== theme || lastSyncedUserIdRef.current !== user.id)) {
      lastSyncedUserIdRef.current = user.id;
      setThemeState(resolved);
      applyThemeToDom(resolved, false);
      try {
        localStorage.setItem(ACTIVE_THEME_KEY, resolved);
        localStorage.setItem(userThemeKey(user.id), resolved);
      } catch {
        // ignore storage quota errors
      }
    } else {
      lastSyncedUserIdRef.current = user.id;
    }
  }, [user?.id, user?.themePreference, mounted]);

  // Đồng bộ giữa các tab trình duyệt khi đổi theme ở tab khác
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_THEME_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue);
        applyThemeToDom(e.newValue, true);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback(
    (next: ThemeMode) => {
      setThemeState(next);
      applyThemeToDom(next, true);
      try {
        localStorage.setItem(ACTIVE_THEME_KEY, next);
        if (user?.id) {
          localStorage.setItem(userThemeKey(user.id), next);
        }
      } catch {
        // ignore
      }

      if (user?.id) {
        updateUser({ themePreference: next });
        // Đồng bộ lên Database để giữ nguyên lựa chọn khi đăng nhập lại hoặc trên thiết bị khác
        api.patch('/auth/theme', { theme: next }).catch(() => {
          // Đã lưu localStorage dự phòng
        });
      }
    },
    [user?.id, updateUser]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isLight: theme === 'light',
        isDark: theme === 'dark',
        mounted,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
