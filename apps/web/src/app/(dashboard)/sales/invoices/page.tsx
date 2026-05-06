'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, ShoppingCart, CreditCard, CheckCircle2, Clock } from 'lucide-react';
import { useOrders, useSalesSummary, useMarkPaid } from '@/hooks/use-sales';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Order } from '@/lib/api/sales.api';

const paymentMethodLabel: Record<string, string> = {
  cash:        'Dinheiro',
  credit_card: 'Cartão de Crédito',
  debit_card:  'Cartão de Débito',
  pix:         'PIX',
  boleto:      'Boleto',
  transfer:    'Transferência',
  other:       'Outro',
};

const paymentStatusConfig: Record<string, { label: string; variant: any }> = {
  pending:  { label: 'Pendente',  variant: 'warning' },
  paid:     { label: 'Pago',      variant: 'success' },
  partial:  { label: 'Parcial',   variant: 'primary' },
  refunded: { label: 'Estornado', variant: 'danger'  },
};

export default function InvoicesPage() {
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState(20);

  // Faturamento = todos os pedidos com status 'invoiced' ou 'delivered'
  // independente do paymentStatus — mostra tanto pagos quanto a receber
  const filter = useMemo(
    () => ({ page, limit, status: 'invoiced' as any, sortBy: 'orderDate', sortOrder: 'DESC' as const }),
    [page, limit],
  );

  const { data, isLoading }                      = useOrders(filter);
  const { data: summary, isLoading: summaryLoading } = useSalesSummary();
  const markPaid = useMarkPaid();

  const orders     = (data as any)?.data ?? [];
  const pagination = (data as any)?.meta;

  // KPIs calculados a partir dos pedidos carregados + summary global
  const localPaid    = orders.filter((o: Order) => o.paymentStatus === 'paid' || o.paymentStatus === 'partial');
  const localPending = orders.filter((o: Order) => o.paymentStatus === 'pending');

  const cards = [
    {
      label: 'Receita Recebida',
      value: formatCurrency(summary?.totalRevenue ?? 0),
      icon:  DollarSign,
      color: 'text-emerald-500',
      bg:    'bg-emerald-500/10',
    },
    {
      label: 'A Receber',
      value: formatCurrency(summary?.pendingRevenue ?? 0),
      icon:  TrendingUp,
      color: 'text-orange-500',
      bg:    'bg-orange-500/10',
      alert: (summary?.pendingRevenue ?? 0) > 0,
    },
    {
      label: 'Faturas Emitidas',
      value: pagination?.total ?? 0,
      icon:  ShoppingCart,
      color: 'text-blue-500',
      bg:    'bg-blue-500/10',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(
        (summary?.totalRevenue ?? 0) > 0 && (pagination?.total ?? 0) > 0
          ? (summary?.totalRevenue ?? 0) / (pagination?.total ?? 1)
          : 0,
      ),
      icon:  CreditCard,
      color: 'text-purple-500',
      bg:    'bg-purple-500/10',
    },
  ];

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Pedido',
      width: '130px',
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-[var(--text)]">{row.orderNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      cell: (row) => (
        <p className="text-sm font-medium text-[var(--text)] truncate">
          {row.customer?.name ?? <span className="text-[var(--text-subtle)]">—</span>}
        </p>
      ),
    },
    {
      key: 'orderDate',
      header: 'Data',
      width: '110px',
      cell: (row) => (
        <span className="text-xs text-[var(--text-muted)]">{formatDate(row.orderDate)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Pagamento',
      width: '160px',
      cell: (row) => (
        <span className="text-sm text-[var(--text-muted)]">
          {row.paymentMethod ? paymentMethodLabel[row.paymentMethod] : '—'}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Status',
      width: '120px',
      cell: (row) => (
        <Badge variant={paymentStatusConfig[row.paymentStatus]?.variant} dot size="sm">
          {paymentStatusConfig[row.paymentStatus]?.label}
        </Badge>
      ),
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      align: 'right',
      width: '110px',
      cell: (row) => (
        <span className="text-sm tabular-nums text-[var(--text-muted)]">{formatCurrency(row.subtotal)}</span>
      ),
    },
    {
      key: 'discount',
      header: 'Desconto',
      align: 'right',
      width: '100px',
      cell: (row) => (
        <span className="text-sm tabular-nums text-danger">
          {Number(row.discount) > 0 ? `- ${formatCurrency(row.discount)}` : '—'}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      width: '120px',
      cell: (row) => (
        <span className={`font-semibold tabular-nums text-sm ${
          row.paymentStatus === 'paid' ? 'text-success' : 'text-[var(--text)]'
        }`}>
          {formatCurrency(row.total)}
        </span>
      ),
    },
    {
      key: 'actions' as any,
      header: '',
      align: 'right',
      width: '90px',
      cell: (row) => {
        if (row.paymentStatus === 'paid') {
          return (
            <span className="flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Pago
            </span>
          );
        }
        return (
          <button
            disabled={markPaid.isPending}
            onClick={(e) => { e.stopPropagation(); markPaid.mutate({ id: row.id }); }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-emerald-500/15 hover:text-emerald-600 transition-colors disabled:opacity-50"
          >
            <Clock className="h-3.5 w-3.5" />
            Receber
          </button>
        );
      },
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--text)]">Faturamento</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Pedidos faturados — {localPaid.length} pagos · {localPending.length} a receber
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className={(card as any).alert ? 'border-orange-500/40 bg-orange-500/5' : ''}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">{card.label}</p>
                    {summaryLoading ? (
                      <Skeleton className="h-7 w-24" />
                    ) : (
                      <p className="text-2xl font-bold text-[var(--text)]">
                        {typeof card.value === 'number' ? card.value.toLocaleString('pt-BR') : card.value}
                      </p>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <DataTable
        columns={columns}
        data={orders}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        rowKey="id"
        emptyState={
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <p className="text-sm font-medium text-[var(--text)]">Nenhuma fatura emitida ainda</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Pedidos aparecem aqui após serem faturados na tela de Pedidos
            </p>
          </div>
        }
      />
    </motion.div>
  );
}
