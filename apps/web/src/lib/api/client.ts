import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// ─── Token helpers ────────────────────────────────────────────────────────────
const TOKEN_KEY = 'erp_access_token';
const REFRESH_KEY = 'erp_refresh_token';
const TENANT_KEY = 'erp_tenant_id';

export const tokenStore = {
  getAccess: () => Cookies.get(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '',
  getRefresh: () => Cookies.get(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY) || '',
  getTenant: () => Cookies.get(TENANT_KEY) || localStorage.getItem(TENANT_KEY) || '',

  setTokens: (access: string, refresh: string) => {
    Cookies.set(TOKEN_KEY, access, { secure: true, sameSite: 'strict', expires: 1 / 96 }); // 15min
    Cookies.set(REFRESH_KEY, refresh, { secure: true, sameSite: 'strict', expires: 7 });
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },

  setTenant: (tenantId: string) => {
    Cookies.set(TENANT_KEY, tenantId, { expires: 365 });
    localStorage.setItem(TENANT_KEY, tenantId);
  },

  clear: () => {
    [TOKEN_KEY, REFRESH_KEY, TENANT_KEY].forEach((k) => {
      Cookies.remove(k);
      localStorage.removeItem(k);
    });
  },
};

// ─── Axios instance ───────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// Flag to prevent multiple simultaneous refresh calls
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

function processQueue(error: any, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!),
  );
  refreshQueue = [];
}

// ─── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  const tenantId = tokenStore.getTenant();

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers['X-Tenant-ID'] = tenantId;

  return config;
});

// ─── Response interceptor (token refresh) ────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) {
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${token}`,
          };
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefresh } = data.data.tokens ?? data.data;
        tokenStore.setTokens(accessToken, newRefresh);
        processQueue(null, accessToken);

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${accessToken}`,
        };

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// ─── Generic request helpers ──────────────────────────────────────────────────
export async function get<T>(url: string, params?: Record<string, any>): Promise<T> {
  const { data } = await api.get<{ data: T }>(url, { params });
  return data.data;
}

export async function post<T>(url: string, body?: any): Promise<T> {
  const { data } = await api.post<{ data: T }>(url, body);
  return data.data;
}

export async function put<T>(url: string, body?: any): Promise<T> {
  const { data } = await api.put<{ data: T }>(url, body);
  return data.data;
}

export async function patch<T>(url: string, body?: any): Promise<T> {
  const { data } = await api.patch<{ data: T }>(url, body);
  return data.data;
}

export async function del<T>(url: string): Promise<T> {
  const { data } = await api.delete<{ data: T }>(url);
  return data.data;
}
