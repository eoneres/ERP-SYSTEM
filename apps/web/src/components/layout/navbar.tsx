'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Bell, Moon, Sun, Menu, X,
  Command,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as React from 'react';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const { sidebarCollapsed, pageTitle, breadcrumbs, sidebarOpen, setSidebarOpen, setCommandOpen } =
    useUIStore();
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();

  // Keyboard shortcut: Ctrl+K / Cmd+K → command palette
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
                {i > 0 && (
                  <span className="text-[var(--text-subtle)]">/</span>
                )}
                <span
                  className={cn(
                    i === breadcrumbs.length - 1
                      ? 'text-[var(--text)] font-medium'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer',
                  )}
                >
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

        {/* Notifications */}
        <div className="relative">
          <Button variant="ghost" size="icon-sm" aria-label="Notificações">
            <Bell className="h-4 w-4" />
          </Button>
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-danger" />
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
