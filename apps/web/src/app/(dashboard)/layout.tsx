'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { CommandPalette } from '@/components/layout/command-palette';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isInitialized, initialize } = useAuthStore();
  const { sidebarCollapsed } = useUIStore();

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Redirect if not authenticated
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isInitialized, router]);

  // Show nothing while checking auth
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 animate-pulse" />
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const mainLeft = sidebarCollapsed ? 68 : 260;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Sidebar */}
      <Sidebar />

      {/* Top navbar */}
      <Navbar />

      {/* Command palette */}
      <CommandPalette />

      {/* Main content */}
      <motion.main
        animate={{ marginLeft: mainLeft }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="pt-14 min-h-screen"
        style={{ marginLeft: mainLeft }}
      >
        <div className="p-6 max-w-screen-2xl mx-auto">
          {children}
        </div>
      </motion.main>
    </div>
  );
}
