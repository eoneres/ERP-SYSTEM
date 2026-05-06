import { ReportModule, ReportTemplate } from '../entities/report-template.entity';

// O engine substitui :param por NULLIF($N, '').
// Nos SQLs, use sempre: (:param IS NULL OR coluna::text = :param)
// Para datas:           (:param IS NULL OR coluna::date >= :param::date)

export const SYSTEM_TEMPLATES: Partial<ReportTemplate>[] = [

  // ─── VENDAS ───────────────────────────────────────────────────────────────
  {
    name: 'Pedidos por Período',
    module: ReportModule.SALES,
    description: 'Lista todos os pedidos em um intervalo de datas',
    isSystem: true,
    columns: [
      { key: 'order_number',   label: 'Nº Pedido',  type: 'string'   },
      { key: 'customer',       label: 'Cliente',    type: 'string'   },
      { key: 'order_date',     label: 'Data',       type: 'date'     },
      { key: 'status',         label: 'Status',     type: 'string'   },
      { key: 'payment_status', label: 'Pagamento',  type: 'string'   },
      { key: 'total',          label: 'Total',      type: 'currency' },
    ],
    filters: [
      { key: 'dateFrom', label: 'Data inicial', type: 'date' },
      { key: 'dateTo',   label: 'Data final',   type: 'date' },
      { key: 'status',   label: 'Status',       type: 'select', options: [
        { value: 'draft',     label: 'Rascunho'   },
        { value: 'confirmed', label: 'Confirmado' },
        { value: 'invoiced',  label: 'Faturado'   },
        { value: 'delivered', label: 'Entregue'   },
        { value: 'cancelled', label: 'Cancelado'  },
      ]},
    ],
    queryDefinition: {
      sql: `
        SELECT
          o.order_number,
          COALESCE(c.name, 'Sem cliente') AS customer,
          o.order_date::date              AS order_date,
          o.status::text                  AS status,
          o.payment_status::text          AS payment_status,
          o.total
        FROM sales_orders o
        LEFT JOIN sales_customers c ON c.id = o.customer_id
        WHERE o.tenant_id = :tenantId
          AND o.deleted_at IS NULL
          AND (:dateFrom IS NULL OR o.order_date::date >= :dateFrom::date)
          AND (:dateTo   IS NULL OR o.order_date::date <= :dateTo::date)
          AND (:status   IS NULL OR o.status::text = :status)
        ORDER BY o.order_date DESC
      `,
      params: ['dateFrom', 'dateTo', 'status'],
    },
  },

  {
    name: 'Faturamento por Cliente',
    module: ReportModule.SALES,
    description: 'Ranking de clientes por valor faturado',
    isSystem: true,
    columns: [
      { key: 'customer',     label: 'Cliente',        type: 'string'   },
      { key: 'total_orders', label: 'Qtd. Pedidos',   type: 'number'   },
      { key: 'total_value',  label: 'Total Faturado', type: 'currency' },
      { key: 'paid_value',   label: 'Total Recebido', type: 'currency' },
    ],
    filters: [
      { key: 'dateFrom', label: 'Data inicial', type: 'date' },
      { key: 'dateTo',   label: 'Data final',   type: 'date' },
    ],
    queryDefinition: {
      sql: `
        SELECT
          COALESCE(c.name, 'Sem cliente') AS customer,
          COUNT(o.id)                     AS total_orders,
          SUM(o.total)                    AS total_value,
          SUM(o.paid_amount)              AS paid_value
        FROM sales_orders o
        LEFT JOIN sales_customers c ON c.id = o.customer_id
        WHERE o.tenant_id = :tenantId
          AND o.deleted_at IS NULL
          AND o.status::text NOT IN ('draft','cancelled')
          AND (:dateFrom IS NULL OR o.order_date::date >= :dateFrom::date)
          AND (:dateTo   IS NULL OR o.order_date::date <= :dateTo::date)
        GROUP BY c.name
        ORDER BY total_value DESC
      `,
      params: ['dateFrom', 'dateTo'],
    },
  },

  // ─── FINANCEIRO ───────────────────────────────────────────────────────────
  {
    name: 'Fluxo de Caixa',
    module: ReportModule.FINANCE,
    description: 'Receitas e despesas no período',
    isSystem: true,
    columns: [
      { key: 'due_date',    label: 'Data',       type: 'date'     },
      { key: 'description', label: 'Descrição',  type: 'string'   },
      { key: 'type',        label: 'Tipo',       type: 'string'   },
      { key: 'category',    label: 'Categoria',  type: 'string'   },
      { key: 'amount',      label: 'Valor',      type: 'currency' },
      { key: 'status',      label: 'Status',     type: 'string'   },
    ],
    filters: [
      { key: 'dateFrom', label: 'Data inicial', type: 'date', required: true },
      { key: 'dateTo',   label: 'Data final',   type: 'date', required: true },
      { key: 'type',     label: 'Tipo',         type: 'select', options: [
        { value: 'income',  label: 'Receita' },
        { value: 'expense', label: 'Despesa' },
      ]},
    ],
    queryDefinition: {
      sql: `
        SELECT
          t.due_date,
          t.description,
          t.type::text                        AS type,
          COALESCE(cat.name, 'Sem categoria') AS category,
          COALESCE(t.paid_amount, t.amount)   AS amount,
          t.status::text                      AS status
        FROM finance_transactions t
        LEFT JOIN finance_categories cat ON cat.id = t.category_id
        WHERE t.tenant_id = :tenantId
          AND t.deleted_at IS NULL
          AND (:dateFrom IS NULL OR t.due_date >= :dateFrom::date)
          AND (:dateTo   IS NULL OR t.due_date <= :dateTo::date)
          AND (:type     IS NULL OR t.type::text = :type)
        ORDER BY t.due_date DESC
      `,
      params: ['dateFrom', 'dateTo', 'type'],
    },
  },

  {
    name: 'Contas a Receber',
    module: ReportModule.FINANCE,
    description: 'Transações de receita pendentes ou vencidas',
    isSystem: true,
    columns: [
      { key: 'description', label: 'Descrição',  type: 'string'   },
      { key: 'counterpart', label: 'Cliente',    type: 'string'   },
      { key: 'due_date',    label: 'Vencimento', type: 'date'     },
      { key: 'amount',      label: 'Valor',      type: 'currency' },
      { key: 'status',      label: 'Status',     type: 'string'   },
    ],
    filters: [
      { key: 'status', label: 'Status', type: 'select', options: [
        { value: 'pending', label: 'Pendente' },
        { value: 'overdue', label: 'Vencido'  },
        { value: 'paid',    label: 'Pago'     },
      ]},
    ],
    queryDefinition: {
      sql: `
        SELECT
          t.description,
          COALESCE(t.counterpart_name, '—') AS counterpart,
          t.due_date,
          t.amount,
          t.status::text AS status
        FROM finance_transactions t
        WHERE t.tenant_id = :tenantId
          AND t.deleted_at IS NULL
          AND t.type::text = 'income'
          AND (:status IS NULL OR t.status::text = :status)
        ORDER BY t.due_date ASC
      `,
      params: ['status'],
    },
  },

  // ─── ESTOQUE ──────────────────────────────────────────────────────────────
  {
    name: 'Posição de Estoque',
    module: ReportModule.INVENTORY,
    description: 'Saldo atual de todos os produtos',
    isSystem: true,
    columns: [
      { key: 'name',           label: 'Produto',        type: 'string'   },
      { key: 'sku',            label: 'SKU',            type: 'string'   },
      { key: 'category',       label: 'Categoria',      type: 'string'   },
      { key: 'stock_quantity', label: 'Qtd. Estoque',   type: 'number'   },
      { key: 'min_stock',      label: 'Estoque Mínimo', type: 'number'   },
      { key: 'cost_price',     label: 'Custo Unit.',    type: 'currency' },
      { key: 'stock_value',    label: 'Valor Total',    type: 'currency' },
      { key: 'status',         label: 'Status',         type: 'string'   },
    ],
    filters: [
      { key: 'status',   label: 'Status',    type: 'select', options: [
        { value: 'active',   label: 'Ativo'   },
        { value: 'inactive', label: 'Inativo' },
      ]},
      { key: 'category', label: 'Categoria', type: 'text' },
    ],
    queryDefinition: {
      sql: `
        SELECT
          p.name,
          COALESCE(p.sku, '—')      AS sku,
          COALESCE(p.category, '—') AS category,
          p.stock_quantity,
          p.min_stock,
          p.cost_price,
          (p.stock_quantity * p.cost_price) AS stock_value,
          p.status::text AS status
        FROM inventory_products p
        WHERE p.tenant_id = :tenantId
          AND p.deleted_at IS NULL
          AND (:status   IS NULL OR p.status::text = :status)
          AND (:category IS NULL OR p.category ILIKE '%' || :category || '%')
        ORDER BY p.name ASC
      `,
      params: ['status', 'category'],
    },
  },

  {
    name: 'Movimentações de Estoque',
    module: ReportModule.INVENTORY,
    description: 'Histórico de entradas e saídas',
    isSystem: true,
    columns: [
      { key: 'movement_date', label: 'Data',       type: 'date'   },
      { key: 'product',       label: 'Produto',    type: 'string' },
      { key: 'type',          label: 'Tipo',       type: 'string' },
      { key: 'reason',        label: 'Motivo',     type: 'string' },
      { key: 'quantity',      label: 'Quantidade', type: 'number' },
      { key: 'stock_after',   label: 'Saldo Após', type: 'number' },
    ],
    filters: [
      { key: 'dateFrom', label: 'Data inicial', type: 'date', required: true },
      { key: 'dateTo',   label: 'Data final',   type: 'date', required: true },
      { key: 'type',     label: 'Tipo',         type: 'select', options: [
        { value: 'in',     label: 'Entrada'   },
        { value: 'out',    label: 'Saída'     },
        { value: 'adjust', label: 'Ajuste'    },
        { value: 'return', label: 'Devolução' },
      ]},
    ],
    queryDefinition: {
      sql: `
        SELECT
          m.movement_date::date AS movement_date,
          p.name                AS product,
          m.type::text          AS type,
          m.reason::text        AS reason,
          m.quantity,
          m.stock_after
        FROM inventory_movements m
        JOIN inventory_products p ON p.id = m.product_id
        WHERE m.tenant_id = :tenantId
          AND (:dateFrom IS NULL OR m.movement_date::date >= :dateFrom::date)
          AND (:dateTo   IS NULL OR m.movement_date::date <= :dateTo::date)
          AND (:type     IS NULL OR m.type::text = :type)
        ORDER BY m.movement_date DESC
      `,
      params: ['dateFrom', 'dateTo', 'type'],
    },
  },

  // ─── RH ───────────────────────────────────────────────────────────────────
  {
    name: 'Colaboradores',
    module: ReportModule.HR,
    description: 'Lista de colaboradores com dados de admissão e salário',
    isSystem: true,
    columns: [
      { key: 'full_name',       label: 'Nome',         type: 'string'   },
      { key: 'position',        label: 'Cargo',        type: 'string'   },
      { key: 'department',      label: 'Departamento', type: 'string'   },
      { key: 'employment_type', label: 'Vínculo',      type: 'string'   },
      { key: 'hire_date',       label: 'Admissão',     type: 'date'     },
      { key: 'salary',          label: 'Salário',      type: 'currency' },
      { key: 'status',          label: 'Status',       type: 'string'   },
    ],
    filters: [
      { key: 'status',     label: 'Status',       type: 'select', options: [
        { value: 'active',     label: 'Ativo'     },
        { value: 'inactive',   label: 'Inativo'   },
        { value: 'terminated', label: 'Desligado' },
        { value: 'on_leave',   label: 'Afastado'  },
      ]},
      { key: 'department', label: 'Departamento', type: 'text' },
    ],
    queryDefinition: {
      sql: `
        SELECT
          e.full_name,
          e.position,
          COALESCE(e.department, '—')    AS department,
          e.employment_type::text        AS employment_type,
          e.hire_date,
          e.salary,
          e.status::text                 AS status
        FROM hr_employees e
        WHERE e.tenant_id = :tenantId
          AND e.deleted_at IS NULL
          AND (:status     IS NULL OR e.status::text = :status)
          AND (:department IS NULL OR e.department ILIKE '%' || :department || '%')
        ORDER BY e.full_name ASC
      `,
      params: ['status', 'department'],
    },
  },

  {
    name: 'Folha de Pagamento',
    module: ReportModule.HR,
    description: 'Resumo da folha por competência',
    isSystem: true,
    columns: [
      { key: 'full_name',       label: 'Colaborador',  type: 'string'   },
      { key: 'reference_month', label: 'Competência',  type: 'string'   },
      { key: 'base_salary',     label: 'Salário Base', type: 'currency' },
      { key: 'bonuses',         label: 'Bônus',        type: 'currency' },
      { key: 'inss_deduction',  label: 'INSS',         type: 'currency' },
      { key: 'irrf_deduction',  label: 'IRRF',         type: 'currency' },
      { key: 'net_salary',      label: 'Líquido',      type: 'currency' },
      { key: 'status',          label: 'Status',       type: 'string'   },
    ],
    filters: [
      { key: 'referenceMonth', label: 'Competência (YYYY-MM)', type: 'text' },
    ],
    queryDefinition: {
      sql: `
        SELECT
          e.full_name,
          p.reference_month,
          p.base_salary,
          p.bonuses,
          p.inss_deduction,
          p.irrf_deduction,
          p.net_salary,
          p.status::text AS status
        FROM hr_payrolls p
        JOIN hr_employees e ON e.id = p.employee_id
        WHERE p.tenant_id = :tenantId
          AND (:referenceMonth IS NULL OR p.reference_month = :referenceMonth)
        ORDER BY e.full_name ASC
      `,
      params: ['referenceMonth'],
    },
  },
];
