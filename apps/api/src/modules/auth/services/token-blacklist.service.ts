import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly PREFIX = 'token:blacklist:';

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Revoga um JTI com TTL igual ao tempo restante do token.
   * @param jti — JWT ID (campo `jti` do payload)
   * @param exp — timestamp de expiração Unix (campo `exp` do payload)
   */
  async revoke(jti: string, exp: number): Promise<void> {
    const ttlMs = Math.max(0, exp * 1000 - Date.now());
    if (ttlMs <= 0) return;
    try {
      await this.cache.set(`${this.PREFIX}${jti}`, '1', ttlMs);
      this.logger.debug(`[TokenBlacklist] JTI ${jti} revogado por ${Math.round(ttlMs / 1000)}s`);
    } catch (err: any) {
      // Redis indisponível — loga mas não bloqueia o logout
      this.logger.warn(`[TokenBlacklist] Falha ao revogar JTI ${jti}: ${err.message}`);
    }
  }

  /**
   * Verifica se um JTI está revogado.
   * Fail-open: se Redis estiver indisponível, retorna false para não bloquear usuários legítimos.
   */
  async isRevoked(jti: string): Promise<boolean> {
    try {
      const val = await this.cache.get(`${this.PREFIX}${jti}`);
      return val !== null && val !== undefined;
    } catch {
      return false;
    }
  }
}
