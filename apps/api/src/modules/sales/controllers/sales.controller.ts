import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SalesService } from '../services/sales.service';
import {
  CreateCustomerDto, UpdateCustomerDto, CustomerFilterDto,
  CreateOrderDto, UpdateOrderDto,
  ConfirmOrderDto, InvoiceOrderDto, MarkPaidDto,
  OrderFilterDto,
} from '../dto/sales.dto';
import { JwtAuthGuard } from '@modules/auth/guards/auth.guard';
import { CurrentUser, CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@shared/dto/api-response.dto';

// ─── Customers ────────────────────────────────────────────────────────────────
@ApiTags('Sales - Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales/customers')
export class CustomersController {
  constructor(private readonly svc: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes' })
  async findAll(@CurrentTenantId() tenantId: string, @Query() filter: CustomerFilterDto) {
    const { items, total } = await this.svc.getCustomers(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cliente' })
  async findOne(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getCustomer(id, tenantId));
  }

  @Post()
  @ApiOperation({ summary: 'Criar cliente' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateCustomerDto) {
    return ApiResponse.ok(await this.svc.createCustomer(tenantId, userId, dto), 'Cliente criado');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar cliente' })
  async update(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: UpdateCustomerDto) {
    return ApiResponse.ok(await this.svc.updateCustomer(id, tenantId, userId, dto), 'Cliente atualizado');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.svc.deleteCustomer(id, tenantId);
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────
@ApiTags('Sales - Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales/orders')
export class OrdersController {
  constructor(private readonly svc: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos' })
  async findAll(@CurrentTenantId() tenantId: string, @Query() filter: OrderFilterDto) {
    const { items, total } = await this.svc.getOrders(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar pedido' })
  async findOne(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getOrder(id, tenantId));
  }

  @Post()
  @ApiOperation({ summary: 'Criar pedido (DRAFT)' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return ApiResponse.ok(await this.svc.createOrder(tenantId, userId, dto), 'Pedido criado');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Editar pedido (somente DRAFT)' })
  async update(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: UpdateOrderDto) {
    return ApiResponse.ok(await this.svc.updateOrder(id, tenantId, userId, dto), 'Pedido atualizado');
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirmar pedido — valida e reserva estoque' })
  async confirm(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: ConfirmOrderDto) {
    return ApiResponse.ok(await this.svc.confirmOrder(id, tenantId, userId, dto), 'Pedido confirmado — estoque reservado');
  }

  @Patch(':id/invoice')
  @ApiOperation({ summary: 'Faturar pedido — baixa estoque + cria conta a receber' })
  async invoice(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: InvoiceOrderDto) {
    return ApiResponse.ok(await this.svc.invoiceOrder(id, tenantId, userId, dto), 'Pedido faturado — conta a receber criada');
  }

  @Patch(':id/mark-paid')
  @ApiOperation({ summary: 'Marcar como pago (somente pedidos faturados)' })
  async markPaid(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: MarkPaidDto) {
    return ApiResponse.ok(await this.svc.markPaid(id, tenantId, userId, dto), 'Pagamento registrado');
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar pedido — libera estoque + cancela financeiro' })
  async cancel(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string) {
    return ApiResponse.ok(await this.svc.cancelOrder(id, tenantId, userId), 'Pedido cancelado');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir pedido (somente DRAFT)' })
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.svc.deleteOrder(id, tenantId);
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
@ApiTags('Sales - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales/dashboard')
export class SalesDashboardController {
  constructor(private readonly svc: SalesService) {}

  @Get('summary')
  async getSummary(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getSummary(tenantId));
  }

  @Get('recent-orders')
  async getRecentOrders(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.svc.getRecentOrders(tenantId));
  }
}
