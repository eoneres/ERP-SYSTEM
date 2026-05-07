import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Between, IsNull, LessThan } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { TransactionFilterDto, CashFlowItemDto } from '../dto/finance.dto';
import { ApiResponse } from '@shared/dto/api-response.dto';

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  private baseQuery(tenantId: string): SelectQueryBuilder<Transaction> {
    return this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.account', 'account')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.deletedAt IS NULL');
  }

  async findAll(tenantId: string, filter: TransactionFilterDto) {
    const qb = this.baseQuery(tenantId);

    if (filter.type) qb.andWhere('t.type = :type', { type: filter.type });
    if (filter.status) qb.andWhere('t.status = :status', { status: filter.status });
    if (filter.accountId) qb.andWhere('t.accountId = :accountId', { accountId: filter.accountId });
    if (filter.categoryId) qb.andWhere('t.categoryId = :categoryId', { categoryId: filter.categoryId });
    if (filter.dateFrom) qb.andWhere('t.dueDate >= :dateFrom', { dateFrom: filter.dateFrom });
    if (filter.dateTo) qb.andWhere('t.dueDate <= :dateTo', { dateTo: filter.dateTo });
    if (filter.amountMin) qb.andWhere('t.amount >= :amountMin', { amountMin: filter.amountMin });
    if (filter.amountMax) qb.andWhere('t.amount <= :amountMax', { amountMax: filter.amountMax });

    if (filter.search) {
      qb.andWhere(
        '(t.description ILIKE :search OR t.counterpartName ILIKE :search OR t.referenceNumber ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    if (filter.tags) {
      const tags = filter.tags.split(',').map((t) => t.trim());
      qb.andWhere('t.tags && :tags', { tags });
    }

    const sortMap: Record<string, string> = {
      dueDate: 't.dueDate',
      amount: 't.amount',
      description: 't.description',
      createdAt: 't.createdAt',
    };
    const sortCol = sortMap[filter.sortBy ?? 'dueDate'] ?? 't.dueDate';
    qb.orderBy(sortCol, filter.sortOrder ?? 'DESC');

    const [data, total] = await qb
      .skip(filter.skip)
      .take(filter.limit)
      .getManyAndCount();

    return ApiResponse.paginated(data, total, filter.page, filter.limit);
  }

  async findOne(id: string, tenantId: string): Promise<Transaction | null> {
    return this.baseQuery(tenantId).andWhere('t.id = :id', { id }).getOne();
  }

  async getSummary(tenantId: string, dateFrom?: string, dateTo?: string) {
    const qb = this.repo
      .createQueryBuilder('t')
      .select(
        `SUM(CASE WHEN t.type = 'income'  AND t.status = 'paid'    THEN t.paidAmount ELSE 0 END) AS "totalIncome",` +
        `SUM(CASE WHEN t.type = 'expense' AND t.status = 'paid'    THEN t.paidAmount ELSE 0 END) AS "totalExpense",` +
        `SUM(CASE WHEN t.type = 'income'  AND t.status = 'pending' THEN t.amount     ELSE 0 END) AS "pendingIncome",` +
        `SUM(CASE WHEN t.type = 'expense' AND t.status = 'pending' THEN t.amount     ELSE 0 END) AS "pendingExpense",` +
        `COUNT(CASE WHEN t.status = 'overdue' THEN 1 END)                                        AS "overdueCount",` +
        `SUM(CASE WHEN t.status = 'overdue'   THEN t.amount ELSE 0 END)                          AS "overdueAmount"`
      )
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.deletedAt IS NULL');

    if (dateFrom) qb.andWhere('t.dueDate >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('t.dueDate <= :dateTo', { dateTo });

    return qb.getRawOne();
  }

  async getCashFlow(
    tenantId: string,
    dateFrom: string,
    dateTo: string,
    groupBy: 'day' | 'month' = 'month',
  ): Promise<CashFlowItemDto[]> {
    const truncFn = groupBy === 'day' ? 'DATE(t.due_date)' : `DATE_TRUNC('month', t.due_date)`;

    const rows = await this.repo.query(
      `
      SELECT
        ${truncFn}::date AS date,
        SUM(CASE WHEN t.type = 'income' AND t.status = 'paid' THEN COALESCE(t.paid_amount, t.amount) ELSE 0 END) AS income,
        SUM(CASE WHEN t.type = 'expense' AND t.status = 'paid' THEN COALESCE(t.paid_amount, t.amount) ELSE 0 END) AS expense
      FROM finance_transactions t
      WHERE t.tenant_id = $1
        AND t.due_date BETWEEN $2 AND $3
        AND t.deleted_at IS NULL
      GROUP BY 1
      ORDER BY 1 ASC
      `,
      [tenantId, dateFrom, dateTo],
    );

    // Compute running balance
    let accumulated = 0;
    return rows.map((row: any) => {
      const income = Number(row.income);
      const expense = Number(row.expense);
      accumulated += income - expense;
      return {
        date: row.date,
        income,
        expense,
        balance: income - expense,
        accumulated,
      };
    });
  }

  async getByCategory(tenantId: string, dateFrom: string, dateTo: string) {
    return this.repo.query(
      `
      SELECT
        c.id,
        c.name,
        c.color,
        c.type,
        SUM(COALESCE(t.paid_amount, t.amount)) AS total,
        COUNT(*) AS count
      FROM finance_transactions t
      LEFT JOIN finance_categories c ON t.category_id = c.id
      WHERE t.tenant_id = $1
        AND t.due_date BETWEEN $2 AND $3
        AND t.status = 'paid'
        AND t.deleted_at IS NULL
      GROUP BY c.id, c.name, c.color, c.type
      ORDER BY total DESC
      `,
      [tenantId, dateFrom, dateTo],
    );
  }

  // Mark overdue transactions automatically
  async markOverdue(tenantId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Transaction)
      .set({ status: TransactionStatus.OVERDUE })
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('status = :status', { status: TransactionStatus.PENDING })
      .andWhere('dueDate < :today', { today: new Date().toISOString().split('T')[0] })
      .execute();

    return result.affected ?? 0;
  }

  save(entity: Transaction) { return this.repo.save(entity); }
  create(data: Partial<Transaction>) { return this.repo.create(data); }
  softDelete(id: string) { return this.repo.softDelete(id); }
  merge(entity: Transaction, data: Partial<Transaction>) { return this.repo.merge(entity, data); }

  /** Busca transações recorrentes ativas (raiz, pagas, sem fim ou com fim futuro) */
  async findActiveRecurringParents(): Promise<Transaction[]> {
    return this.repo
      .createQueryBuilder('t')
      .where('t.recurrence != :none', { none: 'none' })
      .andWhere('t.recurrenceParentId IS NULL')
      .andWhere('t.status = :paid', { paid: TransactionStatus.PAID })
      .andWhere('(t.recurrenceEndDate IS NULL OR t.recurrenceEndDate >= CURRENT_DATE)')
      .andWhere('t.deletedAt IS NULL')
      .getMany();
  }

  /** Verifica se já existe parcela filha com a data de vencimento informada */
  async recurringChildExists(parentId: string, tenantId: string, dueDate: Date): Promise<boolean> {
    const count = await this.repo
      .createQueryBuilder('t')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.recurrenceParentId = :parentId', { parentId })
      .andWhere('t.dueDate = :dueDate', { dueDate })
      .andWhere('t.deletedAt IS NULL')
      .getCount();
    return count > 0;
  }
}
