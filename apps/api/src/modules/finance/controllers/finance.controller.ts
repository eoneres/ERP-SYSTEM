import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiQuery,
} from '@nestjs/swagger';
import { FinanceService } from '../services/finance.service';
import {
  CreateAccountDto, UpdateAccountDto,
  CreateCategoryDto, UpdateCategoryDto,
  CreateTransactionDto, UpdateTransactionDto,
  PayTransactionDto, TransactionFilterDto,
} from '../dto/finance.dto';
import { JwtAuthGuard } from '@modules/auth/guards/auth.guard';
import { CurrentUser, CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { User } from '@modules/auth/entities/user.entity';
import { ApiResponse } from '@shared/dto/api-response.dto';

// ─── Accounts Controller ──────────────────────────────────────────────────────
@ApiTags('Finance - Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance/accounts')
export class AccountsController {
  constructor(private readonly financeService: FinanceService) {}

  @Get()
  @ApiOperation({ summary: 'Listar contas bancárias' })
  async findAll(@CurrentTenantId() tenantId: string) {
    const data = await this.financeService.getAccounts(tenantId);
    return ApiResponse.ok(data);
  }

  @Post()
  @ApiOperation({ summary: 'Criar conta bancária' })
  async create(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAccountDto,
  ) {
    const data = await this.financeService.createAccount(tenantId, userId, dto);
    return ApiResponse.ok(data, 'Conta criada com sucesso');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar conta bancária' })
  async update(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    const data = await this.financeService.updateAccount(id, tenantId, dto);
    return ApiResponse.ok(data, 'Conta atualizada');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir conta bancária' })
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.financeService.deleteAccount(id, tenantId);
  }
}

// ─── Categories Controller ────────────────────────────────────────────────────
@ApiTags('Finance - Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance/categories')
export class CategoriesController {
  constructor(private readonly financeService: FinanceService) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorias financeiras' })
  async findAll(@CurrentTenantId() tenantId: string) {
    const data = await this.financeService.getCategories(tenantId);
    return ApiResponse.ok(data);
  }

  @Post()
  @ApiOperation({ summary: 'Criar categoria' })
  async create(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    const data = await this.financeService.createCategory(tenantId, userId, dto);
    return ApiResponse.ok(data, 'Categoria criada');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar categoria' })
  async update(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const data = await this.financeService.updateCategory(id, tenantId, dto);
    return ApiResponse.ok(data, 'Categoria atualizada');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.financeService.deleteCategory(id, tenantId);
  }
}

// ─── Transactions Controller ──────────────────────────────────────────────────
@ApiTags('Finance - Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance/transactions')
export class TransactionsController {
  constructor(private readonly financeService: FinanceService) {}

  @Get()
  @ApiOperation({ summary: 'Listar transações (com filtros e paginação)' })
  async findAll(
    @CurrentTenantId() tenantId: string,
    @Query() filter: TransactionFilterDto,
  ) {
    return this.financeService.getTransactions(tenantId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar transação por ID' })
  async findOne(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    const data = await this.financeService.getTransaction(id, tenantId);
    return ApiResponse.ok(data);
  }

  @Post()
  @ApiOperation({ summary: 'Criar transação' })
  async create(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    const data = await this.financeService.createTransaction(tenantId, userId, dto);
    return ApiResponse.ok(data, 'Transação criada com sucesso');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar transação' })
  async update(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    const data = await this.financeService.updateTransaction(id, tenantId, userId, dto);
    return ApiResponse.ok(data, 'Transação atualizada');
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Marcar transação como paga/recebida' })
  async pay(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PayTransactionDto,
  ) {
    const data = await this.financeService.payTransaction(id, tenantId, userId, dto);
    return ApiResponse.ok(data, 'Transação paga com sucesso');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir transação' })
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.financeService.deleteTransaction(id, tenantId);
  }
}

// ─── Finance Dashboard Controller ────────────────────────────────────────────
@ApiTags('Finance - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance/dashboard')
export class FinanceDashboardController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumo financeiro do período' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async getSummary(
    @CurrentTenantId() tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const data = await this.financeService.getSummary(tenantId, dateFrom, dateTo);
    return ApiResponse.ok(data);
  }

  @Get('cashflow')
  @ApiOperation({ summary: 'Fluxo de caixa por período' })
  async getCashFlow(
    @CurrentTenantId() tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('groupBy') groupBy: 'day' | 'month' = 'month',
  ) {
    const data = await this.financeService.getCashFlow(tenantId, dateFrom, dateTo, groupBy);
    return ApiResponse.ok(data);
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Totais por categoria no período' })
  async getByCategory(
    @CurrentTenantId() tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    const data = await this.financeService.getByCategory(tenantId, dateFrom, dateTo);
    return ApiResponse.ok(data);
  }
}
