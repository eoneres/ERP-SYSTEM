import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { JwtAuthGuard } from '@modules/auth/guards/auth.guard';
import { CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@shared/dto/api-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumo executivo consolidado de todos os módulos' })
  async getSummary(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getSummary(tenantId));
  }

  @Get('activity')
  @ApiOperation({ summary: 'Feed de atividades recentes (últimas 20)' })
  async getActivity(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getActivity(tenantId));
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Alertas operacionais: estoque baixo, vencidos, pedidos pendentes' })
  async getAlerts(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getAlerts(tenantId));
  }
}
