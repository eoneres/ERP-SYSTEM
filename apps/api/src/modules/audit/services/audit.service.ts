import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface CreateAuditLogDto {
  tenantId?:    string;
  userId?:      string;
  userEmail?:   string;
  userName?:    string;
  method:       string;
  url:          string;
  statusCode?:  number;
  durationMs?:  number;
  ipAddress?:   string;
  userAgent?:   string;
  requestBody?: Record<string, any>;
  errorMessage?: string;
  success:      boolean;
}

// Infer module and action from URL + method
function inferModule(url: string): string {
  const segments = url.replace('/api/v1/', '').split('/');
  const first = segments[0] ?? 'system';
  const map: Record<string, string> = {
    auth: 'auth', finance: 'finance', inventory: 'inventory',
    sales: 'sales', hr: 'hr', reports: 'reports',
    tenants: 'settings', dashboard: 'dashboard',
    notifications: 'notifications',
  };
  return map[first] ?? first;
}

function inferAction(method: string, url: string): string {
  if (url.includes('/login'))       return 'login';
  if (url.includes('/logout'))      return 'logout';
  if (url.includes('/register'))    return 'register';
  if (url.includes('/pay'))         return 'pay';
  if (url.includes('/confirm'))     return 'confirm';
  if (url.includes('/invoice'))     return 'invoice';
  if (url.includes('/cancel'))      return 'cancel';
  if (url.includes('/mark-paid'))   return 'mark_paid';
  if (url.includes('/toggle'))      return 'toggle_status';
  if (url.includes('/permissions')) return 'update_permissions';
  if (url.includes('/checkout'))    return 'checkout';
  const map: Record<string, string> = {
    POST: 'create', PUT: 'update', PATCH: 'update',
    DELETE: 'delete', GET: 'read',
  };
  return map[method] ?? method.toLowerCase();
}

function inferResourceId(url: string): string | undefined {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  return url.match(uuidRegex)?.[0];
}

function sanitizeBody(body: any): Record<string, any> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const SENSITIVE = ['password', 'passwordHash', 'refreshToken', 'token', 'secret', 'creditCard'];
  const clean = { ...body };
  for (const key of SENSITIVE) {
    if (key in clean) clean[key] = '[REDACTED]';
  }
  return clean;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      const entry = this.repo.create({
        ...dto,
        module:      inferModule(dto.url),
        action:      inferAction(dto.method, dto.url),
        resourceId:  inferResourceId(dto.url),
        requestBody: sanitizeBody(dto.requestBody),
      });
      await this.repo.save(entry);
    } catch {
      // Never throw from audit — it must not break the main flow
    }
  }

  async getLogs(
    tenantId: string,
    filters: {
      module?:   string;
      userId?:   string;
      action?:   string;
      dateFrom?: string;
      dateTo?:   string;
      success?:  boolean;
      page?:     number;
      limit?:    number;
    },
  ) {
    const { module, userId, action, dateFrom, dateTo, success, page = 1, limit = 50 } = filters;

    const qb = this.repo.createQueryBuilder('a')
      .where('(a.tenantId = :tenantId OR a.tenantId IS NULL)', { tenantId })
      .orderBy('a.createdAt', 'DESC');

    if (module)   qb.andWhere('a.module = :module',     { module });
    if (userId)   qb.andWhere('a.userId = :userId',     { userId });
    if (action)   qb.andWhere('a.action = :action',     { action });
    if (dateFrom) qb.andWhere('a.createdAt >= :dateFrom', { dateFrom });
    if (dateTo)   qb.andWhere('a.createdAt <= :dateTo',   { dateTo });
    if (success !== undefined) qb.andWhere('a.success = :success', { success });

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getModules(tenantId: string): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('a')
      .select('DISTINCT a.module', 'module')
      .where('(a.tenantId = :tenantId OR a.tenantId IS NULL)', { tenantId })
      .andWhere('a.module IS NOT NULL')
      .getRawMany();
    return rows.map((r) => r.module).filter(Boolean).sort();
  }
}
