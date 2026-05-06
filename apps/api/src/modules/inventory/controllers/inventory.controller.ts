import {
  Controller, Get, Post, Put, Patch, Delete,
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
import { JwtAuthGuard } from '@modules/auth/guards/auth.guard';
import { CurrentUser, CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@shared/dto/api-response.dto';

// ─── Products ─────────────────────────────────────────────────────────────────
@ApiTags('Inventory - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory/products')
export class ProductsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Listar produtos' })
  async findAll(
    @CurrentTenantId() tenantId: string,
    @Query() filter: ProductFilterDto,
  ) {
    const { items, total } = await this.inventoryService.getProducts(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias de produtos' })
  async getCategories(@CurrentTenantId() tenantId: string) {
    const data = await this.inventoryService.getCategories(tenantId);
    return ApiResponse.ok(data);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Produtos com estoque baixo' })
  async getLowStock(@CurrentTenantId() tenantId: string) {
    const data = await this.inventoryService.getLowStockProducts(tenantId);
    return ApiResponse.ok(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  async findOne(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    const data = await this.inventoryService.getProduct(id, tenantId);
    return ApiResponse.ok(data);
  }

  @Post()
  @ApiOperation({ summary: 'Criar produto' })
  async create(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProductDto,
  ) {
    const data = await this.inventoryService.createProduct(tenantId, userId, dto);
    return ApiResponse.ok(data, 'Produto criado com sucesso');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar produto' })
  async update(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProductDto,
  ) {
    const data = await this.inventoryService.updateProduct(id, tenantId, userId, dto);
    return ApiResponse.ok(data, 'Produto atualizado');
  }

  @Delete(':id')
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
  @ApiOperation({ summary: 'Listar depósitos' })
  async findAll(@CurrentTenantId() tenantId: string) {
    const data = await this.inventoryService.getWarehouses(tenantId);
    return ApiResponse.ok(data);
  }

  @Post()
  @ApiOperation({ summary: 'Criar depósito' })
  async create(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWarehouseDto,
  ) {
    const data = await this.inventoryService.createWarehouse(tenantId, userId, dto);
    return ApiResponse.ok(data, 'Depósito criado com sucesso');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar depósito' })
  async update(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    const data = await this.inventoryService.updateWarehouse(id, tenantId, dto);
    return ApiResponse.ok(data, 'Depósito atualizado');
  }

  @Delete(':id')
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
  @ApiOperation({ summary: 'Listar movimentações' })
  async findAll(
    @CurrentTenantId() tenantId: string,
    @Query() filter: MovementFilterDto,
  ) {
    const { items, total } = await this.inventoryService.getMovements(tenantId, filter);
    return ApiResponse.paginated(items, total, filter.page, filter.limit);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar movimentação de estoque' })
  async create(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMovementDto,
  ) {
    const data = await this.inventoryService.createMovement(tenantId, userId, dto);
    return ApiResponse.ok(data, 'Movimentação registrada com sucesso');
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
  @ApiOperation({ summary: 'Resumo do estoque' })
  async getSummary(@CurrentTenantId() tenantId: string) {
    const data = await this.inventoryService.getSummary(tenantId);
    return ApiResponse.ok(data);
  }
}
