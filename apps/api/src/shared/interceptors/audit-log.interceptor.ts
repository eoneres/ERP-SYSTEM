import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');
  private readonly WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, user } = request as any;

    if (!this.WRITE_METHODS.includes(method)) {
      return next.handle();
    }

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            JSON.stringify({
              action: `${method} ${url}`,
              userId: user?.id,
              tenantId: user?.tenantId,
              duration: `${Date.now() - now}ms`,
              timestamp: new Date().toISOString(),
            }),
          );
        },
      }),
    );
  }
}
