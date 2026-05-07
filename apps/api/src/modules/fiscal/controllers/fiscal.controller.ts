import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FiscalService } from '../services/fiscal.service';
import {
  CreateInvoiceSeriesDto, UpdateInvoiceSeriesDto,
  IssueFiscalDocumentDto, FiscalDocumentFilterDto,
} from '../dto/fiscal.dto';
import { JwtAuthGuard, RequirePermissions } from '@modules/auth/guards/auth.guard';
import { CurrentUser, CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@shared/dto/api-response.dto';
import { PERMISSIONS } from '@shared/permissions';

// ─── Series ───────────────────────────────────────────────────────────────────
@ApiTags('Fiscal - Series')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fiscal/series')
export class InvoiceSeriesController {
  constructor(private readonly svc: FiscalService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.FISCAL_VIEW)
  @ApiOperation({ summary: 'Listar séries fiscais' })
  async findAll(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getSeries(tenantId));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.FISCAL_SERIES_CREATE)
  @ApiOperation({ summary: 'Criar série fiscal' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateInvoiceSeriesDto) {
    return ApiResponse.ok(await this.svc.createSeries(tenantId, userId, dto), 'Série criada');
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.FISCAL_SERIES_UPDATE)
  @ApiOperation({ summary: 'Atualizar série fiscal' })
  async update(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: UpdateInvoiceSeriesDto) {
    return ApiResponse.ok(await this.svc.updateSeries(id, tenantId, userId, dto), 'Série atualizada');
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.FISCAL_SERIES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir série fiscal (somente sem documentos emitidos)' })
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.svc.deleteSeries(id, tenantId);
  }
}

// ─── Documents ────────────────────────────────────────────────────────────────
@ApiTags('Fiscal - Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fiscal/documents')
export class FiscalDocumentsController {
  constructor(private readonly svc: FiscalService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.FISCAL_VIEW)
  @ApiOperation({ summary: 'Listar documentos fiscais' })
  async findAll(@CurrentTenantId() tenantId: string, @Query() filter: FiscalDocumentFilterDto) {
    const { items, total } = await this.svc.getDocuments(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.FISCAL_VIEW)
  @ApiOperation({ summary: 'Buscar documento fiscal' })
  async findOne(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getDocument(id, tenantId));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.FISCAL_DOCUMENT_ISSUE)
  @ApiOperation({ summary: 'Emitir documento fiscal (gera XML base + numeração sequencial)' })
  async issue(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: IssueFiscalDocumentDto) {
    return ApiResponse.ok(await this.svc.issueDocument(tenantId, userId, dto), 'Documento fiscal emitido');
  }

  @Patch(':id/cancel')
  @RequirePermissions(PERMISSIONS.FISCAL_DOCUMENT_CANCEL)
  @ApiOperation({ summary: 'Cancelar documento fiscal (somente DRAFT/PENDING)' })
  async cancel(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string) {
    return ApiResponse.ok(await this.svc.cancelDocument(id, tenantId, userId), 'Documento cancelado');
  }
}
