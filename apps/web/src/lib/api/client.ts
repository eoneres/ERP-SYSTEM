import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import Cookies from 'js-cookie';

// ─── IMPORTANTE ──────────────────────────────────────────────────────────────
// Sempre usa URL relativa /api/v1 — o browser chama a mesma origem (porta 3000)
// e o Next.js faz o proxy interno para localhost:3001.
// Isso funciona em localhost, Codespaces e produção sem nenhuma configuração extra.
// NUNCA use process.env.NEXT_PUBLIC_API_URL aqui pois isso faria o browser
// chamar a porta 3001 diretamente, causando erro de CORS.
const API_BASE = '/api/v1';

// ─── Token helpers ────────────────────────────────────────────────────────────
const TOKEN_KEY   = 'erp_access_token';
const REFRESH_KEY = 'erp_refresh_token';
const TENANT_KEY  = 'erp_tenant_id';

const isBrowser = typeof window !== 'undefined';

export const tokenStore = {
  getAccess:   () => Cookies.get(TOKEN_KEY)   || (isBrowser ? localStorage.getItem(TOKEN_KEY)   : '') || '',
  getRefresh:  () => Cookies.get(REFRESH_KEY) || (isBrowser ? localStorage.getItem(REFRESH_KEY) : '') || '',
  getTenant:   () => Cookies.get(TENANT_KEY)  || (isBrowser ? localStorage.getItem(TENANT_KEY)  : '') || '',

  setTokens: (access: string, refresh: string) => {
    const secure = isBrowser && window.location.protocol === 'https:';
    Cookies.set(TOKEN_KEY,   access,  { secure, sameSite: 'strict', expires: 1 / 96 }); // 15min
    Cookies.set(REFRESH_KEY, refresh, { secure, sameSite: 'strict', expires: 7 });
    if (isBrowser) {
      localStorage.setItem(TOKEN_KEY,   access);
      localStorage.setItem(REFRESH_KEY, refresh);
    }
  },

  setTenant: (tenantId: string) => {
    Cookies.set(TENANT_KEY, tenantId, { expires: 365 });
    if (isBrowser) localStorage.setItem(TENANT_KEY, tenantId);
  },

  clear: () => {
    [TOKEN_KEY, REFRESH_KEY, TENANT_KEY].forEach((k) => {
      Cookies.remove(k);
      if (isBrowser) localStorage.removeItem(k);
    });
  },
};

// ─── Axios instance ───────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor ──────────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token!)));
  refreshQueue = [];
}

api.interceptors.request.use((config) => {
  const token    = tokenStore.getAccess();
  const tenantId = tokenStore.getTenant() || 'demo-tenant'; // fallback sempre presente

  if (token)    config.headers.Authorization  = `Bearer ${token}`;
  config.headers['X-Tenant-ID'] = tenantId;

  return config;
});

// ─── Response interceptor — refresh automático ───────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const orig = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !orig._retry) {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) {
        tokenStore.clear();
        if (isBrowser) window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          orig.headers = { ...orig.headers, Authorization: `Bearer ${token}` };
          return api(orig);
        });
      }

      orig._retry   = true;
      isRefreshing  = true;

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } =
          data.data?.tokens ?? data.data ?? data;
        tokenStore.setTokens(accessToken, newRefresh);
        processQueue(null, accessToken);
        orig.headers = { ...orig.headers, Authorization: `Bearer ${accessToken}` };
        return api(orig);
      } catch (e) {
        processQueue(e, null);
        tokenStore.clear();
        if (isBrowser) window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default api;

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await api.get<{ data: T }>(url, { params });
  return data.data;
}
export async function post<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.post<{ data: T }>(url, body);
  return data.data;
}
export async function put<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.put<{ data: T }>(url, body);
  return data.data;
}
export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.patch<{ data: T }>(url, body);
  return data.data;
}
export async function del<T>(url: string): Promise<T> {
  const { data } = await api.delete<{ data: T }>(url);
  return data.data;
}
