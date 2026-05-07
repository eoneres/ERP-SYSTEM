import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

export const RATE_LIMIT_PROFILE_KEY = 'rateLimitProfile';

export type RateLimitProfile = 'auth' | 'reports' | 'finance' | 'default';

/**
 * Limites por perfil de domínio.
 * auth    — anti brute-force: 10 req/min
 * reports — anti abuso de exportação: 5 req/min
 * finance — operações financeiras: 30 req/min
 * default — padrão global: 100 req/min
 */
export const RATE_LIMIT_PROFILES: Record<RateLimitProfile, { ttl: number; limit: number }> = {
  auth:    { ttl: 60_000, limit: 10  },
  reports: { ttl: 60_000, limit: 5   },
  finance: { ttl: 60_000, limit: 30  },
  default: { ttl: 60_000, limit: 100 },
};

export function RateLimit(profile: RateLimitProfile) {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_PROFILE_KEY, profile),
    UseGuards(ThrottlerGuard),
  );
}
