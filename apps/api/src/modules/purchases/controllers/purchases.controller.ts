import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchasesService } from '../services/purchases.service';
import {
  CreateSupplierDto, UpdateSupplierDto, SupplierFilterDto,
  CreatePurchaseOrderDto, UpdatePurchaseOrderDto,
  ConfirmPurchaseDto, ReceivePurchaseDto, OrderFilterDto,
} from '../dto/purchases.dto';
import { JwtAuthGuard, RequirePermissions } from '@modules/auth/guards/auth.guard';
import { CurrentUser, CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@shared/dto/api-response.dto';
import { PERMISSIONS } from '@shared/permissions';

// ─── Suppliers ────────────────────────────────────────────────────────────────
@ApiTags('Purchases - Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchases/suppliers')
export class SuppliersController {
  constructor(private readonly svc: PurchasesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  async findAll(@CurrentTenantId() tenantId: string, @Query() filter: SupplierFilterDto) {
    const { items, total } = await this.svc.getSuppliers(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  async findOne(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getSupplier(id, tenantId));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PURCHASES_SUPPLIER_CREATE)
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateSupplierDto) {
    return ApiResponse.ok(await this.svc.createSupplier(tenantId, userId, dto), 'Fornecedor criado');
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_SUPPLIER_UPDATE)
  async update(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: UpdateSupplierDto) {
    return ApiResponse.ok(await this.svc.updateSupplier(id, tenantId, userId, dto), 'Fornecedor atualizado');
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_SUPPLIER_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.svc.deleteSupplier(id, tenantId);
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────
@ApiTags('Purchases - Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchases/orders')
export class PurchaseOrdersController {
  constructor(private readonly svc: PurchasesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  @ApiOperation({ summary: 'Listar ordens de compra' })
  async findAll(@CurrentTenantId() tenantId: string, @Query() filter: OrderFilterDto) {
    const { items, total } = await this.svc.getOrders(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  async findOne(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getOrder(id, tenantId));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PURCHASES_ORDER_CREATE)
  @ApiOperation({ summary: 'Criar ordem de compra (DRAFT)' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreatePurchaseOrderDto) {
    return ApiResponse.ok(await this.svc.createOrder(tenantId, userId, dto), 'Ordem criada');
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_ORDER_UPDATE)
  @ApiOperation({ summary: 'Editar ordem (somente DRAFT)' })
  async update(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: UpdatePurchaseOrderDto) {
    return ApiResponse.ok(await this.svc.updateOrder(id, tenantId, userId, dto), 'Ordem atualizada');
  }

  @Patch(':id/confirm')
  @RequirePermissions(PERMISSIONS.PURCHASES_ORDER_CONFIRM)
  @ApiOperation({ summary: 'Confirmar ordem — cria conta a pagar no financeiro' })
  async confirm(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: ConfirmPurchaseDto) {
    return ApiResponse.ok(await this.svc.confirmOrder(id, tenantId, userId, dto), 'Ordem confirmada — conta a pagar criada');
  }

  @Patch(':id/receive')
  @RequirePermissions(PERMISSIONS.PURCHASES_ORDER_RECEIVE)
  @ApiOperation({ summary: 'Receber mercadoria — dá entrada no estoque' })
  async receive(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: ReceivePurchaseDto) {
    return ApiResponse.ok(await this.svc.receiveOrder(id, tenantId, userId, dto), 'Mercadoria recebida — estoque atualizado');
  }

  @Patch(':id/mark-paid')
  @RequirePermissions(PERMISSIONS.PURCHASES_ORDER_PAY)
  @ApiOperation({ summary: 'Marcar como pago' })
  async markPaid(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string) {
    return ApiResponse.ok(await this.svc.markPaid(id, tenantId, userId), 'Pagamento registrado');
  }

  @Patch(':id/cancel')
  @RequirePermissions(PERMISSIONS.PURCHASES_ORDER_CANCEL)
  @ApiOperation({ summary: 'Cancelar ordem' })
  async cancel(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string) {
    return ApiResponse.ok(await this.svc.cancelOrder(id, tenantId, userId), 'Ordem cancelada');
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PURCHASES_ORDER_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir rascunho' })
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.svc.deleteOrder(id, tenantId);
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
@ApiTags('Purchases - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchases/dashboard')
export class PurchasesDashboardController {
  constructor(private readonly svc: PurchasesService) {}

  @Get('summary')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  async getSummary(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getSummary(tenantId));
  }
}
