import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from '../services/audit.service';
import { JwtAuthGuard, Roles } from '@modules/auth/guards/auth.guard';
import { CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@shared/dto/api-response.dto';
import { UserRole } from '@modules/auth/entities/user.entity';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.MANAGER)
@Controller('audit')
export class AuditController {
  constructor(private readonly svc: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Listar logs de auditoria' })
  async getLogs(
    @CurrentTenantId() tenantId: string,
    @Query('module')   module?:   string,
    @Query('userId')   userId?:   string,
    @Query('action')   action?:   string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo')   dateTo?:   string,
    @Query('success')  success?:  string,
    @Query('page')     page?:     string,
    @Query('limit')    limit?:    string,
  ) {
    const { items, total } = await this.svc.getLogs(tenantId, {
      module, userId, action, dateFrom, dateTo,
      success:  success !== undefined ? success === 'true' : undefined,
      page:     parseInt(page  ?? '1',  10),
      limit:    parseInt(limit ?? '50', 10),
    });
    const p = parseInt(page ?? '1', 10);
    const l = parseInt(limit ?? '50', 10);
    return ApiResponse.paginated(items, total, p, l);
  }

  @Get('modules')
  @ApiOperation({ summary: 'Listar módulos com logs' })
  async getModules(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getModules(tenantId));
  }
}
