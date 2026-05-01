#!/bin/bash
# =============================================================================
# CORREÇÃO DEFINITIVA — finance.service.ts (3 erros restantes)
# Execute em: /workspaces/ERP-SYSTEM/apps/api
# =============================================================================
# Erro 1: 'Inject' not found  → import { Inject } from '@nestjs/common'
# Erro 2: recurrenceEndDate string→Date no create
# Erro 3: dueDate string|Date→Date no merge (spread do dto ainda vaza strings)
#
# Estratégia: reescrever o arquivo inteiro com as correções integradas.
# Evita o problema de patches encadeados que deixam rastros inconsistentes.
# =============================================================================

set -e

cat > /workspaces/ERP-SYSTEM/apps/api/src/modules/finance/services/finance.service.ts << 'EOF'
import {
  Injectable, NotFoundException, BadRequestException, Logger, Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { Account } from '../entities/account.entity';
import { Category } from '../entities/category.entity';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { TransactionRepository } from '../repositories/transaction.repository';
import {
  CreateAccountDto, UpdateAccountDto,
  CreateCategoryDto, UpdateCategoryDto,
  CreateTransactionDto, UpdateTransactionDto,
  PayTransactionDto, TransactionFilterDto,
} from '../dto/finance.dto';

// ─── Helper: converte string ISO ou Date para Date, retorna undefined se falsy
function toDate(value: string | Date | undefined | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  return new Date(value);
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly transactionRepo: TransactionRepository,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ─── Accounts ─────────────────────────────────────────────────────────────

  async getAccounts(tenantId: string) {
    const cacheKey = `finance:accounts:${tenantId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const accounts = await this.accountRepo.find({
      where: { tenantId, isActive: true },
      order: { name: 'ASC' },
    });

    await this.cache.set(cacheKey, accounts, 60 * 5);
    return accounts;
  }

  async createAccount(tenantId: string, userId: string, dto: CreateAccountDto) {
    const account = this.accountRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      currentBalance: dto.initialBalance ?? 0,
    });
    const saved = await this.accountRepo.save(account);
    await this.cache.del(`finance:accounts:${tenantId}`);
    return saved;
  }

  async updateAccount(id: string, tenantId: string, dto: UpdateAccountDto) {
    const account = await this.accountRepo.findOne({ where: { id, tenantId } });
    if (!account) throw new NotFoundException('Conta não encontrada');
    Object.assign(account, dto);
    const saved = await this.accountRepo.save(account);
    await this.cache.del(`finance:accounts:${tenantId}`);
    return saved;
  }

  async deleteAccount(id: string, tenantId: string) {
    const account = await this.accountRepo.findOne({ where: { id, tenantId } });
    if (!account) throw new NotFoundException('Conta não encontrada');
    await this.accountRepo.softDelete(id);
    await this.cache.del(`finance:accounts:${tenantId}`);
  }

  // ─── Categories ───────────────────────────────────────────────────────────

  async getCategories(tenantId: string) {
    return this.categoryRepo.find({
      where: { tenantId, isActive: true },
      relations: ['children'],
      order: { name: 'ASC' },
    });
  }

  async createCategory(tenantId: string, userId: string, dto: CreateCategoryDto) {
    const category = this.categoryRepo.create({ ...dto, tenantId, createdBy: userId });
    return this.categoryRepo.save(category);
  }

  async updateCategory(id: string, tenantId: string, dto: UpdateCategoryDto) {
    const cat = await this.categoryRepo.findOne({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    Object.assign(cat, dto);
    return this.categoryRepo.save(cat);
  }

  async deleteCategory(id: string, tenantId: string) {
    const cat = await this.categoryRepo.findOne({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    await this.categoryRepo.softDelete(id);
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  async getTransactions(tenantId: string, filter: TransactionFilterDto) {
    return this.transactionRepo.findAll(tenantId, filter);
  }

  async getTransaction(id: string, tenantId: string) {
    const tx = await this.transactionRepo.findOne(id, tenantId);
    if (!tx) throw new NotFoundException('Transação não encontrada');
    return tx;
  }

  async createTransaction(tenantId: string, userId: string, dto: CreateTransactionDto) {
    if (dto.accountId) {
      const account = await this.accountRepo.findOne({
        where: { id: dto.accountId, tenantId },
      });
      if (!account) throw new BadRequestException('Conta bancária inválida');
    }

    // Extrai campos que precisam de conversão; o restante vai via spread
    const { dueDate, paymentDate, recurrenceEndDate, ...rest } = dto;

    const tx = this.transactionRepo.create({
      ...rest,
      tenantId,
      createdBy: userId,
      status: dto.status ?? TransactionStatus.PENDING,
      dueDate: new Date(dueDate),
      paymentDate: toDate(paymentDate),
      recurrenceEndDate: toDate(recurrenceEndDate),
    });

    if (paymentDate && !dto.status) {
      tx.status = TransactionStatus.PAID;
    }

    const saved = await this.transactionRepo.save(tx);

    if (saved.status === TransactionStatus.PAID && saved.accountId) {
      await this.updateAccountBalance(saved.accountId, tenantId, saved.type, saved.effectiveAmount);
    }

    this.eventEmitter.emit('finance.transaction.created', { transaction: saved, tenantId });
    await this.cache.del(`finance:summary:${tenantId}`);

    return saved;
  }

  async updateTransaction(id: string, tenantId: string, userId: string, dto: UpdateTransactionDto) {
    const tx = await this.transactionRepo.findOne(id, tenantId);
    if (!tx) throw new NotFoundException('Transação não encontrada');

    const wasNotPaid = tx.status !== TransactionStatus.PAID;

    // Extrai todos os campos de data do DTO para converter explicitamente
    const { dueDate, paymentDate, recurrenceEndDate, ...restDto } = dto;

    this.transactionRepo.merge(tx, {
      ...restDto,
      updatedBy: userId,
      ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
      ...(paymentDate !== undefined && { paymentDate: toDate(paymentDate) }),
      ...(recurrenceEndDate !== undefined && { recurrenceEndDate: toDate(recurrenceEndDate) }),
    });

    const saved = await this.transactionRepo.save(tx);

    if (saved.status === TransactionStatus.PAID && wasNotPaid && saved.accountId) {
      await this.updateAccountBalance(saved.accountId, tenantId, saved.type, saved.effectiveAmount);
    }

    await this.cache.del(`finance:summary:${tenantId}`);
    return saved;
  }

  async payTransaction(id: string, tenantId: string, userId: string, dto: PayTransactionDto) {
    const tx = await this.transactionRepo.findOne(id, tenantId);
    if (!tx) throw new NotFoundException('Transação não encontrada');
    if (tx.status === TransactionStatus.PAID) {
      throw new BadRequestException('Transação já foi paga');
    }

    const accountId = dto.accountId ?? tx.accountId;

    this.transactionRepo.merge(tx, {
      status: TransactionStatus.PAID,
      paymentDate: new Date(dto.paymentDate),
      paidAmount: dto.paidAmount ?? tx.amount,
      accountId,
      updatedBy: userId,
    });

    const saved = await this.transactionRepo.save(tx);

    if (accountId) {
      await this.updateAccountBalance(accountId, tenantId, tx.type, saved.effectiveAmount);
    }

    this.eventEmitter.emit('finance.transaction.paid', { transaction: saved, tenantId });
    await this.cache.del(`finance:summary:${tenantId}`);

    return saved;
  }

  async deleteTransaction(id: string, tenantId: string) {
    const tx = await this.transactionRepo.findOne(id, tenantId);
    if (!tx) throw new NotFoundException('Transação não encontrada');

    if (tx.status === TransactionStatus.PAID && tx.accountId) {
      const reverseType =
        tx.type === TransactionType.INCOME ? TransactionType.EXPENSE : TransactionType.INCOME;
      await this.updateAccountBalance(tx.accountId, tenantId, reverseType, tx.effectiveAmount);
    }

    await this.transactionRepo.softDelete(id);
    await this.cache.del(`finance:summary:${tenantId}`);
  }

  // ─── Dashboard & Reports ──────────────────────────────────────────────────

  async getSummary(tenantId: string, dateFrom?: string, dateTo?: string) {
    const cacheKey = `finance:summary:${tenantId}:${dateFrom}:${dateTo}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [raw, accounts] = await Promise.all([
      this.transactionRepo.getSummary(tenantId, dateFrom, dateTo),
      this.accountRepo.find({ where: { tenantId, isActive: true } }),
    ]);

    const accountsBalance = accounts.reduce(
      (sum, a) => sum + Number(a.currentBalance),
      0,
    );

    const totalIncome = Number(raw?.totalIncome ?? 0);
    const totalExpense = Number(raw?.totalExpense ?? 0);

    const summary = {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      pendingIncome: Number(raw?.pendingIncome ?? 0),
      pendingExpense: Number(raw?.pendingExpense ?? 0),
      overdueCount: Number(raw?.overdueCount ?? 0),
      overdueAmount: Number(raw?.overdueAmount ?? 0),
      accountsBalance,
    };

    await this.cache.set(cacheKey, summary, 60 * 2);
    return summary;
  }

  async getCashFlow(
    tenantId: string,
    dateFrom: string,
    dateTo: string,
    groupBy: 'day' | 'month' = 'month',
  ) {
    return this.transactionRepo.getCashFlow(tenantId, dateFrom, dateTo, groupBy);
  }

  async getByCategory(tenantId: string, dateFrom: string, dateTo: string) {
    return this.transactionRepo.getByCategory(tenantId, dateFrom, dateTo);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async updateAccountBalance(
    accountId: string,
    tenantId: string,
    type: TransactionType,
    amount: number,
  ) {
    const account = await this.accountRepo.findOne({ where: { id: accountId, tenantId } });
    if (!account) return;

    const delta = type === TransactionType.INCOME ? amount : -amount;
    account.currentBalance = Number(account.currentBalance) + delta;
    await this.accountRepo.save(account);
    await this.cache.del(`finance:accounts:${tenantId}`);
  }
}
EOF

echo "✅ finance.service.ts reescrito com sucesso"
echo ""
echo "📋 Correções aplicadas:"
echo "  [1] import { Inject } adicionado ao import do @nestjs/common"
echo "  [2] InjectCache() → @Inject(CACHE_MANAGER) do @nestjs/cache-manager"
echo "  [3] createTransaction: desestrutura dueDate/paymentDate/recurrenceEndDate"
echo "      antes do spread para converter cada um com toDate()"
echo "  [4] updateTransaction: mesma desestruturação + spread condicional"
echo "      garante que strings ISO nunca cheguem como string ao TypeORM"
echo ""
echo "🚀 Rode agora: npm run dev"
