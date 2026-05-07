import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException, UnauthorizedException, Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../entities/tenant.entity';
import { IS_PUBLIC_KEY } from '@modules/auth/guards/auth.guard';

@Injectable()
export class TenantStatusGuard implements CanActivate {
  private readonly logger = new Logger(TenantStatusGuard.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Rotas públicas (login, register, health) não precisam de tenant ativo
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId: string | undefined = request.user?.tenantId;

    // Se não há tenantId no JWT (ex: super_admin sem tenant), permite
    if (!tenantId) return true;

    const tenant = await this.tenantRepo.findOne({
      where: { id: tenantId },
      select: ['id', 'status', 'trialEndsAt', 'subscriptionEndsAt'],
    });

    if (!tenant) {
      this.logger.warn(`[TenantStatusGuard] Tenant ${tenantId} não encontrado`);
      throw new UnauthorizedException('Tenant não encontrado');
    }

    if (tenant.status === TenantStatus.CANCELLED) {
      throw new ForbiddenException('Tenant cancelado. Entre em contato com o suporte.');
    }

    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new ForbiddenException('Tenant suspenso. Entre em contato com o suporte.');
    }

    if (tenant.status === TenantStatus.TRIAL) {
      if (tenant.trialEndsAt && new Date() > tenant.trialEndsAt) {
        throw new ForbiddenException(
          `Período de trial expirado em ${tenant.trialEndsAt.toLocaleDateString('pt-BR')}. Faça upgrade do plano.`,
        );
      }
    }

    return true;
  }
}
