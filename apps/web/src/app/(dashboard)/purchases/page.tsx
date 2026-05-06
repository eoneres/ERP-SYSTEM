'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ShoppingBag, Users, DollarSign, Clock,
  Plus, CheckCircle2, XCircle, Truck, CreditCard,
} from 'lucide-react';
import { usePurchasesSummary, usePurchaseOrders } from '@/hooks/use-purchases';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PurchaseOrderModal } from '@/components/modules/purchases/purchase-order-modal';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
  draft:      { label: 'Rascunho',   variant: 'default', icon: Clock        },
  confirmed:  { label: 'Confirmado', variant: 'primary', icon: CheckCircle2 },
  received:   { label: 'Recebido',   variant: 'success', icon: Truck        },
  paid:       { label: 'Pago',       variant: 'success', icon: CreditCard   },
  cancelled:  { label: 'Cancelado',  variant: 'danger',  icon: XCircle      },
};

export default function PurchasesPage() {
  const [modalOpen, setModalOpen] = useState(false);

  const { data: summary, isLoading: summaryLoading } = usePurchasesSummary();
  const { data: ordersData, isLoading: ordersLoading } = usePurchaseOrders({
    limit: 10, sortBy: 'orderDate', sortOrder: 'DESC',
  });

  const recentOrders = ordersData?.data ?? [];

  const cards = [
    {
      label: 'Total de Ordens',
      value: summary?.totalOrders ?? 0,
      sub:   'todas as ordens',
      icon:  ShoppingBag,
      color: 'text-blue-500',
      bg:    'bg-blue-500/10',
    },
    {
      label: 'Aguardando Recebimento',
      value: summary?.pendingOrders ?? 0,
      sub:   'ordens confirmadas',
      icon:  Clock,
      color: 'text-orange-500',
      bg:    'bg-orange-500/10',
      alert: (summary?.pendingOrders ?? 0) > 0,
    },
    {
      label: 'Total em Compras',
      value: formatCurrency(summary?.totalSpend ?? 0),
      sub:   'excluindo rascunhos e cancelados',
      icon:  DollarSign,
      color: 'text-emerald-500',
      bg:    'bg-emerald-500/10',
      isText: true,
    },
    {
      label: 'Fornecedores Ativos',
      value: summary?.totalSuppliers ?? 0,
      sub:   'fornecedores cadastrados',
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
          <h1 className="text-2xl font-bold text-[var(--text)]">Compras</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Gerencie fornecedores e ordens de compra
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Ordem
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className={`p-5 ${card.alert ? 'ring-1 ring-orange-500/40' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[var(--text-muted)]">{card.label}</p>
                    {summaryLoading
                      ? <Skeleton className="h-8 w-20" />
                      : <p className="text-2xl font-bold text-[var(--text)]">
                          {card.isText ? card.value : card.value}
                        </p>
                    }
                    <p className="text-xs text-[var(--text-subtle)]">{card.sub}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Fluxo do processo */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Fluxo da Ordem de Compra</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'Rascunho', color: 'bg-[var(--surface-3)]', text: 'text-[var(--text-muted)]' },
            { label: '→', color: '', text: 'text-[var(--text-subtle)]' },
            { label: 'Confirmado', color: 'bg-blue-500/10', text: 'text-blue-500' },
            { label: '→ Cria Conta a Pagar', color: '', text: 'text-[var(--text-subtle)] text-xs' },
            { label: '→', color: '', text: 'text-[var(--text-subtle)]' },
            { label: 'Recebido', color: 'bg-emerald-500/10', text: 'text-emerald-500' },
            { label: '→ Entrada no Estoque', color: '', text: 'text-[var(--text-subtle)] text-xs' },
            { label: '→', color: '', text: 'text-[var(--text-subtle)]' },
            { label: 'Pago', color: 'bg-purple-500/10', text: 'text-purple-500' },
          ].map((step, i) => (
            <span key={i} className={`px-2 py-1 rounded text-xs font-medium ${step.color} ${step.text}`}>
              {step.label}
            </span>
          ))}
        </div>
      </Card>

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/purchases/orders">
          <Card className="p-4 hover:border-primary-500/40 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <ShoppingBag className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)] group-hover:text-primary-500 transition-colors">
                  Ordens de Compra
                </p>
                <p className="text-xs text-[var(--text-muted)]">Gerenciar todas as ordens</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/purchases/suppliers">
          <Card className="p-4 hover:border-primary-500/40 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)] group-hover:text-primary-500 transition-colors">
                  Fornecedores
                </p>
                <p className="text-xs text-[var(--text-muted)]">Cadastro de fornecedores</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Ordens Recentes */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text)]">Ordens Recentes</h3>
          <Link href="/purchases/orders">
            <Button variant="ghost" size="sm">Ver todas</Button>
          </Link>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {ordersLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))
            : recentOrders.length === 0
              ? (
                  <div className="p-8 text-center text-sm text-[var(--text-muted)]">
                    Nenhuma ordem de compra encontrada
                  </div>
                )
              : recentOrders.map((order) => {
                  const cfg = statusConfig[order.status] ?? statusConfig.draft;
                  const Icon = cfg.icon;
                  return (
                    <div key={order.id} className="p-4 flex items-center justify-between hover:bg-[var(--surface-2)] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-[var(--surface-2)]">
                          <Icon className="h-4 w-4 text-[var(--text-muted)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text)]">{order.orderNumber}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {order.supplier?.name ?? 'Sem fornecedor'} · {formatDate(order.orderDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[var(--text)]">
                          {formatCurrency(order.total)}
                        </span>
                        <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                      </div>
                    </div>
                  );
                })
          }
        </div>
      </Card>

      <PurchaseOrderModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
