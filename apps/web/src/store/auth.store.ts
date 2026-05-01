import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { tokenStore } from '@/lib/api/client';
import { authApi, type UserProfile, type AuthResponse } from '@/lib/api/auth.api';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  login: (response: AuthResponse) => void;
  logout: () => Promise<void>;
  setUser: (user: UserProfile) => void;
  initialize: () => Promise<void>;
  updatePreferences: (prefs: Record<string, any>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      login: (response: AuthResponse) => {
        tokenStore.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
        set({
          user: response.user,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } catch {
          // Ignore errors on logout
        } finally {
          tokenStore.clear();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      setUser: (user: UserProfile) => set({ user }),

      initialize: async () => {
        const token = tokenStore.getAccess();
        if (!token) {
          set({ isInitialized: true, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true });
        } catch {
          tokenStore.clear();
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      updatePreferences: (prefs) => {
        const user = get().user;
        if (user) set({ user: { ...user, ...prefs } });
      },
    }),
    {
      name: 'erp-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// ─── Permission helpers ───────────────────────────────────────────────────────
export function usePermission(permission: string): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return user.permissions.includes(permission) || user.permissions.includes('*');
}

export function useRole(...roles: string[]): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  return roles.includes(user.role);
}
