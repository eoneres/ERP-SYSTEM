import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  toggleCollapsed: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Command palette
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  toggleCommand: () => void;

  // Page state
  pageTitle: string;
  setPageTitle: (title: string) => void;

  // Breadcrumbs
  breadcrumbs: { label: string; href?: string }[];
  setBreadcrumbs: (items: { label: string; href?: string }[]) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Sidebar
      sidebarOpen: true,
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Command palette
      commandOpen: false,
      setCommandOpen: (open) => set({ commandOpen: open }),
      toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),

      // Page
      pageTitle: 'Dashboard',
      setPageTitle: (title) => set({ pageTitle: title }),

      // Breadcrumbs
      breadcrumbs: [],
      setBreadcrumbs: (items) => set({ breadcrumbs: items }),
    }),
    {
      name: 'erp-ui',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    },
  ),
);
