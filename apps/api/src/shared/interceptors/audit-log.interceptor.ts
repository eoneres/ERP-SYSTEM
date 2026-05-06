import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditService } from '@modules/audit/services/audit.service';

const SKIP_METHODS = ['GET', 'OPTIONS', 'HEAD'];
const SKIP_URLS    = ['/notifications/stream', '/dashboard/', '/audit'];

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req  = context.switchToHttp().getRequest<Request>();
    const res  = context.switchToHttp().getResponse<Response>();
    const { method, url, body, ip, headers } = req;
    const user = (req as any).user;

    // Skip read-only and noisy endpoints
    if (SKIP_METHODS.includes(method)) return next.handle();
    if (SKIP_URLS.some((s) => url.includes(s))) return next.handle();

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.auditService.log({
            tenantId:    user?.tenantId,
            userId:      user?.id,
            userEmail:   user?.email,
            userName:    user ? `${user.firstName} ${user.lastName}` : undefined,
            method,
            url,
            statusCode:  res.statusCode,
            durationMs:  Date.now() - start,
            ipAddress:   (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? ip,
            userAgent:   headers['user-agent'],
            requestBody: body,
            success:     true,
          });
        },
        error: (err) => {
          this.auditService.log({
            tenantId:     user?.tenantId,
            userId:       user?.id,
            userEmail:    user?.email,
            userName:     user ? `${user.firstName} ${user.lastName}` : undefined,
            method,
            url,
            statusCode:   err?.status ?? 500,
            durationMs:   Date.now() - start,
            ipAddress:    (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? ip,
            userAgent:    headers['user-agent'],
            requestBody:  body,
            errorMessage: err?.message,
            success:      false,
          });
        },
      }),
    );
  }
}
