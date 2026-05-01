#!/bin/bash
# =============================================================================
# CORREÇÃO DEFINITIVA — CORS + Proxy no Codespaces
# 
# CAUSA: NEXT_PUBLIC_API_URL aponta para porta 3001 externa.
#        Variáveis NEXT_PUBLIC_* são embutidas no bundle do browser em build time,
#        então o browser chama direto a porta 3001 — bypassando o proxy do Next.js.
#
# SOLUÇÃO CORRETA:
#   - O browser NUNCA deve saber que existe uma porta 3001
#   - O client.ts deve usar URL relativa (/api/v1) — sem host, sem porta
#   - O proxy do Next.js encaminha /api/* → http://localhost:3001 (server-side)
#   - O backend aceita CORS de qualquer origem *.app.github.dev em dev
# =============================================================================

set -e
cd /workspaces/ERP-SYSTEM

echo "🔧 Corrigindo CORS e proxy..."

# =============================================================================
# 1. apps/web/.env.local — REMOVE NEXT_PUBLIC_API_URL
#    O client.ts usará URL relativa /api/v1 diretamente.
#    BACKEND_INTERNAL_URL fica apenas para o Next.js (server-side, não exposto).
# =============================================================================
cat > apps/web/.env.local << 'EOF'
# ATENÇÃO: NÃO defina NEXT_PUBLIC_API_URL aqui.
# O cliente usa URL relativa (/api/v1) que passa pelo proxy do Next.js.
# Isso funciona tanto em localhost quanto em Codespaces sem nenhuma alteração.

# URL interna usada APENAS pelo servidor Next.js para fazer o proxy (nunca exposta ao browser)
BACKEND_INTERNAL_URL=http://localhost:3001
EOF

echo "✅ apps/web/.env.local corrigido (sem NEXT_PUBLIC_API_URL)"

# =============================================================================
# 2. apps/web/src/lib/api/client.ts — força URL relativa /api/v1
#    Remove qualquer leitura de NEXT_PUBLIC_API_URL
# =============================================================================
cat > apps/web/src/lib/api/client.ts << 'CLIENTEOF'
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
CLIENTEOF

echo "✅ client.ts corrigido — URL relativa /api/v1"

# =============================================================================
# 3. next.config.js — proxy robusto com log de destino
# =============================================================================
cat > apps/web/next.config.js << 'NEXTEOF'
/** @type {import('next').NextConfig} */

// URL interna do backend — usada APENAS pelo servidor Next.js (nunca exposta ao browser)
const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.githubusercontent.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
    ],
  },

  // ─── Proxy reverso ───────────────────────────────────────────────────────
  // /api/v1/* no browser → BACKEND/api/v1/* internamente (server-to-server)
  // Elimina CORS e URLs hardcoded de Codespace.
  async rewrites() {
    console.log(`[proxy] /api/* → ${BACKEND}/api/*`);
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND}/api/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',   value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
NEXTEOF

echo "✅ next.config.js atualizado"

# =============================================================================
# 4. apps/api/src/main.ts — CORS aceita *.app.github.dev e localhost
# =============================================================================
cat > apps/api/src/main.ts << 'MAINEOF'
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@shared/filters/all-exceptions.filter';
import { ResponseTransformInterceptor } from '@shared/interceptors/response-transform.interceptor';
import { AuditLogInterceptor } from '@shared/interceptors/audit-log.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port      = configService.get<number>('PORT', 3001);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const nodeEnv   = configService.get<string>('NODE_ENV', 'development');

  app.use(helmet.default());
  app.use(compression());
  app.use(cookieParser());

  // ─── CORS ──────────────────────────────────────────────────────────────────
  // Em desenvolvimento: aceita qualquer origem *.app.github.dev (Codespaces),
  // localhost e 127.0.0.1. Em produção: somente origens explícitas.
  const allowedOrigins = (configService.get<string>('CORS_ORIGINS', 'http://localhost:3000'))
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Sem origin = request server-side (proxy Next.js) — sempre permitir
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        (nodeEnv === 'development' && (
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.app.github.dev')   // Codespaces
        ));

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID'],
  });

  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({ type: VersioningType.URI });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new ResponseTransformInterceptor(),
    new AuditLogInterceptor(),
  );

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ERP System API')
      .setDescription('Enterprise Resource Planning - REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-Tenant-ID', in: 'header' }, 'tenant-id')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port, '0.0.0.0');

  console.log(`
  ╔══════════════════════════════════════════╗
  ║          ERP SYSTEM API v1.0             ║
  ╠══════════════════════════════════════════╣
  ║  Port:  ${port}                              ║
  ║  Env:   ${nodeEnv.padEnd(32)}║
  ╚══════════════════════════════════════════╝
  `);
}

bootstrap();
MAINEOF

echo "✅ main.ts corrigido — CORS aceita *.app.github.dev"

echo ""
echo "============================================================"
echo "✅ CORREÇÃO CONCLUÍDA"
echo ""
echo "🚀 Reinicie o servidor:"
echo "   cd /workspaces/ERP-SYSTEM && npm run dev"
echo ""
echo "   Login: http://localhost:3000/login"
echo "          admin@demo.com / Admin@123"
echo "============================================================"
