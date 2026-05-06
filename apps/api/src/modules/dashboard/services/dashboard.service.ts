import { Injectable, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class DashboardService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ─── Summary ──────────────────────────────────────────────────────────────

  async getSummary(tenantId: string) {
    const cacheKey = `dashboard:summary:${tenantId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [finance, sales, inventory, hr, chart] = await Promise.all([
      this.getFinanceSummary(tenantId),
      this.getSalesSummary(tenantId),
      this.getInventorySummary(tenantId),
      this.getHRSummary(tenantId),
      this.getRevenueChart(tenantId),
    ]);

    const result = { finance, sales, inventory, hr, chart };
    await this.cache.set(cacheKey, result, 60 * 1000); // 60s
    return result;
  }

  private async getFinanceSummary(tenantId: string) {
    const rows = await this.db.query(`
      SELECT
        SUM(CASE WHEN type = 'income'  AND status = 'paid'    THEN COALESCE(paid_amount, amount) ELSE 0 END) AS total_income,
        SUM(CASE WHEN type = 'expense' AND status = 'paid'    THEN COALESCE(paid_amount, amount) ELSE 0 END) AS total_expense,
        SUM(CASE WHEN status = 'overdue'                      THEN amount ELSE 0 END)                        AS overdue_amount,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END)                                                       AS overdue_count,
        SUM(CASE WHEN type = 'income'  AND status = 'pending' THEN amount ELSE 0 END)                        AS pending_income,
        SUM(CASE WHEN type = 'expense' AND status = 'pending' THEN amount ELSE 0 END)                        AS pending_expense
      FROM finance_transactions
      WHERE tenant_id = $1 AND deleted_at IS NULL
        AND DATE_TRUNC('month', due_date) = DATE_TRUNC('month', NOW())
    `, [tenantId]);

    const r = rows[0] ?? {};
    return {
      totalIncome:    Number(r.total_income    ?? 0),
      totalExpense:   Number(r.total_expense   ?? 0),
      netBalance:     Number(r.total_income ?? 0) - Number(r.total_expense ?? 0),
      overdueAmount:  Number(r.overdue_amount  ?? 0),
      overdueCount:   Number(r.overdue_count   ?? 0),
      pendingIncome:  Number(r.pending_income  ?? 0),
      pendingExpense: Number(r.pending_expense ?? 0),
    };
  }

  private async getSalesSummary(tenantId: string) {
    const [orders, revenue] = await Promise.all([
      this.db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status NOT IN ('cancelled','returned'))                AS total_orders,
          COUNT(*) FILTER (WHERE status = 'confirmed')                                  AS pending_orders,
          COUNT(*) FILTER (WHERE status = 'invoiced' AND payment_status = 'pending')    AS awaiting_payment,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', order_date) = DATE_TRUNC('month', NOW())) AS orders_this_month
        FROM sales_orders
        WHERE tenant_id = $1 AND deleted_at IS NULL
      `, [tenantId]),
      this.db.query(`
        SELECT
          SUM(total) FILTER (WHERE payment_status = 'paid')   AS total_revenue,
          AVG(total) FILTER (WHERE payment_status = 'paid'
            AND DATE_TRUNC('month', order_date) = DATE_TRUNC('month', NOW())) AS avg_ticket
        FROM sales_orders
        WHERE tenant_id = $1 AND deleted_at IS NULL
      `, [tenantId]),
    ]);

    const o = orders[0] ?? {};
    const r = revenue[0] ?? {};
    return {
      totalOrders:      Number(o.total_orders      ?? 0),
      pendingOrders:    Number(o.pending_orders     ?? 0),
      awaitingPayment:  Number(o.awaiting_payment   ?? 0),
      ordersThisMonth:  Number(o.orders_this_month  ?? 0),
      totalRevenue:     Number(r.total_revenue      ?? 0),
      avgTicket:        Number(r.avg_ticket         ?? 0),
    };
  }

  private async getInventorySummary(tenantId: string) {
    const rows = await this.db.query(`
      SELECT
        COUNT(*)                                                          AS total_products,
        COUNT(*) FILTER (WHERE status = 'active')                        AS active_products,
        COUNT(*) FILTER (WHERE stock_quantity <= min_stock AND min_stock > 0 AND deleted_at IS NULL) AS low_stock,
        COUNT(*) FILTER (WHERE stock_quantity = 0 AND deleted_at IS NULL) AS out_of_stock,
        SUM(stock_quantity * cost_price)                                  AS stock_value
      FROM inventory_products
      WHERE tenant_id = $1 AND deleted_at IS NULL
    `, [tenantId]);

    const r = rows[0] ?? {};
    return {
      totalProducts:  Number(r.total_products  ?? 0),
      activeProducts: Number(r.active_products ?? 0),
      lowStock:       Number(r.low_stock       ?? 0),
      outOfStock:     Number(r.out_of_stock    ?? 0),
      stockValue:     Number(r.stock_value     ?? 0),
    };
  }

  private async getHRSummary(tenantId: string) {
    const [employees, payroll] = await Promise.all([
      this.db.query(`
        SELECT
          COUNT(*)                                    AS total,
          COUNT(*) FILTER (WHERE status = 'active')  AS active
        FROM hr_employees
        WHERE tenant_id = $1 AND deleted_at IS NULL
      `, [tenantId]),
      this.db.query(`
        SELECT COALESCE(SUM(net_salary), 0) AS total_payroll
        FROM hr_payrolls
        WHERE tenant_id = $1
          AND reference_month = TO_CHAR(NOW(), 'YYYY-MM')
          AND status != 'cancelled'
      `, [tenantId]),
    ]);

    return {
      totalEmployees:  Number(employees[0]?.total         ?? 0),
      activeEmployees: Number(employees[0]?.active        ?? 0),
      payrollThisMonth: Number(payroll[0]?.total_payroll  ?? 0),
    };
  }

  private async getRevenueChart(tenantId: string) {
    const rows = await this.db.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', due_date), 'Mon') AS month,
        TO_CHAR(DATE_TRUNC('month', due_date), 'YYYY-MM') AS month_key,
        SUM(CASE WHEN type = 'income'  AND status = 'paid' THEN COALESCE(paid_amount, amount) ELSE 0 END) AS receita,
        SUM(CASE WHEN type = 'expense' AND status = 'paid' THEN COALESCE(paid_amount, amount) ELSE 0 END) AS despesas
      FROM finance_transactions
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND due_date >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
        AND due_date <  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
      GROUP BY 1, 2
      ORDER BY 2 ASC
    `, [tenantId]);

    return rows.map((r: any) => ({
      month:    r.month,
      receita:  Number(r.receita  ?? 0),
      despesas: Number(r.despesas ?? 0),
    }));
  }

  // ─── Activity feed ────────────────────────────────────────────────────────

  async getActivity(tenantId: string) {
    const cacheKey = `dashboard:activity:${tenantId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Union of recent events from all modules, ordered by date
    const rows = await this.db.query(`
      SELECT * FROM (

        SELECT
          'order_created'   AS type,
          o.id              AS resource_id,
          o.order_number    AS title,
          COALESCE(c.name, 'Sem cliente') AS subtitle,
          o.total           AS amount,
          o.created_at      AS occurred_at
        FROM sales_orders o
        LEFT JOIN sales_customers c ON c.id = o.customer_id
        WHERE o.tenant_id = $1 AND o.deleted_at IS NULL

        UNION ALL

        SELECT
          'payment_received' AS type,
          t.id,
          t.description,
          COALESCE(t.counterpart_name, '—'),
          COALESCE(t.paid_amount, t.amount),
          t.updated_at
        FROM finance_transactions t
        WHERE t.tenant_id = $1
          AND t.deleted_at IS NULL
          AND t.status = 'paid'
          AND t.type = 'income'

        UNION ALL

        SELECT
          'stock_movement'  AS type,
          m.id,
          p.name,
          m.type::text,
          m.quantity,
          m.created_at
        FROM inventory_movements m
        JOIN inventory_products p ON p.id = m.product_id
        WHERE m.tenant_id = $1

        UNION ALL

        SELECT
          'employee_created' AS type,
          e.id,
          e.full_name,
          e.position,
          e.salary,
          e.created_at
        FROM hr_employees e
        WHERE e.tenant_id = $1 AND e.deleted_at IS NULL

      ) activity
      ORDER BY occurred_at DESC
      LIMIT 20
    `, [tenantId]);

    await this.cache.set(cacheKey, rows, 30 * 1000); // 30s
    return rows;
  }

  // ─── Alerts ───────────────────────────────────────────────────────────────

  async getAlerts(tenantId: string) {
    const [lowStock, overdue, awaitingInvoice] = await Promise.all([
      this.db.query(`
        SELECT id, name, stock_quantity, min_stock, sku
        FROM inventory_products
        WHERE tenant_id = $1
          AND deleted_at IS NULL
          AND status = 'active'
          AND stock_quantity <= min_stock
          AND min_stock > 0
        ORDER BY stock_quantity ASC
        LIMIT 5
      `, [tenantId]),

      this.db.query(`
        SELECT id, description, amount, due_date, counterpart_name
        FROM finance_transactions
        WHERE tenant_id = $1
          AND deleted_at IS NULL
          AND status IN ('overdue','pending')
          AND due_date < NOW()
          AND type = 'expense'
        ORDER BY due_date ASC
        LIMIT 5
      `, [tenantId]),

      this.db.query(`
        SELECT o.id, o.order_number, o.total, c.name AS customer
        FROM sales_orders o
        LEFT JOIN sales_customers c ON c.id = o.customer_id
        WHERE o.tenant_id = $1
          AND o.deleted_at IS NULL
          AND o.status = 'confirmed'
        ORDER BY o.order_date ASC
        LIMIT 5
      `, [tenantId]),
    ]);

    return { lowStock, overdue, awaitingInvoice };
  }
}
