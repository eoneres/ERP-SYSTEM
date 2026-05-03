import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@shared/dto/api-response.dto';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // CORREÇÃO: se o handler já retornou um ApiResponse (ex: ApiResponse.paginated),
        // não envolve novamente — retorna como está.
        if (data instanceof ApiResponse) {
          return data;
        }
        // Verifica duck-typing: objeto com { success, data, timestamp }
        if (
          data !== null &&
          typeof data === 'object' &&
          'success' in data &&
          'timestamp' in data
        ) {
          return data;
        }
        return ApiResponse.ok(data);
      }),
    );
  }
}
