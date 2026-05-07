import {
  Controller, Get, Post, Body, Query, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsUUID, IsOptional } from 'class-validator';
import { ReportsService, GenerateReportDto } from '../services/reports.service';
import { ReportModule } from '../entities/report-template.entity';
import { ExportFormat } from '../entities/report-execution.entity';
import { JwtAuthGuard } from '@modules/auth/guards/auth.guard';
import { RequirePermissions } from '@modules/auth/guards/auth.guard';
import { CurrentUser, CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@shared/dto/api-response.dto';
import { RateLimit } from '@shared/decorators/rate-limit.decorator';
import { PERMISSIONS } from '@shared/permissions';

class GenerateDto implements GenerateReportDto {
  @ApiProperty() @IsUUID() templateId: string;
  @ApiProperty({ enum: ExportFormat }) @IsEnum(ExportFormat) format: ExportFormat;
  @ApiPropertyOptional() @IsOptional() @IsObject() parameters: Record<string, any> = {};
}

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RateLimit('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('templates')
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Listar templates de relatório' })
  @ApiQuery({ name: 'module', enum: ReportModule, required: false })
  async getTemplates(
    @CurrentTenantId() tenantId: string,
    @Query('module') module?: ReportModule,
  ) {
    return ApiResponse.ok(await this.svc.getTemplates(tenantId, module));
  }

  @Get('templates/:id')
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Buscar template por ID' })
  async getTemplate(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getTemplate(id, tenantId));
  }

  @Post('generate')
  @RequirePermissions(PERMISSIONS.REPORTS_GENERATE)
  @ApiOperation({ summary: 'Gerar relatório — enfileira no BullMQ (retorna executionId) ou executa inline se Redis indisponível' })
  async generate(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateDto,
  ) {
    const result = await this.svc.generate(tenantId, userId, dto);
    const msg = (result as any).queued
      ? 'Relatório enfileirado — acompanhe o status em Histórico'
      : `Relatório gerado: ${(result as any).rowCount} registros`;
    return ApiResponse.ok(result, msg);
  }

  @Get('executions')
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Histórico de relatórios gerados' })
  async getExecutions(
    @CurrentTenantId() tenantId: string,
    @Query('page')  page:  string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const p = Math.max(1, parseInt(page,  10) || 1);
    const l = Math.max(1, parseInt(limit, 10) || 20);
    const { items, total } = await this.svc.getExecutions(tenantId, p, l);
    return ApiResponse.paginated(items, total, p, l);
  }
}
