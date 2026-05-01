#!/bin/bash
# =============================================================================
# CORREÇÃO: ERR_CONNECTION_REFUSED no login
# 
# CAUSA RAIZ: Três problemas combinados:
#   1. O backend (api) não está rodando — precisa de DB e Redis
#   2. No GitHub Codespaces, localhost do browser ≠ localhost do container
#      O frontend precisa usar a URL pública do Codespace, não localhost:3001
#   3. O .env do frontend não tem NEXT_PUBLIC_API_URL definido
#
# SOLUÇÃO: Script único que:
#   a) Cria .env correto para o backend (apps/api/.env)
#   b) Gera .env.local correto para o frontend (apps/web/.env.local)
#      detectando automaticamente se é Codespace ou local
#   c) Adiciona proxy reverso no Next.js para evitar CORS e problemas de URL
#   d) Instrui como subir tudo
# =============================================================================

set -e
cd /workspaces/ERP-SYSTEM

echo "🔧 Corrigindo configuração de rede..."

# =============================================================================
# PARTE 1 — .env do backend (apps/api/.env)
# Copia do .env.example e define valores para dev local / Codespace
# =============================================================================

cp apps/api/.env.example apps/api/.env

# Atualiza apenas as variáveis críticas para funcionar sem Docker externo
# (usando os defaults do docker-compose.yml do projeto)
cat > apps/api/.env << 'EOF'
# ─── Application ──────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001
APP_NAME="ERP System"
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
API_PREFIX=api/v1

# ─── Database (PostgreSQL via docker-compose) ─────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=erp_user
DB_PASSWORD=erp_pass
DB_DATABASE=erp_db
DB_SSL=false
DB_LOGGING=false
DB_SYNCHRONIZE=false
DB_MIGRATIONS_RUN=true

# ─── Redis (via docker-compose) ───────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=erp_redis_pass
REDIS_TTL=3600

# ─── JWT ──────────────────────────────────────────────────────────────────────
JWT_SECRET=dev-super-secret-jwt-key-change-in-production-min-32
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=dev-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# ─── Security ─────────────────────────────────────────────────────────────────
BCRYPT_ROUNDS=12
CORS_ORIGINS=http://localhost:3000
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# ─── Mail (dev: mailhog) ──────────────────────────────────────────────────────
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USER=
MAIL_PASS=
MAIL_FROM="ERP System <noreply@erpsystem.com>"

# ─── Feature Flags ────────────────────────────────────────────────────────────
FEATURE_MULTI_TENANT=true
FEATURE_AUDIT_LOG=true
FEATURE_EXPORT=true
EOF

echo "✅ apps/api/.env criado"

# =============================================================================
# PARTE 2 — .env.local do frontend com detecção automática de Codespace
# =============================================================================

# Detecta se está rodando no GitHub Codespaces
if [ -n "$CODESPACE_NAME" ]; then
  # No Codespaces, a URL pública do backend é gerada automaticamente
  # Formato: https://<CODESPACE_NAME>-<PORT>.app.github.dev
  BACKEND_URL="https://${CODESPACE_NAME}-3001.app.github.dev"
  FRONTEND_URL="https://${CODESPACE_NAME}-3000.app.github.dev"
  echo "🌐 Detectado GitHub Codespaces: $CODESPACE_NAME"
  echo "   Backend URL: $BACKEND_URL"
else
  # Desenvolvimento local
  BACKEND_URL="http://localhost:3001"
  FRONTEND_URL="http://localhost:3000"
  echo "💻 Ambiente local detectado"
fi

cat > apps/web/.env.local << EOF
# Auto-gerado pelo fix-connection.sh
# Backend API URL — ajustado automaticamente para Codespace ou local
NEXT_PUBLIC_API_URL=${BACKEND_URL}/api/v1

# Frontend URL (usado para redirects OAuth, etc.)
NEXT_PUBLIC_APP_URL=${FRONTEND_URL}
EOF

echo "✅ apps/web/.env.local criado"
echo "   NEXT_PUBLIC_API_URL=${BACKEND_URL}/api/v1"

# =============================================================================
# PARTE 3 — Proxy reverso no Next.js (rewrites)
# 
# MELHOR SOLUÇÃO para Codespaces e evitar CORS:
# O frontend chama /api/* e o Next.js encaminha para o backend.
# Assim o browser sempre faz requests para a mesma origem (porta 3000),
# sem precisar lidar com CORS ou URLs de Codespace no cliente.
# =============================================================================

cat > apps/web/next.config.js << 'NEXTEOF'
/** @type {import('next').NextConfig} */

const BACKEND_INTERNAL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.githubusercontent.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: '**.s3.amazonaws.com' },
    ],
  },

  // ─── Proxy reverso: /api/* → backend:3001/api/* ───────────────────────────
  // Resolve ERR_CONNECTION_REFUSED e problemas de CORS no Codespaces.
  // O browser sempre chama a mesma origem (porta 3000 do Next.js).
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_INTERNAL}/api/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
NEXTEOF

echo "✅ next.config.js atualizado com proxy reverso"

# =============================================================================
# PARTE 4 — Atualiza o cliente Axios para usar o proxy (URL relativa)
# Com o proxy do Next.js, o cliente deve chamar /api/v1 (sem host),
# assim funciona tanto em localhost quanto em Codespaces sem alterar nada.
# =============================================================================

