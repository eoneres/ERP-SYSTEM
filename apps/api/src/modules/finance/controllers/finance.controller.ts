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
import { RequirePermissions } from '@modules/auth/guards/auth.guard';
import { CurrentUser, CurrentTenantId } from '@modules/auth/decorators/current-user.decorator';
import { ApiResponse } from '@shared/dto/api-response.dto';
import { PERMISSIONS } from '@shared/permissions';
import { RateLimit } from '@shared/decorators/rate-limit.decorator';

// ─── Accounts Controller ──────────────────────────────────────────────────────
@ApiTags('Finance - Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance/accounts')
export class AccountsController {
  constructor(private readonly financeService: FinanceService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.FINANCE_VIEW)
  @ApiOperation({ summary: 'Listar contas bancárias' })
  async findAll(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.financeService.getAccounts(tenantId));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.FINANCE_ACCOUNT_CREATE)
  @ApiOperation({ summary: 'Criar conta bancária' })
  async create(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAccountDto,
  ) {
    return ApiResponse.ok(await this.financeService.createAccount(tenantId, userId, dto), 'Conta criada com sucesso');
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.FINANCE_ACCOUNT_UPDATE)
  @ApiOperation({ summary: 'Atualizar conta bancária' })
  async update(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return ApiResponse.ok(await this.financeService.updateAccount(id, tenantId, dto), 'Conta atualizada');
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.FINANCE_ACCOUNT_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir conta bancária' })
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.financeService.deleteAccount(id, tenantId);
  }

  @Get(':id/ledger')
  @RequirePermissions(PERMISSIONS.FINANCE_VIEW)
  @ApiOperation({ summary: 'Histórico imutável de movimentações da conta (ledger)' })
  async getLedger(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @Query('page')  page?:  string,
    @Query('limit') limit?: string,
  ) {
    const { items, total } = await this.financeService.getLedger(
      id, tenantId,
      parseInt(page  ?? '1',  10),
      parseInt(limit ?? '50', 10),
    );
    return ApiResponse.paginated(items, total, parseInt(page ?? '1', 10), parseInt(limit ?? '50', 10));
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
  @RequirePermissions(PERMISSIONS.FINANCE_VIEW)
  @ApiOperation({ summary: 'Listar categorias financeiras' })
  async findAll(@CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.financeService.getCategories(tenantId));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.FINANCE_CATEGORY_CREATE)
  @ApiOperation({ summary: 'Criar categoria' })
  async create(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return ApiResponse.ok(await this.financeService.createCategory(tenantId, userId, dto), 'Categoria criada');
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.FINANCE_CATEGORY_UPDATE)
  @ApiOperation({ summary: 'Atualizar categoria' })
  async update(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return ApiResponse.ok(await this.financeService.updateCategory(id, tenantId, dto), 'Categoria atualizada');
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.FINANCE_CATEGORY_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    await this.financeService.deleteCategory(id, tenantId);
  }
}

// ─── Transactions Controller ──────────────────────────────────────────────────
@ApiTags('Finance - Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RateLimit('finance')
@Controller('finance/transactions')
export class TransactionsController {
  constructor(private readonly financeService: FinanceService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.FINANCE_VIEW)
  @ApiOperation({ summary: 'Listar transações (com filtros e paginação)' })
  async findAll(
    @CurrentTenantId() tenantId: string,
    @Query() filter: TransactionFilterDto,
  ) {
    return this.financeService.getTransactions(tenantId, filter);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.FINANCE_VIEW)
  @ApiOperation({ summary: 'Buscar transação por ID' })
  async findOne(@Param('id') id: string, @CurrentTenantId() tenantId: string) {
    return ApiResponse.ok(await this.financeService.getTransaction(id, tenantId));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.FINANCE_TRANSACTION_CREATE)
  @ApiOperation({ summary: 'Criar transação' })
  async create(
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return ApiResponse.ok(await this.financeService.createTransaction(tenantId, userId, dto), 'Transação criada com sucesso');
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.FINANCE_TRANSACTION_UPDATE)
  @ApiOperation({ summary: 'Atualizar transação' })
  async update(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return ApiResponse.ok(await this.financeService.updateTransaction(id, tenantId, userId, dto), 'Transação atualizada');
  }

  @Patch(':id/pay')
  @RequirePermissions(PERMISSIONS.FINANCE_TRANSACTION_PAY)
  @ApiOperation({ summary: 'Marcar transação como paga/recebida' })
  async pay(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PayTransactionDto,
  ) {
    return ApiResponse.ok(await this.financeService.payTransaction(id, tenantId, userId, dto), 'Transação paga com sucesso');
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.FINANCE_TRANSACTION_DELETE)
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
  @RequirePermissions(PERMISSIONS.FINANCE_VIEW)
  @ApiOperation({ summary: 'Resumo financeiro do período' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async getSummary(
    @CurrentTenantId() tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return ApiResponse.ok(await this.financeService.getSummary(tenantId, dateFrom, dateTo));
  }

  @Get('cashflow')
  @RequirePermissions(PERMISSIONS.FINANCE_VIEW)
  @ApiOperation({ summary: 'Fluxo de caixa por período' })
  async getCashFlow(
    @CurrentTenantId() tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('groupBy') groupBy: 'day' | 'month' = 'month',
  ) {
    return ApiResponse.ok(await this.financeService.getCashFlow(tenantId, dateFrom, dateTo, groupBy));
  }

  @Get('by-category')
  @RequirePermissions(PERMISSIONS.FINANCE_VIEW)
  @ApiOperation({ summary: 'Totais por categoria no período' })
  async getByCategory(
    @CurrentTenantId() tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return ApiResponse.ok(await this.financeService.getByCategory(tenantId, dateFrom, dateTo));
  }
}
