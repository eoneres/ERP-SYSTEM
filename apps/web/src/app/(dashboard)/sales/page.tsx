'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ShoppingCart, Users, DollarSign, TrendingUp,
  Clock, Plus, CheckCircle2, XCircle,
} from 'lucide-react';
import { useSalesSummary, useRecentOrders } from '@/hooks/use-sales';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderModal } from '@/components/modules/sales/order-modal';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusConfig: Record<string, { label: string; variant: any }> = {
  draft:      { label: 'Rascunho',    variant: 'default'  },
  confirmed:  { label: 'Confirmado',  variant: 'primary'  },
  invoiced:   { label: 'Faturado',    variant: 'warning'  },
  processing: { label: 'Processando', variant: 'warning'  },
  shipped:    { label: 'Enviado',     variant: 'primary'  },
  delivered:  { label: 'Entregue',    variant: 'success'  },
  cancelled:  { label: 'Cancelado',   variant: 'danger'   },
  returned:   { label: 'Devolvido',   variant: 'danger'   },
};

const paymentStatusConfig: Record<string, { label: string; variant: any }> = {
  pending:  { label: 'Pendente',  variant: 'warning' },
  paid:     { label: 'Pago',      variant: 'success' },
  partial:  { label: 'Parcial',   variant: 'primary' },
  refunded: { label: 'Estornado', variant: 'danger'  },
};

export default function SalesPage() {
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useSalesSummary();
  const { data: recentOrders = [], isLoading: ordersLoading } = useRecentOrders();

  const cards = [
    {
      label: 'Pedidos no Mês',
      value: summary?.ordersThisMonth ?? 0,
      sub:   `${summary?.totalOrders ?? 0} total`,
      icon:  ShoppingCart,
      color: 'text-blue-500',
      bg:    'bg-blue-500/10',
    },
    {
      label: 'Pedidos Pendentes',
      value: summary?.pendingOrders ?? 0,
      sub:   'aguardando confirmação',
      icon:  Clock,
      color: 'text-orange-500',
      bg:    'bg-orange-500/10',
      alert: (summary?.pendingOrders ?? 0) > 0,
    },
    {
      label: 'Receita Realizada',
      value: formatCurrency(summary?.totalRevenue ?? 0),
      sub:   'pagamentos recebidos',
      icon:  DollarSign,
      color: 'text-emerald-500',
      bg:    'bg-emerald-500/10',
      isText: true,
    },
    {
      label: 'Clientes Ativos',
      value: summary?.totalCustomers ?? 0,
      sub:   `${formatCurrency(summary?.pendingRevenue ?? 0)} a receber`,
      icon:  Users,
      color: 'text-purple-500',
      bg:    'bg-purple-500/10',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Vendas</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Gerencie pedidos, clientes e faturamento
          </p>
        </div>
        <Button size="sm" onClick={() => setOrderModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Pedido
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className={card.alert ? 'border-orange-500/40 bg-orange-500/5' : ''}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">{card.label}</p>
                    {summaryLoading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <p className="text-2xl font-bold text-[var(--text)]">
                        {card.isText ? card.value : (card.value as number).toLocaleString('pt-BR')}
                      </p>
                    )}
                    <p className="text-xs text-[var(--text-subtle)] mt-1">{card.sub}</p>
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

      {/* Recent Orders */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">Pedidos Recentes</h2>
          <Link href="/sales/orders" className="text-xs text-primary-500 hover:underline">
            Ver todos
          </Link>
        </div>

        {ordersLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (recentOrders as any[]).length === 0 ? (
          <div className="text-center py-10">
            <ShoppingCart className="h-8 w-8 text-[var(--text-subtle)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-muted)]">Nenhum pedido ainda</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setOrderModalOpen(true)}>
              Criar primeiro pedido
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {(recentOrders as any[]).map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text)]">{order.orderNumber}</p>
                    <Badge variant={statusConfig[order.status]?.variant} size="sm">
                      {statusConfig[order.status]?.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {order.customer?.name ?? 'Cliente não informado'} · {formatDate(order.orderDate)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-[var(--text)]">{formatCurrency(order.total)}</p>
                  <Badge variant={paymentStatusConfig[order.paymentStatus]?.variant} size="sm">
                    {paymentStatusConfig[order.paymentStatus]?.label}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { href: '/sales/orders',    label: 'Pedidos',     icon: ShoppingCart, desc: 'Gerencie todos os pedidos' },
          { href: '/sales/customers', label: 'Clientes',    icon: Users,        desc: 'Cadastro de clientes' },
          { href: '/sales/invoices',  label: 'Faturamento', icon: TrendingUp,   desc: 'Notas e faturamento' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="hover:border-primary-500/40 hover:bg-primary-500/5 cursor-pointer transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--surface-2)] group-hover:bg-primary-500/10 transition-colors">
                    <Icon className="h-5 w-5 text-[var(--text-muted)] group-hover:text-primary-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{item.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <OrderModal open={orderModalOpen} onClose={() => setOrderModalOpen(false)} />
    </div>
  );
}
