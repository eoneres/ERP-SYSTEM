import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CrmService } from '../services/crm.service';
import {
  CreateLeadDto, UpdateLeadDto, MoveLeadDto, ConvertLeadDto, LeadFilterDto,
  CreateQuoteDto, UpdateQuoteDto,
  CreateInteractionDto, UpdateInteractionDto,
} from '../dto/crm.dto';
import { JwtAuthGuard } from '@modules/auth/guards/auth.guard';
import { CurrentUser, CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@shared/dto/api-response.dto';

// ─── Leads ────────────────────────────────────────────────────────────────────
@ApiTags('CRM - Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/leads')
export class LeadsController {
  constructor(private readonly svc: CrmService) {}

  @Get()
  @ApiOperation({ summary: 'Listar leads' })
  async findAll(@CurrentTenantId() tenantId: string, @Query() filter: LeadFilterDto) {
    const { items, total } = await this.svc.getLeads(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar lead' })
  async findOne(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getLead(id, tenantId));
  }

  @Post()
  @ApiOperation({ summary: 'Criar lead' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateLeadDto) {
    return ApiResponse.ok(await this.svc.createLead(tenantId, userId, dto), 'Lead criado');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar lead' })
  async update(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: UpdateLeadDto) {
    return ApiResponse.ok(await this.svc.updateLead(id, tenantId, userId, dto), 'Lead atualizado');
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Mover lead no pipeline (Kanban)' })
  async move(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: MoveLeadDto) {
    return ApiResponse.ok(await this.svc.moveLead(id, tenantId, userId, dto), 'Lead movido');
  }

  @Patch(':id/convert')
  @ApiOperation({ summary: 'Converter lead em Cliente' })
  async convert(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: ConvertLeadDto) {
    return ApiResponse.ok(await this.svc.convertLead(id, tenantId, userId, dto), 'Lead convertido em cliente');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.svc.deleteLead(id, tenantId);
  }
}

// ─── Quotes ───────────────────────────────────────────────────────────────────
@ApiTags('CRM - Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/quotes')
export class QuotesController {
  constructor(private readonly svc: CrmService) {}

  @Get('lead/:leadId')
  @ApiOperation({ summary: 'Listar propostas de um lead' })
  async findByLead(@Param('leadId') leadId: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getQuotes(tenantId, leadId));
  }

  @Post()
  @ApiOperation({ summary: 'Criar proposta' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateQuoteDto) {
    return ApiResponse.ok(await this.svc.createQuote(tenantId, userId, dto), 'Proposta criada');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar proposta' })
  async update(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: UpdateQuoteDto) {
    return ApiResponse.ok(await this.svc.updateQuote(id, tenantId, userId, dto), 'Proposta atualizada');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.svc.deleteQuote(id, tenantId);
  }
}

// ─── Interactions ─────────────────────────────────────────────────────────────
@ApiTags('CRM - Interactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/interactions')
export class InteractionsController {
  constructor(private readonly svc: CrmService) {}

  @Get('lead/:leadId')
  @ApiOperation({ summary: 'Listar interações de um lead' })
  async findByLead(@Param('leadId') leadId: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getInteractions(tenantId, leadId));
  }

  @Post()
  @ApiOperation({ summary: 'Registrar interação' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateInteractionDto) {
    return ApiResponse.ok(await this.svc.createInteraction(tenantId, userId, dto), 'Interação registrada');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar interação' })
  async update(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: UpdateInteractionDto) {
    return ApiResponse.ok(await this.svc.updateInteraction(id, tenantId, userId, dto), 'Interação atualizada');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.svc.deleteInteraction(id, tenantId);
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
@ApiTags('CRM - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm/dashboard')
export class CrmDashboardController {
  constructor(private readonly svc: CrmService) {}

  @Get('summary')
  async getSummary(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getSummary(tenantId));
  }

  @Get('kanban')
  @ApiOperation({ summary: 'Leads agrupados por stage para o Kanban' })
  async getKanban(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getKanban(tenantId));
  }
}
