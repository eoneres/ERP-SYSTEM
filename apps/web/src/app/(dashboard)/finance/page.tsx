'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle,
  Clock, Plus, Download,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import { useUIStore } from '@/store/ui.store';
import { useFinanceSummary, useCashFlow, useByCategory, useTransactions } from '@/hooks/use-finance';
import { StatCard, Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { TransactionModal } from '@/components/modules/finance/transaction-modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Transaction } from '@/lib/api/finance.api';

const statusConfig: Record<string, { label: string; variant: any }> = {
  paid: { label: 'Pago', variant: 'success' },
  pending: { label: 'Pendente', variant: 'warning' },
  overdue: { label: 'Vencido', variant: 'danger' },
  cancelled: { label: 'Cancelado', variant: 'default' },
  scheduled: { label: 'Agendado', variant: 'primary' },
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-surface-lg text-xs space-y-1">
      <p className="font-semibold text-[var(--text)]">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[var(--text-muted)]">{p.name}:</span>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function FinanceDashboardPage() {
  const { setPageTitle, setBreadcrumbs } = useUIStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('expense');

  const dateFrom = dayjs().startOf('month').format('YYYY-MM-DD');
  const dateTo = dayjs().endOf('month').format('YYYY-MM-DD');
  const cashflowFrom = dayjs().subtract(5, 'month').startOf('month').format('YYYY-MM-DD');

  const { data: summary, isLoading: summaryLoading } = useFinanceSummary(dateFrom, dateTo);
  const { data: cashflow = [], isLoading: cashflowLoading } = useCashFlow(cashflowFrom, dateTo);
  const { data: byCategory = [] } = useByCategory(dateFrom, dateTo);
  const recentFilter = useMemo(() => ({ limit: 8, sortBy: 'createdAt', sortOrder: 'DESC' as const }), []);
  const { data: recentData } = useTransactions(recentFilter);
  const recentTransactions = (recentData as any)?.data ?? [];

  useEffect(() => {
    setPageTitle('Financeiro');
    setBreadcrumbs([{ label: 'Financeiro' }]);
  }, [setPageTitle, setBreadcrumbs]);

  const openModal = (type: 'income' | 'expense') => {
    setModalType(type);
    setModalOpen(true);
  };

  const txColumns: Column<Transaction>[] = [
    {
      key: 'description', header: 'Descrição',
      cell: (row) => (
        <div>
          <p className="font-medium text-[var(--text)] truncate max-w-[200px]">{row.description}</p>
          {row.counterpartName && (
            <p className="text-xs text-[var(--text-muted)]">{row.counterpartName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category', header: 'Categoria',
      cell: (row) => row.category ? (
        <span className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.category.color }} />
          {row.category.name}
        </span>
      ) : <span className="text-[var(--text-subtle)]">—</span>,
    },
    {
      key: 'dueDate', header: 'Vencimento', sortable: true,
      cell: (row) => (
        <span className="text-xs text-[var(--text-muted)]">{formatDate(row.dueDate)}</span>
      ),
    },
    {
      key: 'status', header: 'Status',
      cell: (row) => (
        <Badge variant={statusConfig[row.status]?.variant} dot size="sm">
          {statusConfig[row.status]?.label}
        </Badge>
      ),
    },
    {
      key: 'amount', header: 'Valor', align: 'right', sortable: true,
      cell: (row) => (
        <span className={`font-semibold tabular-nums text-sm ${
          row.type === 'income' ? 'text-success' : 'text-danger'
        }`}>
          {row.type === 'income' ? '+' : '-'}{formatCurrency(row.amount)}
        </span>
      ),
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)]">Financeiro</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {dayjs().format('MMMM [de] YYYY')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />}>
            Exportar
          </Button>
          <Button
            variant="outline" size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => openModal('income')}
          >
            Receita
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => openModal('expense')}
          >
            Despesa
          </Button>
        </div>
      </motion.div>

      {/* KPI cards */}
      <motion.div variants={item} className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          loading={summaryLoading}
          title="Receitas (mês)"
          value={formatCurrency(summary?.totalIncome ?? 0)}
          icon={<TrendingUp />}
          iconColor="text-success"
        />
        <StatCard
          loading={summaryLoading}
          title="Despesas (mês)"
          value={formatCurrency(summary?.totalExpense ?? 0)}
          icon={<TrendingDown />}
          iconColor="text-danger"
        />
        <StatCard
          loading={summaryLoading}
          title="Saldo Líquido"
          value={formatCurrency(summary?.netBalance ?? 0)}
          icon={<Wallet />}
          iconColor={summary?.netBalance && summary.netBalance >= 0 ? 'text-success' : 'text-danger'}
        />
        <StatCard
          loading={summaryLoading}
          title="Vencidos"
          value={`${summary?.overdueCount ?? 0} (${formatCurrency(summary?.overdueAmount ?? 0)})`}
          icon={<AlertTriangle />}
          iconColor="text-warning"
        />
      </motion.div>

      {/* Pending info */}
      {!summaryLoading && ((summary?.pendingIncome ?? 0) > 0 || (summary?.pendingExpense ?? 0) > 0) && (
        <motion.div variants={item} className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-success/30 bg-success/5">
            <Clock className="h-4 w-4 text-success shrink-0" />
            <div>
              <p className="text-xs text-[var(--text-muted)]">A receber (pendente)</p>
              <p className="text-sm font-semibold text-success">
                {formatCurrency(summary?.pendingIncome ?? 0)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-warning/30 bg-warning/5">
            <Clock className="h-4 w-4 text-warning shrink-0" />
            <div>
              <p className="text-xs text-[var(--text-muted)]">A pagar (pendente)</p>
              <p className="text-sm font-semibold text-warning">
                {formatCurrency(summary?.pendingExpense ?? 0)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Cashflow chart */}
        <motion.div variants={item} className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Fluxo de Caixa</CardTitle>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Últimos 6 meses</p>
              </div>
              <div className="flex gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success" />Receitas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-danger" />Despesas
                </span>
              </div>
            </CardHeader>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflow} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => dayjs(v).format('MMM')} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="income" name="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expense" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* By category */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <div>
                <CardTitle>Por Categoria</CardTitle>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Este mês (pagas)</p>
              </div>
            </CardHeader>
            {byCategory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-sm text-[var(--text-muted)]">Sem dados no período</p>
              </div>
            ) : (
              <div className="space-y-2">
                {byCategory.slice(0, 6).map((cat: any) => {
                  const total = byCategory.reduce((s: number, c: any) => s + Number(c.total), 0);
                  const pct = total > 0 ? (Number(cat.total) / total) * 100 : 0;
                  return (
                    <div key={cat.id ?? cat.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color ?? '#6D28D9' }} />
                          <span className="text-[var(--text-muted)] truncate max-w-[110px]">{cat.name ?? 'Sem categoria'}</span>
                        </div>
                        <span className="font-semibold text-[var(--text)] tabular-nums">{formatCurrency(cat.total)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: cat.color ?? '#6D28D9' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Recent transactions table */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">Transações Recentes</h3>
          <Button variant="ghost" size="sm" href="/finance/payable">
            Ver todas →
          </Button>
        </div>
        <DataTable
          columns={txColumns}
          data={recentTransactions}
          rowKey="id"
        />
      </motion.div>

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultType={modalType}
      />
    </motion.div>
  );
}
