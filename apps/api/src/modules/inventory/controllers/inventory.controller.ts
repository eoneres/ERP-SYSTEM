import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from '../services/inventory.service';
import {
  CreateProductDto, UpdateProductDto,
  CreateWarehouseDto, UpdateWarehouseDto,
  CreateMovementDto,
  ProductFilterDto, MovementFilterDto,
} from '../dto/inventory.dto';
import { JwtAuthGuard, RequirePermissions } from '@modules/auth/guards/auth.guard';
import { CurrentUser, CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@shared/dto/api-response.dto';
import { PERMISSIONS } from '@shared/permissions';

// ─── Products ─────────────────────────────────────────────────────────────────
@ApiTags('Inventory - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory/products')
export class ProductsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Listar produtos' })
  async findAll(@CurrentTenantId() tenantId: string, @Query() filter: ProductFilterDto) {
    const { items, total } = await this.inventoryService.getProducts(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Get('categories')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Listar categorias de produtos' })
  async getCategories(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.inventoryService.getCategories(tenantId));
  }

  @Get('low-stock')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Produtos com estoque baixo' })
  async getLowStock(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.inventoryService.getLowStockProducts(tenantId));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Buscar produto por ID' })
  async findOne(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.inventoryService.getProduct(id, tenantId));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.INVENTORY_PRODUCT_CREATE)
  @ApiOperation({ summary: 'Criar produto' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateProductDto) {
    return ApiResponse.ok(await this.inventoryService.createProduct(tenantId, userId, dto), 'Produto criado com sucesso');
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_PRODUCT_UPDATE)
  @ApiOperation({ summary: 'Atualizar produto' })
  async update(@Param('id') id: string, @CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: UpdateProductDto) {
    return ApiResponse.ok(await this.inventoryService.updateProduct(id, tenantId, userId, dto), 'Produto atualizado');
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_PRODUCT_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir produto' })
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.inventoryService.deleteProduct(id, tenantId);
  }
}

// ─── Warehouses ───────────────────────────────────────────────────────────────
@ApiTags('Inventory - Warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory/warehouses')
export class WarehousesController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Listar depósitos' })
  async findAll(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.inventoryService.getWarehouses(tenantId));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.INVENTORY_WAREHOUSE_CREATE)
  @ApiOperation({ summary: 'Criar depósito' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateWarehouseDto) {
    return ApiResponse.ok(await this.inventoryService.createWarehouse(tenantId, userId, dto), 'Depósito criado com sucesso');
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_WAREHOUSE_UPDATE)
  @ApiOperation({ summary: 'Atualizar depósito' })
  async update(@Param('id') id: string, @CurrentTenantId() tenantId: string, @Body() dto: UpdateWarehouseDto) {
    return ApiResponse.ok(await this.inventoryService.updateWarehouse(id, tenantId, dto), 'Depósito atualizado');
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_WAREHOUSE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar depósito' })
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.inventoryService.deleteWarehouse(id, tenantId);
  }
}

// ─── Movements ────────────────────────────────────────────────────────────────
@ApiTags('Inventory - Movements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory/movements')
export class MovementsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Listar movimentações' })
  async findAll(@CurrentTenantId() tenantId: string, @Query() filter: MovementFilterDto) {
    const { items, total } = await this.inventoryService.getMovements(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.INVENTORY_MOVEMENT_CREATE)
  @ApiOperation({ summary: 'Registrar movimentação de estoque' })
  async create(@CurrentTenantId() tenantId: string, @CurrentUser('id') userId: string, @Body() dto: CreateMovementDto) {
    return ApiResponse.ok(await this.inventoryService.createMovement(tenantId, userId, dto), 'Movimentação registrada com sucesso');
  }

  @Patch(':id/reverse')
  @RequirePermissions(PERMISSIONS.INVENTORY_MOVEMENT_CREATE)
  @ApiOperation({ summary: 'Estornar movimentação de estoque' })
  async reverse(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return ApiResponse.ok(await this.inventoryService.reverseMovement(id, tenantId, userId), 'Movimentação estornada com sucesso');
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
@ApiTags('Inventory - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory/dashboard')
export class InventoryDashboardController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('summary')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Resumo do estoque' })
  async getSummary(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.inventoryService.getSummary(tenantId));
  }
}
