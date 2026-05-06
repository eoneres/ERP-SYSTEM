'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bell, Moon, Sun, Menu, X, Command,
  CheckCheck, Info, CheckCircle2, AlertTriangle, XCircle,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { cn, formatDate } from '@/lib/utils';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useUnreadCount, useNotifications,
  useMarkRead, useMarkAllRead, useNotificationStream,
} from '@/hooks/use-notifications';
import type { Notification } from '@/lib/api/notifications.api';
import * as React from 'react';

// ─── Notification icon by type ────────────────────────────────────────────────
const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  info:    { icon: Info,          color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
  success: { icon: CheckCircle2,  color: 'text-emerald-500',bg: 'bg-emerald-500/10'},
  warning: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  danger:  { icon: XCircle,       color: 'text-red-500',    bg: 'bg-red-500/10'    },
};

// ─── Notification Dropdown ────────────────────────────────────────────────────
function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead    = useMarkRead();
  const markAllRead = useMarkAllRead();

  const handleClick = async (notif: Notification) => {
    if (!notif.read) await markRead.mutateAsync(notif.id);
    if (notif.resourceUrl) onClose();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[var(--text)]">Notificações</p>
          {unreadCount > 0 && (
            <Badge variant="danger" size="sm">{unreadCount}</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <Bell className="h-8 w-8 text-[var(--text-subtle)] mb-2" />
            <p className="text-sm font-medium text-[var(--text)]">Tudo em dia!</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Nenhuma notificação no momento</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const cfg  = typeConfig[notif.type] ?? typeConfig.info;
            const Icon = cfg.icon;
            const Wrapper = notif.resourceUrl ? Link : 'div';
            const wrapperProps = notif.resourceUrl
              ? { href: notif.resourceUrl, onClick: () => handleClick(notif) }
              : { onClick: () => handleClick(notif) };

            return (
              <Wrapper
                key={notif.id}
                {...(wrapperProps as any)}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
                  'hover:bg-[var(--surface-2)] border-b border-[var(--border)] last:border-0',
                  !notif.read && 'bg-primary-500/5',
                )}
              >
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${cfg.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      'text-xs font-medium text-[var(--text)] truncate',
                      !notif.read && 'font-semibold',
                    )}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-500 shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-[var(--text-subtle)] mt-1">
                    {formatDate(notif.createdAt, 'relative')}
                  </p>
                </div>
              </Wrapper>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface-2)]">
          <p className="text-xs text-center text-[var(--text-muted)]">
            Mostrando as últimas {notifications.length} notificações
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
interface NavbarProps { className?: string; }

export function Navbar({ className }: NavbarProps) {
  const { sidebarCollapsed, pageTitle, breadcrumbs, sidebarOpen, setSidebarOpen, setCommandOpen } =
    useUIStore();
  const { user }          = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // SSE stream — conecta ao backend e recebe notificações em tempo real
  useNotificationStream();

  const { data: countData } = useUnreadCount();
  const unreadCount = countData?.count ?? 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandOpen]);

  const sidebarWidth = sidebarCollapsed ? 68 : 260;

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex items-center gap-3',
        'h-14 px-4 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm',
        'transition-all duration-250',
        className,
      )}
      style={{ left: sidebarWidth }}
    >
      {/* Mobile menu toggle */}
      <button
        className="md:hidden p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Page title / breadcrumbs */}
      <div className="flex-1 min-w-0">
        {breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.href ?? crumb.label}>
                {i > 0 && <span className="text-[var(--text-subtle)]">/</span>}
                <span className={cn(
                  i === breadcrumbs.length - 1
                    ? 'text-[var(--text)] font-medium'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer',
                )}>
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        ) : (
          <h1 className="text-sm font-semibold text-[var(--text)] truncate">{pageTitle}</h1>
        )}
      </div>

      {/* Search trigger */}
      <button
        onClick={() => setCommandOpen(true)}
        className={cn(
          'hidden sm:flex items-center gap-2 h-8 px-3 rounded-md',
          'border border-[var(--border)] bg-[var(--surface-2)]',
          'text-sm text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors',
          'w-48 lg:w-64',
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left text-xs">Buscar...</span>
        <kbd className="hidden lg:flex items-center gap-0.5 text-[10px] text-[var(--text-subtle)]">
          <span>⌘</span><span>K</span>
        </kbd>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Alternar tema"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Notifications bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className={cn(
              'relative flex items-center justify-center h-7 w-7 rounded',
              'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors',
              notifOpen && 'bg-[var(--surface-2)] text-[var(--text)]',
            )}
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className={cn(
                'absolute -top-0.5 -right-0.5 flex items-center justify-center',
                'min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold',
                'bg-danger text-white leading-none',
              )}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <NotificationDropdown onClose={() => setNotifOpen(false)} />
            )}
          </AnimatePresence>
        </div>

        {/* User avatar */}
        <div className="ml-1">
          <Avatar
            name={user ? `${user.firstName} ${user.lastName}` : ''}
            src={user?.avatarUrl}
            size="sm"
          />
        </div>
      </div>
    </header>
  );
}
