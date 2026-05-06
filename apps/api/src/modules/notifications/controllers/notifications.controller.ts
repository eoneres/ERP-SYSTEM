import {
  Controller, Get, Patch, Param, Query,
  UseGuards, Sse, MessageEvent, Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Observable, fromEvent, map } from 'rxjs';
import { NotificationsService } from '../services/notifications.service';
import { JwtAuthGuard } from '@modules/auth/guards/auth.guard';
import { CurrentUser, CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@shared/dto/api-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações do usuário' })
  async findAll(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('unread') unread?: string,
  ) {
    const data = await this.svc.getForUser(tenantId, userId, unread === 'true');
    return ApiResponse.ok(data);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contagem de notificações não lidas' })
  async unreadCount(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const count = await this.svc.countUnread(tenantId, userId);
    return ApiResponse.ok({ count });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  async markRead(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.svc.markRead(id, tenantId);
    return ApiResponse.ok(null, 'Notificação marcada como lida');
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas como lidas' })
  async markAllRead(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.svc.markAllRead(tenantId, userId);
    return ApiResponse.ok(null, 'Todas as notificações marcadas como lidas');
  }

  @Sse('stream')
  @ApiOperation({ summary: 'SSE — stream de notificações em tempo real' })
  stream(@CurrentTenantId() tenantId: string): Observable<MessageEvent> {
    const subject = this.svc.getStream(tenantId);
    return new Observable((observer) => {
      const sub = subject.subscribe({
        next:  (notif) => observer.next({ data: JSON.stringify(notif) } as MessageEvent),
        error: (err)   => observer.error(err),
      });
      return () => sub.unsubscribe();
    });
  }
}