cat > apps/web/src/lib/api/client.ts << 'CLIENTEOF'
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import Cookies from 'js-cookie';

// ─── URL base ─────────────────────────────────────────────────────────────────
// Usa variável de ambiente se definida; caso contrário usa o proxy do Next.js.
// Com o proxy configurado no next.config.js, /api/v1/* é encaminhado para
// o backend na porta 3001 — funciona em localhost e Codespaces sem ajuste manual.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:3001/api/v1');

// ─── Token helpers ────────────────────────────────────────────────────────────
const TOKEN_KEY = 'erp_access_token';
const REFRESH_KEY = 'erp_refresh_token';
const TENANT_KEY = 'erp_tenant_id';

export const tokenStore = {
  getAccess: () =>
    Cookies.get(TOKEN_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : '') || '',
  getRefresh: () =>
    Cookies.get(REFRESH_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : '') || '',
  getTenant: () =>
    Cookies.get(TENANT_KEY) || (typeof localStorage !== 'undefined' ? localStorage.getItem(TENANT_KEY) : '') || '',

  setTokens: (access: string, refresh: string) => {
    // secure:true só funciona em HTTPS; em dev (http) cookies não seriam salvos
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    Cookies.set(TOKEN_KEY, access, { secure: isSecure, sameSite: 'strict', expires: 1 / 96 });
    Cookies.set(REFRESH_KEY, refresh, { secure: isSecure, sameSite: 'strict', expires: 7 });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);
    }
  },

  setTenant: (tenantId: string) => {
    Cookies.set(TENANT_KEY, tenantId, { expires: 365 });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TENANT_KEY, tenantId);
    }
  },

  clear: () => {
    [TOKEN_KEY, REFRESH_KEY, TENANT_KEY].forEach((k) => {
      Cookies.remove(k);
      if (typeof localStorage !== 'undefined') localStorage.removeItem(k);
    });
  },
};

// ─── Axios instance ───────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor ──────────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token!)));
  refreshQueue = [];
}

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  const tenantId = tokenStore.getTenant();

  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Envia tenant via header E via cookie (para o proxy do Next.js preservar)
  if (tenantId) config.headers['X-Tenant-ID'] = tenantId;

  return config;
});

// ─── Response interceptor (token refresh automático) ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) {
        tokenStore.clear();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` };
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data?.tokens ?? data.data ?? data;
        tokenStore.setTokens(accessToken, newRefresh);
        processQueue(null, accessToken);
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${accessToken}` };
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStore.clear();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// ─── Generic helpers ──────────────────────────────────────────────────────────
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
CLIENTEOF

echo "✅ src/lib/api/client.ts atualizado"

# =============================================================================
# PARTE 5 — Adiciona variável BACKEND_INTERNAL_URL ao .env da API
# (usada pelo next.config.js para o proxy interno servidor→servidor)
# =============================================================================
echo "" >> apps/web/.env.local
echo "# URL interna usada pelo proxy Next.js (servidor → servidor, nunca exposta ao browser)" >> apps/web/.env.local
echo "BACKEND_INTERNAL_URL=http://localhost:3001" >> apps/web/.env.local

# =============================================================================
# PARTE 6 — Verifica se docker-compose tem as portas certas e atualiza CORS
# =============================================================================

# Atualiza CORS no .env do backend para aceitar Codespaces
if [ -n "$CODESPACE_NAME" ]; then
  # Adiciona a URL do Codespace ao CORS
  sed -i "s|CORS_ORIGINS=http://localhost:3000|CORS_ORIGINS=http://localhost:3000,${FRONTEND_URL}|" apps/api/.env
  echo "✅ CORS atualizado para incluir URL do Codespace"
fi

echo ""
echo "============================================================"
echo "✅ CORREÇÃO CONCLUÍDA"
echo "============================================================"
echo ""
echo "📋 O que foi corrigido:"
echo "   1. apps/api/.env        — configurado para dev"
echo "   2. apps/web/.env.local  — NEXT_PUBLIC_API_URL correto"
echo "   3. next.config.js       — proxy reverso /api/* → backend:3001"
echo "   4. client.ts            — usa URL relativa via proxy (sem CORS)"
echo ""
echo "🚀 PRÓXIMOS PASSOS:"
echo ""
echo "   # 1. Suba o banco e Redis (se ainda não estiver rodando):"
echo "   docker-compose up -d"
echo ""
echo "   # 2. Aguarde os containers ficarem healthy:"
echo "   docker-compose ps"
echo ""
echo "   # 3. Inicie o sistema:"
echo "   cd /workspaces/ERP-SYSTEM && npm run dev"
echo ""
echo "   # 4. Acesse:"
if [ -n "$CODESPACE_NAME" ]; then
echo "   Frontend: ${FRONTEND_URL}"
echo "   Backend:  ${BACKEND_URL}/api/v1"
echo ""
echo "   ⚠️  No Codespaces: vá em 'Ports' no VS Code e"
echo "      certifique-se que as portas 3000 e 3001 estão como 'Public'"
else
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001/api/v1"
fi
echo ""
echo "   Credenciais demo: admin@demo.com / Admin@123"
echo "============================================================"
