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
