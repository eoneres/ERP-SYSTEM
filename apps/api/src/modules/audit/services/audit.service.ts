import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
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

// Padrões LGPD — aplicados recursivamente em todo o body
const SENSITIVE_KEYS = new Set([
  'password', 'passwordHash', 'refreshToken', 'token', 'secret',
  'creditCard', 'cardNumber', 'cvv', 'pin',
  'cpf', 'cnpj', 'document', 'rg', 'passport',
  'phone', 'telefone', 'celular', 'mobile',
  'email', 'e-mail',
  'salary', 'salario', 'wage', 'income',
  'bankAccount', 'accountNumber', 'agencyNumber', 'pix',
]);

const CPF_RE    = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CNPJ_RE   = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const EMAIL_RE  = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE  = /\b(?:\+?55\s?)?(?:\(?\d{2}\)?[\s\-]?)?\d{4,5}[\s\-]?\d{4}\b/g;
const CARD_RE   = /\b(?:\d[ \-]?){13,19}\b/g;

function maskString(value: string): string {
  return value
    .replace(CPF_RE,   '[CPF]')
    .replace(CNPJ_RE,  '[CNPJ]')
    .replace(EMAIL_RE, '[EMAIL]')
    .replace(PHONE_RE, '[PHONE]')
    .replace(CARD_RE,  '[CARD]');
}

function sanitizeBody(body: any, depth = 0): Record<string, any> | undefined {
  if (!body || typeof body !== 'object' || depth > 5) return body ?? undefined;
  if (Array.isArray(body)) return body.map((i) => sanitizeBody(i, depth + 1)) as any;

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(body)) {
    const lk = key.toLowerCase();
    if ([...SENSITIVE_KEYS].some((k) => lk.includes(k))) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'string') {
      clean[key] = maskString(val);
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeBody(val, depth + 1);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

// Módulos sensíveis cujos GETs devem ser auditados
const READ_AUDIT_MODULES = new Set(['sales', 'finance', 'hr']);

// Retenção padrão por módulo (dias). Configurável via env.
const RETENTION_DAYS: Record<string, number> = {
  auth:     Number(process.env.AUDIT_RETENTION_AUTH_DAYS    ?? 365),
  finance:  Number(process.env.AUDIT_RETENTION_FINANCE_DAYS ?? 1825), // 5 anos
  hr:       Number(process.env.AUDIT_RETENTION_HR_DAYS      ?? 1825),
  default:  Number(process.env.AUDIT_RETENTION_DEFAULT_DAYS ?? 180),
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      const module = inferModule(dto.url);
      const action = inferAction(dto.method, dto.url);

      // Não audita GETs de módulos não-sensíveis para reduzir volume
      if (dto.method === 'GET' && !READ_AUDIT_MODULES.has(module)) return;

      const entry = this.repo.create({
        ...dto,
        module,
        action,
        resourceId:  inferResourceId(dto.url),
        requestBody: sanitizeBody(dto.requestBody),
      });
      await this.repo.save(entry);
    } catch {
      // Never throw from audit — it must not break the main flow
    }
  }

  /** Purga logs expirados — executa diariamente às 03:00 */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredLogs(): Promise<void> {
    try {
      const modules = Object.keys(RETENTION_DAYS).filter((k) => k !== 'default');
      let total = 0;

      for (const mod of modules) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - RETENTION_DAYS[mod]);
        const result = await this.repo.delete({
          module: mod,
          createdAt: LessThan(cutoff) as any,
        });
        total += result.affected ?? 0;
      }

      // Purga módulos sem regra específica com retenção padrão
      const cutoffDefault = new Date();
      cutoffDefault.setDate(cutoffDefault.getDate() - RETENTION_DAYS.default);
      const result = await this.repo
        .createQueryBuilder()
        .delete()
        .where('module NOT IN (:...modules)', { modules })
        .andWhere('createdAt < :cutoff', { cutoff: cutoffDefault })
        .execute();
      total += result.affected ?? 0;

      if (total > 0) this.logger.log(`[Audit Purge] ${total} logs expirados removidos`);
    } catch (err) {
      this.logger.error('[Audit Purge] Falha na purga de logs', err);
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
